import { getDB } from '../config/rxdb.js';
import { orderResolvers } from '../graphql/resolvers/order';
import { emitEvent } from '../sse.js';

jest.mock('../config/rxdb', () => ({
  getDB: jest.fn(),
}));

jest.mock('../sse', () => ({ emitEvent: jest.fn() }));

describe('order resolvers', () => {
  beforeEach(() => jest.clearAllMocks());

  it('orders returns empty list when none exist', async () => {
    (getDB as unknown as jest.Mock).mockResolvedValue({
      users: {
        findOne: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            toJSON: () => ({ _id: 'staff1', role: 'staff' }),
          }),
        }),
      },
      orders: {
        find: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([]),
          }),
        }),
      },
      menuItems: {
        find: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
      },
    });
    const res = await orderResolvers.orders({}, { userId: 'staff1' });
    expect(res).toEqual([]);
  });

  it('orders resolves user id to formatted user', async () => {
    const orderJson = {
      _id: 'o1',
      user: 'u1',
      items: [],
      totalAmount: 0,
      status: 'pending',
      tableNumber: 2,
    };
    const orderDoc: any = { toJSON: () => orderJson };
    const findOneImpl = (id: string) => ({
      exec: jest.fn().mockResolvedValue(
        id === 'u1'
          ? {
              toJSON: () => ({
                _id: 'u1',
                name: 'John',
                email: 'john@example.com',
                role: 'customer',
              }),
            }
          : { toJSON: () => ({ _id: 'staff1', role: 'staff' }) },
      ),
    });
    (getDB as unknown as jest.Mock).mockResolvedValue({
      users: { findOne: jest.fn().mockImplementation(findOneImpl) },
      orders: {
        find: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([orderDoc]),
          }),
        }),
      },
      menuItems: {
        find: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
      },
    });
    const res: any = await Promise.all(await orderResolvers.orders({}, { userId: 'staff1' }));
    expect(res[0].user.id).toBe('u1');
    expect(res[0].user.name).toBe('John');
  });

  it('createOrder inserts and returns formatted order', async () => {
    const mockInsert = jest.fn().mockResolvedValue({
      toJSON: () => ({
        _id: 'oid',
        totalAmount: 20,
        status: 'pending',
        items: [{ name: 'Pizza', quantity: 1, price: 20 }],
      }),
      _id: 'oid',
    });
    (getDB as unknown as jest.Mock).mockResolvedValue({
      orders: {
        insert: mockInsert,
        find: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
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

  it('createOrder rejects missing tableNumber', async () => {
    await expect(
      orderResolvers.createOrder(
        { items: [{ menuItem: 'menu1', name: 'Pizza', quantity: 1, price: 20 }] },
        { userId: 'u1' },
      ),
    ).rejects.toThrow(/Table number is required/);
    expect(emitEvent).not.toHaveBeenCalled();
  });
});
