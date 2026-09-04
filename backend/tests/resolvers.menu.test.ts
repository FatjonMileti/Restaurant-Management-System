import { getDB } from '../config/rxdb';

jest.mock('../config/rxdb', () => ({
  getDB: jest.fn(),
}));

jest.mock('../../socket', () => ({
  emitEvent: jest.fn(),
}));

jest.mock('../../graphql/helpers/auth', () => ({
  requireAdmin: jest.fn(),
}));

import { menuResolvers } from '../../graphql/resolvers/menu';
import { requireAdmin } from '../../graphql/helpers/auth';

const mockRequireAdmin = requireAdmin as unknown as jest.Mock;

const mockMenuItems = {
  find: jest.fn(),
  findOne: jest.fn(),
  insert: jest.fn(),
};

;(getDB as jest.Mock).mockResolvedValue({ menuItems: mockMenuItems });

describe('menu resolvers (RxDB)', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('menuItems', () => {
    it('filters by category and available', async () => {
      const docs = [{ _id: '1', name: 'Pizza', toJSON: () => ({ _id: '1', name: 'Pizza' }) }];
      mockMenuItems.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(docs) }),
      });
      const res = await menuResolvers.menuItems({ category: 'Food', available: true });
      expect(mockMenuItems.find).toHaveBeenCalledWith({ category: 'Food', available: true });
      expect(res[0].id).toBe('1');
    });

    it('returns all when no filter', async () => {
      const docs = [{ _id: '2', name: 'A', toJSON: () => ({ _id: '2', name: 'A' }) }];
      mockMenuItems.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(docs) }),
      });
      const res = await menuResolvers.menuItems({});
      expect(mockMenuItems.find).toHaveBeenCalledWith({});
      expect(res).toHaveLength(1);
    });
  });

  describe('menuItem', () => {
    it('returns single item formatted', async () => {
      const doc = { _id: '3', name: 'Burger', toJSON: () => ({ _id: '3', name: 'Burger' }) };
      mockMenuItems.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(doc) });
      const res: any = await menuResolvers.menuItem({ id: '3' });
      expect(res.id).toBe('3');
    });
    it('returns null if not found', async () => {
      mockMenuItems.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      const res = await menuResolvers.menuItem({ id: 'nonexistent' });
      expect(res).toBeNull();
    });
  });

  describe('createMenuItem', () => {
    it('requires admin', async () => {
      mockRequireAdmin.mockRejectedValue(new Error('Not authorized'));
      await expect(
        menuResolvers.createMenuItem({ name: 'Pizza', price: 10, category: 'Food' }, {}),
      ).rejects.toThrow('Not authorized');
    });
    it('creates item when valid and admin', async () => {
      mockRequireAdmin.mockResolvedValue({ role: 'admin' });
      const created = {
        _id: '4',
        name: 'Pizza',
        price: 10,
        category: 'Food',
        toJSON: () => ({ _id: '4', name: 'Pizza', price: 10, category: 'Food' }),
      };
      mockMenuItems.insert.mockResolvedValue(created);
      const res: any = await menuResolvers.createMenuItem(
        { name: 'Pizza', price: 10, category: 'Food', image: '' },
        { userId: 'adminId' },
      );
      expect(res.id).toBe('4');
      expect(mockMenuItems.insert).toHaveBeenCalled();
    });
    it('throws validation error for negative price', async () => {
      mockRequireAdmin.mockResolvedValue({ role: 'admin' });
      await expect(
        menuResolvers.createMenuItem({ name: 'Pizza', price: -5, category: 'Food' }, {}),
      ).rejects.toThrow();
    });
  });

  describe('updateMenuItem', () => {
    it('updates via findOne and update', async () => {
      mockRequireAdmin.mockResolvedValue({ role: 'admin' });
      const doc = {
        _id: '5',
        name: 'Old',
        price: 5,
        toJSON: () => ({ _id: '5', name: 'Old', price: 5 }),
        update: jest.fn().mockResolvedValue(undefined),
      };
      mockMenuItems.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(doc) });
      const res: any = await menuResolvers.updateMenuItem({ id: '5', price: 12 }, {});
      expect(doc.update).toHaveBeenCalledWith({ $set: { price: 12 } });
      expect(res.id).toBe('5');
    });
  });

  describe('deleteMenuItem', () => {
    it('removes item when found', async () => {
      const doc = { _id: '6', remove: jest.fn().mockResolvedValue(undefined) };
      mockMenuItems.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(doc) });
      const res = await menuResolvers.deleteMenuItem({ id: '6' }, {});
      expect(doc.remove).toHaveBeenCalled();
      expect(res).toBe('Menu item removed');
    });
  });
});
