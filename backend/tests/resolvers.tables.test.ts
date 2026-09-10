jest.mock('../config/rxdb', () => ({
  getDB: jest.fn(),
}));

jest.mock('../sse', () => ({ emitEvent: jest.fn() }));

import { getDB } from '../config/rxdb';
import { tablesResolvers } from '../graphql/resolvers/tables';

// Honors simple equality selectors like the RxDB queries in the resolver,
// so tests verify filtering happens at query level, not just in JS.
const mockFind = (data: any[]) =>
  jest.fn().mockImplementation((selector: any = {}) => ({
    exec: jest
      .fn()
      .mockResolvedValue(
        data
          .filter((d) => Object.entries(selector).every(([k, v]) => d[k] === v))
          .map((d) => ({ toJSON: () => d })),
      ),
  }));

const mockCollection = (data: any[]) => ({
  find: mockFind(data),
});

const mockStaffUser = {
  findOne: jest.fn().mockReturnValue({
    exec: jest.fn().mockResolvedValue({ toJSON: () => ({ _id: 'u1', role: 'staff' }) }),
  }),
};

const mockSettings = (tableCount: number) => ({
  findOne: jest.fn().mockReturnValue({
    exec: jest.fn().mockResolvedValue({
      toJSON: () => ({ _id: 's1', tableCount }),
    }),
  }),
});

const mockDB = (orders: any[], reservations: any[], tableCount: number) => ({
  orders: mockCollection(orders),
  reservations: mockCollection(reservations),
  settings: mockSettings(tableCount),
  users: mockStaffUser,
});

const staffContext = { userId: 'u1' };

beforeEach(() => jest.clearAllMocks());

describe('tables resolver', () => {
  it('returns table statuses with busy mapping', async () => {
    (getDB as unknown as jest.Mock).mockResolvedValue(
      mockDB(
        [{ _id: 'o1', status: 'pending', tableNumber: 1 }],
        [{ _id: 'r1', status: 'confirmed', tableNumber: 2 }],
        5,
      ),
    );

    const res = await tablesResolvers.tables({}, staffContext);
    expect(res).toHaveLength(5);
    expect(res[0]).toEqual({ number: 1, isBusy: true, busyType: 'order', occupiedBy: 'o1' });
    expect(res[1]).toEqual({
      number: 2,
      isBusy: true,
      busyType: 'reservation',
      occupiedBy: 'r1',
    });
    expect(res[2]).toEqual({ number: 3, isBusy: false, busyType: null, occupiedBy: null });
  });

  it('returns all free when no busy', async () => {
    (getDB as unknown as jest.Mock).mockResolvedValue(mockDB([], [], 3));

    const res = await tablesResolvers.tables({}, staffContext);
    expect(res).toHaveLength(3);
    expect(res.every((t: any) => !t.isBusy)).toBe(true);
  });

  it('ignores completed and cancelled orders', async () => {
    const db = mockDB(
      [
        { _id: 'o1', status: 'completed', tableNumber: 1 },
        { _id: 'o2', status: 'cancelled', tableNumber: 2 },
        { _id: 'o3', status: 'preparing', tableNumber: 3 },
      ],
      [],
      3,
    );
    (getDB as unknown as jest.Mock).mockResolvedValue(db);

    const res = await tablesResolvers.tables({}, staffContext);
    expect(res[0].isBusy).toBe(false);
    expect(res[1].isBusy).toBe(false);
    expect(res[2]).toEqual({ number: 3, isBusy: true, busyType: 'order', occupiedBy: 'o3' });
  });

  it('order wins over reservation on the same table', async () => {
    (getDB as unknown as jest.Mock).mockResolvedValue(
      mockDB(
        [{ _id: 'o1', status: 'pending', tableNumber: 1 }],
        [{ _id: 'r1', status: 'confirmed', tableNumber: 1 }],
        2,
      ),
    );

    const res = await tablesResolvers.tables({}, staffContext);
    expect(res[0]).toEqual({ number: 1, isBusy: true, busyType: 'order', occupiedBy: 'o1' });
  });

  it('ignores docs without a tableNumber', async () => {
    (getDB as unknown as jest.Mock).mockResolvedValue(
      mockDB(
        [{ _id: 'o1', status: 'pending' }],
        [{ _id: 'r1', status: 'confirmed', tableNumber: null }],
        2,
      ),
    );

    const res = await tablesResolvers.tables({}, staffContext);
    expect(res.every((t: any) => !t.isBusy)).toBe(true);
  });

  it('filters by status at query level', async () => {
    const db = mockDB(
      [{ _id: 'o1', status: 'pending', tableNumber: 1 }],
      [{ _id: 'r1', status: 'confirmed', tableNumber: 2 }],
      2,
    );
    (getDB as unknown as jest.Mock).mockResolvedValue(db);

    await tablesResolvers.tables({}, staffContext);
    expect(db.orders.find).toHaveBeenCalledWith({ status: 'pending' });
    expect(db.orders.find).toHaveBeenCalledWith({ status: 'preparing' });
    expect(db.reservations.find).toHaveBeenCalledWith({ status: 'confirmed' });
  });
});
