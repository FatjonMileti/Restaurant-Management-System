import { getDB } from '../config/rxdb.js';
import { orderResolvers } from '../graphql/resolvers/order';
import { emitEvent } from '../socket.js';

jest.mock('../config/rxdb', () => ({
  getDB: jest.fn(),
}));

jest.mock('../socket', () => ({ emitEvent: jest.fn() }));

describe('order resolvers', () => {
  beforeEach(() => jest.clearAllMocks());

  it('orders returns empty list when none exist', async () => {
    (getDB as unknown as jest.Mock).mockResolvedValue({
      orders: {
        find: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([]),
          }),
        }),
      },
    });
    const res = await orderResolvers.orders({});
    expect(res).toEqual([]);
  });

  it('createOrder inserts and returns formatted order', async () => {
    const mockInsert = jest.fn().mockResolvedValue({
      toJSON: () => ({ _id: 'oid', totalAmount: 20, status: 'pending', items: [{ name: 'Pizza', quantity: 1, price: 20 }] }),
      _id: 'oid',
    });
    (getDB as unknown as jest.Mock).mockResolvedValue({
      orders: {
        insert: mockInsert,
        findOne: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      },
    });
    const orderInput = {
      items: [{ menuItem: 'menu1', name: 'Pizza', quantity: 1, price: 20 }],
      tableNumber: 5,
      paymentMethod: 'cash',
    };
    const res: any = await orderResolvers.createOrder(orderInput, { userId: 'u1' });
    expect(res.status).toBe('pending');
    expect(mockInsert).toHaveBeenCalled();
  });
});
