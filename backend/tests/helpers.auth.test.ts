jest.mock('../config/rxdb', () => ({
  getDB: jest.fn(),
}));

import { getDB } from '../config/rxdb';
import { requireAuth, requireAdmin } from '../graphql/helpers/auth';

const mockUsers = {
  findOne: jest.fn(),
};

beforeEach(() => {
  (getDB as unknown as jest.Mock).mockResolvedValue({ users: mockUsers });
  jest.clearAllMocks();
});

describe('auth helpers', () => {
  describe('requireAuth', () => {
    it('throws if no userId in context', async () => {
      await expect(requireAuth({})).rejects.toThrow('Not authenticated');
      await expect(requireAuth(null)).rejects.toThrow('Not authenticated');
    });
    it('throws if user not found', async () => {
      mockUsers.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      await expect(requireAuth({ userId: 'abc' })).rejects.toThrow('Not authenticated');
    });
    it('returns user if found', async () => {
      const fakeUser = { _id: '123', role: 'customer', toJSON: () => ({ _id: '123', role: 'customer' }) };
      mockUsers.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(fakeUser) });
      const res = await requireAuth({ userId: '123' });
      expect(res._id).toBe('123');
      expect(mockUsers.findOne).toHaveBeenCalledWith({ _id: '123' });
    });
  });

  describe('requireAdmin', () => {
    it('throws if not admin', async () => {
      const userDoc = { _id: '1', role: 'customer', toJSON: () => ({ _id: '1', role: 'customer' }) };
      mockUsers.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(userDoc) });
      await expect(requireAdmin({ userId: '1' })).rejects.toThrow('Not authorized, admin only');
    });
    it('throws if staff', async () => {
      const userDoc = { _id: '1', role: 'staff', toJSON: () => ({ _id: '1', role: 'staff' }) };
      mockUsers.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(userDoc) });
      await expect(requireAdmin({ userId: '1' })).rejects.toThrow('Not authorized, admin only');
    });
    it('returns user if admin', async () => {
      const adminDoc = { _id: '1', role: 'admin', toJSON: () => ({ _id: '1', role: 'admin' }) };
      mockUsers.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(adminDoc) });
      const res = await requireAdmin({ userId: '1' });
      expect(res.role).toBe('admin');
    });
    it('throws if not authenticated', async () => {
      await expect(requireAdmin({})).rejects.toThrow('Not authenticated');
    });
  });
});
