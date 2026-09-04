import { getDB } from '../config/rxdb.js';
import { orderResolvers } from '../graphql/resolvers/order';
import { emitEvent } from '../socket.js';

jest.mock('../config/rxdb', () => ({
  getDB: jest.fn().mockResolvedValue({
    orders: {
      find: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }) }),
      findOne: jest.fn(),
      insert: jest.fn(),
    },
    menuItems: { find: jest.fn().mockResolvedValue([]) },
  }),
  getRxDB: jest.fn(),
}));

jest.mock('../socket', () => ({ emitEvent: jest.fn() }));

describe('order resolvers', () => {
  beforeEach(() => jest.clearAllMocks());

  it('orders returns empty list when none exist', async () => {
    const res = await orderResolvers.orders();
    expect(res).toEqual([]);
  });

  it('createOrder inserts and returns formatted order', async () => {
    const mockInsert = jest.fn().mockResolvedValue({
      toJSON: () => ({ _id: 'oid', total: 20, status: 'pending', items: [] }),
      _id: 'oid',
    });
    (getDB as unknown as jest.Mock).mockResolvedValue({
      orders: { insert: mockInsert },
      menuItems: { find: jest.fn().mockResolvedValue([]) },
    });
    const orderInput = { items: [], total: 20 } as any;
    const res: any = await orderResolvers.createOrder(orderInput, { userId: 'u1' });
    expect(res.total).toBe(20);
    expect(mockInsert).toHaveBeenCalled();
  });
});
