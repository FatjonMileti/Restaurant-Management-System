import { z } from 'zod';
import { getDB } from '../../config/rxdb.js';
import { getOrCreateRestaurantSettings } from '../../graphql/helpers/formatters.js';
import { checkReservationAvailability } from '../../services/availabilityService.js';
import {
  assertTableAvailable,
  buildServerPricedItems,
  computeOrderTotal,
} from '../../services/orderService.js';
import { createDraft } from '../conversation/draftService.js';
import type { RegisteredTool } from '../toolRegistry.js';
import type {
  AvailabilityArtifact,
  OrderDraftArtifact,
  OrderDraftToolData,
  ReservationDraftArtifact,
  ReservationDraftToolData,
} from '../types.js';

const orderItemSchema = z
  .object({
    menuItemId: z.string().trim().min(1).max(100),
    quantity: z.number().int().min(1).max(20),
  })
  .strict();

const orderDraftSchema = z
  .object({
    tableNumber: z.number().int().min(1).max(1000),
    items: z.array(orderItemSchema).min(1).max(20),
    paymentMethod: z.enum(['cash', 'card']).optional().default('cash'),
  })
  .strict();

const reservationDraftSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'time must be HH:mm'),
    guests: z.number().int().min(1).max(100),
    tableNumber: z.number().int().min(1).max(1000).optional(),
    specialRequests: z.string().trim().max(500).optional(),
    contactPhone: z.string().trim().min(5).max(30).optional(),
  })
  .strict();

const phonePattern = /^[0-9+()\-.\s]{5,30}$/;

export const createOrderDraftTool = (options: {
  draftTtlMs: number;
}): RegisteredTool<z.infer<typeof orderDraftSchema>> => ({
  name: 'prepare_order_draft',
  description:
    'Build a server-priced order draft from menu item ids and quantities. This does NOT submit the order. The customer must review and explicitly confirm it in the interface. Never invent ids, prices, or totals.',
  access: 'authenticated',
  schema: orderDraftSchema,
  parameters: {
    type: 'object',
    additionalProperties: false,
    properties: {
      tableNumber: { type: 'integer', minimum: 1, description: 'Table number for the order.' },
      items: {
        type: 'array',
        minItems: 1,
        maxItems: 20,
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            menuItemId: { type: 'string', description: 'Id returned by search_menu.' },
            quantity: { type: 'integer', minimum: 1, maximum: 20 },
          },
          required: ['menuItemId', 'quantity'],
        },
      },
      paymentMethod: { type: 'string', enum: ['cash', 'card'] },
    },
    required: ['tableNumber', 'items'],
  },
  async handler(args, context) {
    if (!context.userId || !context.user) {
      return {
        ok: false,
        error: { code: 'UNAUTHENTICATED', message: 'The customer must be signed in.' },
      };
    }

    const settings = await getOrCreateRestaurantSettings();
    const tableCount = Math.max(1, Number(settings.tableCount) || 10);
    if (args.tableNumber > tableCount) {
      return {
        ok: false,
        error: {
          code: 'INVALID_TABLE',
          message: `Table ${args.tableNumber} does not exist. The restaurant has tables 1-${tableCount}.`,
        },
      };
    }

    const db = await getDB();
    const items = await buildServerPricedItems(db, args.items);
    await assertTableAvailable(db, args.tableNumber);
    const total = computeOrderTotal(items);
    const draft = await createDraft({
      kind: 'order',
      userId: context.userId,
      ttlMs: options.draftTtlMs,
      payload: {
        tableNumber: args.tableNumber,
        paymentMethod: args.paymentMethod,
        selections: args.items,
        // Server-captured snapshot for confirmation-time revalidation. This is
        // never supplied by the model, so a price change cannot be hidden.
        pricedItems: items.map((item) => ({
          menuItemId: item.menuItem,
          quantity: item.quantity,
          unitPrice: item.price,
        })),
        expectedTotal: total,
      },
    });

    const artifact: OrderDraftArtifact = {
      kind: 'order',
      draftId: draft.id,
      status: 'pending',
      expiresAt: draft.expiresAt,
      tableNumber: args.tableNumber,
      paymentMethod: args.paymentMethod,
      items: items.map((item) => ({
        menuItemId: item.menuItem,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.price,
        lineTotal: Number((item.price * item.quantity).toFixed(2)),
      })),
      total,
      requiresConfirmation: true,
    };
    const data: OrderDraftToolData = {
      draft: artifact,
      note: 'Draft only. Do not say the order is placed. Ask the customer to review and press Confirm in the interface.',
    };
    return { ok: true, data };
  },
});

export const createReservationDraftTool = (options: {
  timeZone: string;
  maxPartySize: number;
  draftTtlMs: number;
}): RegisteredTool<z.infer<typeof reservationDraftSchema>> => ({
  name: 'prepare_reservation_draft',
  description:
    'Check availability and build a reservation draft for the signed-in customer. This does NOT create the reservation. The customer must review and explicitly confirm it in the interface. Ask for a contact phone number if their account has none.',
  access: 'authenticated',
  schema: reservationDraftSchema,
  parameters: {
    type: 'object',
    additionalProperties: false,
    properties: {
      date: { type: 'string', description: 'Date in YYYY-MM-DD.' },
      time: { type: 'string', description: 'Local 24-hour time HH:mm.' },
      guests: { type: 'integer', minimum: 1, description: 'Party size.' },
      tableNumber: {
        type: 'integer',
        minimum: 1,
        description: 'Optional preferred table from an availability result.',
      },
      specialRequests: { type: 'string', description: 'Optional customer request (max 500 chars).' },
      contactPhone: {
        type: 'string',
        description: 'Contact phone, only needed when the signed-in account has none.',
      },
    },
    required: ['date', 'time', 'guests'],
  },
  async handler(args, context) {
    if (!context.userId || !context.user) {
      return {
        ok: false,
        error: { code: 'UNAUTHENTICATED', message: 'The customer must be signed in.' },
      };
    }

    const contactPhone = (context.user.phone || args.contactPhone || '').trim();
    if (!contactPhone) {
      return {
        ok: false,
        error: {
          code: 'MISSING_CONTACT_PHONE',
          message:
            'A contact phone number is required. Ask the customer for it, then call prepare_reservation_draft again with contactPhone.',
        },
      };
    }
    if (!phonePattern.test(contactPhone)) {
      return {
        ok: false,
        error: {
          code: 'INVALID_CONTACT_PHONE',
          message: 'That phone number does not look valid. Ask the customer to check it.',
        },
      };
    }

    const availability = await checkReservationAvailability(
      { date: args.date, time: args.time, guests: args.guests, tableNumber: args.tableNumber },
      { timeZone: options.timeZone, maxPartySize: options.maxPartySize },
    );
    if (!availability.available) {
      return {
        ok: false,
        error: {
          code: 'NO_AVAILABILITY',
          message:
            'No table is available for that request under the current booking convention. Offer to check another time or party size.',
        },
      };
    }

    const tableNumber =
      args.tableNumber && availability.freeTables.includes(args.tableNumber)
        ? args.tableNumber
        : availability.freeTables[0];
    if (!tableNumber) {
      return {
        ok: false,
        error: { code: 'NO_AVAILABILITY', message: 'No free table could be assigned.' },
      };
    }

    const draft = await createDraft({
      kind: 'reservation',
      userId: context.userId,
      ttlMs: options.draftTtlMs,
      payload: {
        date: args.date,
        time: args.time,
        guests: args.guests,
        tableNumber,
        specialRequests: args.specialRequests ?? '',
        contactName: context.user.name,
        contactPhone,
        contactEmail: context.user.email,
      },
    });

    const availabilityArtifact: AvailabilityArtifact = {
      available: availability.available,
      date: availability.date,
      time: availability.time,
      guests: availability.guests,
      timeZone: availability.timeZone,
      freeTables: availability.freeTables,
      tableCount: availability.tableCount,
      capacityVerified: availability.capacityVerified,
      openingHoursVerified: availability.openingHoursVerified,
      notes: availability.notes,
    };

    const artifact: ReservationDraftArtifact = {
      kind: 'reservation',
      draftId: draft.id,
      status: 'pending',
      expiresAt: draft.expiresAt,
      date: args.date,
      time: args.time,
      guests: args.guests,
      tableNumber,
      specialRequests: args.specialRequests ?? '',
      contactName: context.user.name,
      contactPhone,
      contactEmail: context.user.email,
      requiresConfirmation: true,
    };

    const data: ReservationDraftToolData = {
      draft: artifact,
      availability: availabilityArtifact,
      note: 'Draft only. Do not say the reservation is created. Ask the customer to review and press Confirm in the interface.',
    };
    return { ok: true, data };
  },
});
