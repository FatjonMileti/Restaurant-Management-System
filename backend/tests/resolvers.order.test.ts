import mongoose from 'mongoose';

jest.mock('../models/MenuItem', () => ({
  __esModule: true,
  default: { find: jest.fn() },
}));
jest.mock('../models/Order', () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    findOne: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
  },
}));
jest.mock('../socket', () => ({ emitEvent: jest.fn() }));

import MenuItem from '../models/MenuItem';
import Order from '../models/Order';
import { orderResolvers } from '../graphql/resolvers/order';

const mockMenuFind = (MenuItem.find as unknown) as jest.Mock;
const mockOrderFind = (Order.find as unknown) as jest.Mock;
const mockOrderFindById = (Order.findById as unknown) as jest.Mock;
const mockOrderCreate = (Order.create as unknown) as jest.Mock;
const mockOrderFindOne = (Order.findOne as unknown) as jest.Mock;

describe('order resolvers', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createOrder', () => {
    it('throws if not authenticated', async () => {
      await expect(orderResolvers.createOrder({ items: [{ menuItem: 'id', name: 'Pizza', quantity: 1, price: 10 }] }, {})).rejects.toThrow(
        'Not authenticated',
      );
    });
    it('throws if menu items not found', async () => {
      mockMenuFind.mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });
      await expect(
        orderResolvers.createOrder(
          { items: [{ menuItem: new mongoose.Types.ObjectId().toString(), name: 'Pizza', quantity: 1, price: 10 }] },
          { userId: new mongoose.Types.ObjectId().toString() },
        ),
      ).rejects.toThrow('One or more menu items not found');
    });
    it('throws if table busy', async () => {
      const menuId = new mongoose.Types.ObjectId();
      mockMenuFind.mockReturnValue({ lean: jest.fn().mockResolvedValue([{ _id: menuId }]) });
      mockOrderFindOne.mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'busy' }) });
      await expect(
        orderResolvers.createOrder(
          { items: [{ menuItem: menuId.toString(), name: 'Pizza', quantity: 1, price: 10 }], tableNumber: 5 },
          { userId: new mongoose.Types.ObjectId().toString() },
        ),
      ).rejects.toThrow('Table is busy');
    });
    it('creates order and maps id', async () => {
      const menuId = new mongoose.Types.ObjectId();
      mockMenuFind.mockReturnValue({ lean: jest.fn().mockResolvedValue([{ _id: menuId }]) });
      mockOrderFindOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
      const createdId = new mongoose.Types.ObjectId();
      mockOrderCreate.mockResolvedValue({
        toObject: () => ({ _id: createdId, totalAmount: 10, items: [], tableNumber: 2 }),
        _id: createdId,
      } as any);
      const res: any = await orderResolvers.createOrder(
        { items: [{ menuItem: menuId.toString(), name: 'Pizza', quantity: 1, price: 10 }], tableNumber: 2 },
        { userId: new mongoose.Types.ObjectId().toString() },
      );
      expect(res.id).toBe(createdId.toString());
    });
  });

  describe('orders', () => {
    it('returns formatted orders', async () => {
      const orderId = new mongoose.Types.ObjectId();
      const userId = new mongoose.Types.ObjectId();
      mockOrderFind.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([
          {
            _id: orderId,
            user: { _id: userId, name: 'John', email: 'john@example.com', role: 'customer' },
            items: [],
            totalAmount: 20,
            status: 'pending',
          },
        ]),
      } as any);
      // need chain for second populate
      const populateMock = (Order.find as jest.Mock).mock.results[0]?.value?.populate;
      // Our mock above uses mockReturnThis, but second populate call needs to chain
      // Instead we mock find to return object with populate returning object with populate etc.
      // Simplify: recreate mock correctly
      mockOrderFind.mockReturnValue({
        populate: jest.fn().mockImplementation(() => ({
          populate: jest.fn().mockImplementation(() => ({
            sort: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue([
                {
                  _id: orderId,
                  user: { _id: userId, name: 'John', email: 'john@example.com', role: 'customer' },
                  items: [],
                  totalAmount: 20,
                  status: 'pending',
                },
              ]),
            }),
          })),
        })),
      } as any);
      // Need to adjust test to use direct call; easier: just call and check formatting via mocked lean
      // We'll not assert deep here, just ensure it doesn't throw
      const originalMock = mockOrderFind.getMockImplementation();
      mockOrderFind.mockImplementation(() => ({
        populate: () => ({
          populate: () => ({
            sort: () => ({
              lean: () =>
                Promise.resolve([
                  {
                    _id: orderId,
                    user: { _id: userId, name: 'John', email: 'john@example.com', role: 'customer' },
                    items: [],
                    totalAmount: 20,
                    status: 'pending',
                  },
                ]),
            }),
          }),
        }),
      }) as any);
      const res = await orderResolvers.orders({});
      expect(res[0].id).toBe(orderId.toString());
    });
  });
});
