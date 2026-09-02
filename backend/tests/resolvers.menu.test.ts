import mongoose from 'mongoose';

jest.mock('../models/MenuItem', () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
  },
}));

jest.mock('../socket', () => ({
  emitEvent: jest.fn(),
}));

jest.mock('../graphql/helpers/auth', () => ({
  requireAdmin: jest.fn(),
}));

import MenuItem from '../models/MenuItem';
import { menuResolvers } from '../graphql/resolvers/menu';
import { requireAdmin } from '../graphql/helpers/auth';

const mockRequireAdmin = requireAdmin as unknown as jest.Mock;
const mockFind = (MenuItem.find as unknown) as jest.Mock;
const mockFindById = (MenuItem.findById as unknown) as jest.Mock;
const mockCreate = (MenuItem.create as unknown) as jest.Mock;
const mockFindByIdAndUpdate = (MenuItem.findByIdAndUpdate as unknown) as jest.Mock;

describe('menu resolvers', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('menuItems', () => {
    it('filters by category and available', async () => {
      const docs = [{ _id: new mongoose.Types.ObjectId(), name: 'Pizza' }];
      mockFind.mockReturnValue({ sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(docs) }) });
      const res = await menuResolvers.menuItems({ category: 'Food', available: true });
      expect(mockFind).toHaveBeenCalledWith({ category: 'Food', available: true });
      expect(res[0].id).toBe(docs[0]._id.toString());
    });
    it('returns all when no filter', async () => {
      const docs = [{ _id: new mongoose.Types.ObjectId(), name: 'A' }];
      mockFind.mockReturnValue({ sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(docs) }) });
      const res = await menuResolvers.menuItems({});
      expect(mockFind).toHaveBeenCalledWith({});
      expect(res).toHaveLength(1);
    });
  });

  describe('menuItem', () => {
    it('returns single item formatted', async () => {
      const id = new mongoose.Types.ObjectId();
      const doc = { _id: id, name: 'Burger' };
      mockFindById.mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) });
      const res: any = await menuResolvers.menuItem({ id: id.toString() });
      expect(res.id).toBe(id.toString());
    });
    it('returns null if not found', async () => {
      mockFindById.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
      const res = await menuResolvers.menuItem({ id: 'nonexistent' });
      expect(res).toBeNull();
    });
  });

  describe('createMenuItem', () => {
    it('requires admin', async () => {
      mockRequireAdmin.mockRejectedValue(new Error('Not authorized, admin only'));
      await expect(menuResolvers.createMenuItem({ name: 'Pizza', price: 10, category: 'Food' }, {})).rejects.toThrow(
        'Not authorized',
      );
    });
    it('creates item when valid and admin', async () => {
      mockRequireAdmin.mockResolvedValue({ role: 'admin' });
      const created = { _id: new mongoose.Types.ObjectId(), name: 'Pizza', price: 10, category: 'Food' };
      mockCreate.mockResolvedValue(created);
      const res: any = await menuResolvers.createMenuItem(
        { name: 'Pizza', price: 10, category: 'Food', image: '' },
        { userId: 'adminId' },
      );
      expect(res.id).toBe(created._id.toString());
      expect(mockCreate).toHaveBeenCalled();
    });
    it('throws validation error for negative price', async () => {
      mockRequireAdmin.mockResolvedValue({ role: 'admin' });
      await expect(menuResolvers.createMenuItem({ name: 'Pizza', price: -5, category: 'Food' }, {})).rejects.toThrow();
    });
  });

  describe('updateMenuItem', () => {
    it('updates via findByIdAndUpdate and formats', async () => {
      mockRequireAdmin.mockResolvedValue({ role: 'admin' });
      const id = new mongoose.Types.ObjectId();
      const updated = { _id: id, name: 'Updated', price: 12, category: 'Food' };
      mockFindByIdAndUpdate.mockReturnValue({ lean: jest.fn().mockResolvedValue(updated) });
      const res: any = await menuResolvers.updateMenuItem({ id: id.toString(), price: 12 }, {});
      expect(res.id).toBe(id.toString());
      expect(res.price).toBe(12);
    });
  });
});
