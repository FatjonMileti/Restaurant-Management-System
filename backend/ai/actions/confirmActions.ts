import { getDB } from '../../config/rxdb.js';
import { getOrCreateRestaurantSettings } from '../../graphql/helpers/formatters.js';
import { recordActivity } from '../../graphql/helpers/activityLog.js';
import { checkReservationAvailability } from '../../services/availabilityService.js';
import {
  buildServerPricedItems,
  computeOrderTotal,
  createOrderForUser,
} from '../../services/orderService.js';
import { createReservationForUser } from '../../services/reservationService.js';
import { AiError, AiErrorCodes } from '../errors.js';
import type { AiUser } from '../types.js';
import {
  loadConfirmableDraft,
  markDraftStatus,
  withDraftLock,
  type DraftRecord,
} from '../conversation/draftService.js';

export interface ConfirmDraftResult {
  kind: 'order' | 'reservation';
  status: 'completed';
  alreadyCompleted: boolean;
  order?: any;
  reservation?: any;
}

const completedResult = (draft: DraftRecord, alreadyCompleted: boolean): ConfirmDraftResult => {
  const result = draft.result ?? {};
  return {
    kind: draft.kind,
    status: 'completed',
    alreadyCompleted,
    order: result.order,
    reservation: result.reservation,
  };
};

const confirmOrder = async (draft: DraftRecord, user: AiUser) => {
  const payload = draft.payload ?? {};
  const settings = await getOrCreateRestaurantSettings();
  const tableCount = Math.max(1, Number(settings.tableCount) || 10);
  if (!Number.isInteger(payload.tableNumber) || payload.tableNumber < 1) {
    throw new AiError(AiErrorCodes.VALIDATION_FAILED, 'The order draft has no valid table.', 400);
  }
  if (payload.tableNumber > tableCount) {
    throw new AiError(
      AiErrorCodes.VALIDATION_FAILED,
      'The table in this draft no longer exists. Please prepare a new draft.',
      409,
    );
  }

  // Reject a silent price change between draft creation and confirmation. The
  // snapshot below was produced by the server, never by the model.
  const expectedTotal =
    typeof payload.expectedTotal === 'number' ? payload.expectedTotal : null;
  const expectedItems = Array.isArray(payload.pricedItems) ? payload.pricedItems : null;
  if (expectedTotal !== null || expectedItems) {
    const db = await getDB();
    const currentItems = await buildServerPricedItems(db, payload.selections ?? []);
    if (expectedItems) {
      const currentById = new Map(currentItems.map((item) => [item.menuItem, item]));
      const unchanged =
        expectedItems.length === currentById.size &&
        expectedItems.every((expected: any) => {
          const current = currentById.get(expected.menuItemId);
          return (
            current &&
            current.quantity === expected.quantity &&
            Math.abs(current.price - expected.unitPrice) < 0.001
          );
        });
      if (!unchanged) {
        throw new AiError(
          AiErrorCodes.CONFLICT,
          'The menu or prices changed after this draft was prepared. Please ask the assistant to prepare a new draft.',
          409,
        );
      }
    }
    if (
      expectedTotal !== null &&
      Math.abs(computeOrderTotal(currentItems) - expectedTotal) > 0.005
    ) {
      throw new AiError(
        AiErrorCodes.CONFLICT,
        'The order total changed after this draft was prepared. Please ask the assistant to prepare a new draft.',
        409,
      );
    }
  }

  const order = await createOrderForUser({
    userId: user.id,
    selections: payload.selections ?? [],
    tableNumber: payload.tableNumber,
    paymentMethod: payload.paymentMethod === 'card' ? 'card' : 'cash',
    orderId: `ai-${draft.id}`,
    context: { userId: user.id },
  });
  await recordActivity(
    { userId: user.id },
    {
      action: 'create',
      entity: 'order',
      entityId: order?.id,
      summary: `Order for table ${order?.tableNumber ?? payload.tableNumber} created by the AI assistant after customer confirmation (${order?.totalAmount ?? ''})`,
    },
  );
  return { kind: 'order' as const, order };
};

const confirmReservation = async (draft: DraftRecord, user: AiUser, timeZone: string, maxPartySize: number) => {
  const payload = draft.payload ?? {};
  const availability = await checkReservationAvailability(
    {
      date: payload.date,
      time: payload.time,
      guests: payload.guests,
      tableNumber: payload.tableNumber,
    },
    { timeZone, maxPartySize },
  );
  if (!availability.available) {
    throw new AiError(
      AiErrorCodes.CONFLICT,
      'That table is no longer available. Please ask the assistant to prepare a new reservation draft.',
      409,
    );
  }
  if (!availability.freeTables.includes(payload.tableNumber)) {
    throw new AiError(
      AiErrorCodes.CONFLICT,
      'The table in this reservation draft is no longer free. Please prepare a new draft.',
      409,
    );
  }

  const reservation = await createReservationForUser({
    userId: user.id,
    date: payload.date,
    time: payload.time,
    guests: payload.guests,
    tableNumber: payload.tableNumber,
    specialRequests: payload.specialRequests,
    contactName: payload.contactName,
    contactPhone: payload.contactPhone,
    contactEmail: payload.contactEmail,
    reservationId: `ai-${draft.id}`,
    context: { userId: user.id },
  });
  await recordActivity(
    { userId: user.id },
    {
      action: 'create',
      entity: 'reservation',
      entityId: reservation?.id,
      summary: `Reservation for ${reservation?.date ?? payload.date} ${reservation?.time ?? payload.time} created by the AI assistant after customer confirmation (${reservation?.guests ?? payload.guests} guests)`,
    },
  );
  return { kind: 'reservation' as const, reservation };
};

/**
 * Explicit confirmation endpoint logic. This is intentionally not a model tool:
 * the LLM cannot invoke it, and ownership/expiry/status are enforced here.
 */
export const confirmDraft = async (
  draftId: string,
  user: AiUser,
  options: { timeZone: string; maxPartySize: number },
): Promise<ConfirmDraftResult> => {
  const initial = await loadConfirmableDraft(draftId, user.id);
  if (initial.status === 'completed' && initial.result) {
    return completedResult(initial, true);
  }

  return withDraftLock(draftId, async () => {
    const draft = await loadConfirmableDraft(draftId, user.id);
    if (draft.status === 'completed' && draft.result) {
      return completedResult(draft, true);
    }

    await markDraftStatus(draft.id, 'processing');
    try {
      const result =
        draft.kind === 'order'
          ? await confirmOrder(draft, user)
          : await confirmReservation(draft, user, options.timeZone, options.maxPartySize);
      await markDraftStatus(draft.id, 'completed', {
        result,
        completedAt: new Date().toISOString(),
      });
      return {
        kind: draft.kind,
        status: 'completed' as const,
        alreadyCompleted: false,
        ...(draft.kind === 'order' ? { order: (result as any).order } : { reservation: (result as any).reservation }),
      };
    } catch (error) {
      // The deterministic `ai-<draftId>` id makes a retry safe even if the
      // write succeeded but the draft update failed.
      await markDraftStatus(draft.id, 'pending').catch(() => undefined);
      throw error;
    }
  });
};
