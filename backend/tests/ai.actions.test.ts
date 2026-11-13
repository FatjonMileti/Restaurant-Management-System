jest.mock('../config/rxdb.js', () => ({
  getDB: jest.fn(),
}));
jest.mock('../graphql/helpers/formatters.js', () => ({
  getOrCreateRestaurantSettings: jest.fn(),
}));
jest.mock('../graphql/helpers/activityLog.js', () => ({
  recordActivity: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../services/orderService.js', () => ({
  buildServerPricedItems: jest.fn(),
  computeOrderTotal: jest.fn(),
  createOrderForUser: jest.fn(),
}));
jest.mock('../services/reservationService.js', () => ({
  createReservationForUser: jest.fn(),
}));
jest.mock('../services/availabilityService.js', () => ({
  checkReservationAvailability: jest.fn(),
}));
jest.mock('../ai/conversation/draftService.js', () => ({
  loadConfirmableDraft: jest.fn(),
  markDraftStatus: jest.fn(),
  withDraftLock: async (_id: string, work: () => Promise<unknown>) => work(),
}));

import { getDB } from '../config/rxdb.js';
import { confirmDraft } from '../ai/actions/confirmActions.js';
import { createToolRegistry } from '../ai/tools/index.js';
import { getOrCreateRestaurantSettings } from '../graphql/helpers/formatters.js';
import { recordActivity } from '../graphql/helpers/activityLog.js';
import { checkReservationAvailability } from '../services/availabilityService.js';
import {
  buildServerPricedItems,
  computeOrderTotal,
  createOrderForUser,
} from '../services/orderService.js';
import { createReservationForUser } from '../services/reservationService.js';
import {
  loadConfirmableDraft,
  markDraftStatus,
  type DraftRecord,
} from '../ai/conversation/draftService.js';

const asMock = (value: unknown) => value as jest.Mock;

const customer = {
  id: 'customer-1',
  name: 'Ana',
  email: 'ana@example.com',
  role: 'customer' as const,
  phone: '555-0100',
};

const future = () => new Date(Date.now() + 10 * 60 * 1000).toISOString();

const draft = (overrides: Partial<DraftRecord> = {}): DraftRecord => ({
  id: 'draft-1',
  kind: 'order',
  userId: customer.id,
  status: 'pending',
  payload: {
    tableNumber: 2,
    paymentMethod: 'cash',
    selections: [{ menuItemId: 'm1', quantity: 2 }],
  },
  expiresAt: future(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const options = { timeZone: 'UTC', maxPartySize: 12 };

describe('AI draft confirmation actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    asMock(getOrCreateRestaurantSettings).mockResolvedValue({ tableCount: 10 });
    asMock(markDraftStatus).mockImplementation(async (id: string, status: string) => ({
      ...draft(),
      id,
      status,
    }));
  });

  it('creates a server-priced order only after confirmation with a deterministic id', async () => {
    asMock(loadConfirmableDraft).mockResolvedValue(draft());
    asMock(createOrderForUser).mockResolvedValue({
      id: 'ai-draft-1',
      tableNumber: 2,
      totalAmount: 25,
    });

    const result = await confirmDraft('draft-1', customer, options);

    expect(result).toMatchObject({ kind: 'order', status: 'completed', alreadyCompleted: false });
    expect(createOrderForUser).toHaveBeenCalledWith({
      userId: customer.id,
      selections: [{ menuItemId: 'm1', quantity: 2 }],
      tableNumber: 2,
      paymentMethod: 'cash',
      orderId: 'ai-draft-1',
      context: { userId: customer.id },
    });
    expect(markDraftStatus).toHaveBeenLastCalledWith(
      'draft-1',
      'completed',
      expect.objectContaining({ result: expect.any(Object) }),
    );
    expect(recordActivity).toHaveBeenCalledWith(
      { userId: customer.id },
      expect.objectContaining({ entity: 'order', action: 'create' }),
    );
  });

  it('rejects a silent price change between draft creation and confirmation', async () => {
    asMock(getDB).mockResolvedValue({});
    asMock(loadConfirmableDraft).mockResolvedValue(
      draft({
        payload: {
          ...draft().payload,
          pricedItems: [{ menuItemId: 'm1', quantity: 2, unitPrice: 12.5 }],
          expectedTotal: 25,
        },
      }),
    );
    asMock(buildServerPricedItems).mockResolvedValue([
      { menuItem: 'm1', name: 'Tomato Pasta', price: 13.5, quantity: 2 },
    ]);
    asMock(computeOrderTotal).mockReturnValue(27);

    await expect(confirmDraft('draft-1', customer, options)).rejects.toMatchObject({
      status: 409,
      code: 'CONFLICT',
      message: expect.stringMatching(/changed after this draft/i),
    });
    expect(createOrderForUser).not.toHaveBeenCalled();
    expect(markDraftStatus).toHaveBeenLastCalledWith('draft-1', 'pending');
  });

  it('returns the original result for an already completed draft without writing again', async () => {
    asMock(loadConfirmableDraft).mockResolvedValue(
      draft({
        status: 'completed',
        result: { kind: 'order', order: { id: 'ai-draft-1', totalAmount: 25 } },
      }),
    );

    const result = await confirmDraft('draft-1', customer, options);
    expect(result).toMatchObject({
      kind: 'order',
      status: 'completed',
      alreadyCompleted: true,
      order: { id: 'ai-draft-1', totalAmount: 25 },
    });
    expect(createOrderForUser).not.toHaveBeenCalled();
    expect(markDraftStatus).not.toHaveBeenCalled();
  });

  it('rejects a table that no longer exists', async () => {
    asMock(loadConfirmableDraft).mockResolvedValue(
      draft({ payload: { ...draft().payload, tableNumber: 99 } }),
    );

    await expect(confirmDraft('draft-1', customer, options)).rejects.toMatchObject({
      status: 409,
    });
    expect(createOrderForUser).not.toHaveBeenCalled();
  });

  it('revalidates reservation availability before creating it', async () => {
    asMock(loadConfirmableDraft).mockResolvedValue(
      draft({
        kind: 'reservation',
        payload: {
          date: '2030-01-10',
          time: '19:00',
          guests: 2,
          tableNumber: 3,
          contactName: 'Ana',
          contactPhone: '555-0100',
          contactEmail: 'ana@example.com',
        },
      }),
    );
    asMock(checkReservationAvailability).mockResolvedValue({
      available: false,
      freeTables: [1, 2],
    });

    await expect(confirmDraft('draft-1', customer, options)).rejects.toMatchObject({
      status: 409,
    });
    expect(createReservationForUser).not.toHaveBeenCalled();
    expect(markDraftStatus).toHaveBeenCalledWith('draft-1', 'pending');
  });

  it('creates a reservation with the authenticated owner and emits an activity log', async () => {
    const reservationDraft = draft({
      kind: 'reservation',
      payload: {
        date: '2030-01-10',
        time: '19:00',
        guests: 2,
        tableNumber: 3,
        contactName: 'Ana',
        contactPhone: '555-0100',
        contactEmail: 'ana@example.com',
      },
    });
    asMock(loadConfirmableDraft).mockResolvedValue(reservationDraft);
    asMock(checkReservationAvailability).mockResolvedValue({
      available: true,
      freeTables: [1, 2, 3],
    });
    asMock(createReservationForUser).mockResolvedValue({
      id: 'ai-draft-1',
      date: '2030-01-10',
      time: '19:00',
      guests: 2,
    });

    const result = await confirmDraft('draft-1', customer, options);
    expect(result).toMatchObject({ kind: 'reservation', alreadyCompleted: false });
    expect(createReservationForUser).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: customer.id,
        reservationId: 'ai-draft-1',
        contactPhone: '555-0100',
        context: { userId: customer.id },
      }),
    );
    expect(recordActivity).toHaveBeenCalledWith(
      { userId: customer.id },
      expect.objectContaining({ entity: 'reservation' }),
    );
  });

  it('resets the draft to pending when the write fails so a retry is possible', async () => {
    asMock(loadConfirmableDraft).mockResolvedValue(draft());
    asMock(createOrderForUser).mockRejectedValue(new Error('database unavailable'));

    await expect(confirmDraft('draft-1', customer, options)).rejects.toThrow('database unavailable');
    expect(markDraftStatus).toHaveBeenCalledWith('draft-1', 'processing');
    expect(markDraftStatus).toHaveBeenLastCalledWith('draft-1', 'pending');
  });

  it('never registers a confirmation or arbitrary write tool for the model', () => {
    const registry = createToolRegistry({
      config: {
        restaurantTimeZone: 'UTC',
        maxPartySize: 12,
        draftTtlMs: 60_000,
        toolTimeoutMs: 1000,
      } as any,
      knowledge: null,
    });
    const names = registry.list().map((tool) => tool.name);
    expect(names).toEqual([
      'search_menu',
      'get_menu_item_details',
      'get_restaurant_information',
      'check_reservation_availability',
      'search_restaurant_knowledge',
      'prepare_order_draft',
      'prepare_reservation_draft',
    ]);
    expect(names).not.toContain('confirm_draft');
    expect(names).not.toContain('create_order');
    expect(names).not.toContain('create_reservation');
    expect(
      registry.list().find((tool) => tool.name === 'prepare_order_draft')?.access,
    ).toBe('authenticated');
  });
});
