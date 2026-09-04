jest.mock('../config/rxdb', () => ({
  getDB: jest.fn(),
}));

jest.mock('../socket', () => ({ emitEvent: jest.fn() }));

import { getDB } from '../config/rxdb';
import { tablesResolvers } from '../graphql/resolvers/tables';

const mockFind = (data: any[]) => jest.fn().mockReturnValue({
  exec: jest.fn().mockResolvedValue(data.map((d) => ({ toJSON: () => d }))),
});

const mockCollection = (data: any[]) => ({
  find: mockFind(data),
});

beforeEach(() => jest.clearAllMocks());

describe('tables resolver', () => {
  it('returns table statuses with busy mapping', async () => {
    const mockDB = {
      orders: mockCollection([
        { _id: 'o1', status: 'pending', tableNumber: 1 },
      ]),
      reservations: mockCollection([
        { _id: 'r1', status: 'confirmed', tableNumber: 2 },
      ]),
      settings: {
        findOne: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            toJSON: () => ({ _id: 's1', tableCount: 5 }),
          }),
        }),
      },
    };
    (getDB as unknown as jest.Mock).mockResolvedValue(mockDB);

    const res = await tablesResolvers.tables();
    expect(res).toHaveLength(5);
    expect(res[0].isBusy).toBe(true);
    expect(res[0].busyType).toBe('order');
    expect(res[1].isBusy).toBe(true);
    expect(res[1].busyType).toBe('reservation');
    expect(res[2].isBusy).toBe(false);
  });

  it('returns all free when no busy', async () => {
    const mockDB = {
      orders: mockCollection([]),
      reservations: mockCollection([]),
      settings: {
        findOne: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            toJSON: () => ({ _id: 's1', tableCount: 3 }),
          }),
        }),
      },
    };
    (getDB as unknown as jest.Mock).mockResolvedValue(mockDB);

    const res = await tablesResolvers.tables();
    expect(res).toHaveLength(3);
    expect(res.every((t: any) => !t.isBusy)).toBe(true);
  });
});
