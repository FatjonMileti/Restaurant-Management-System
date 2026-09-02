import { requireAuth, requireAdmin } from '../graphql/helpers/auth';

jest.mock('../models/User', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
  },
}));

import User from '../models/User';

const mockedFindById = (User.findById as unknown) as jest.Mock;

describe('auth helpers', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('requireAuth', () => {
    it('throws if no userId in context', async () => {
      await expect(requireAuth({})).rejects.toThrow('Not authenticated');
      await expect(requireAuth(null)).rejects.toThrow('Not authenticated');
    });
    it('throws if user not found', async () => {
      mockedFindById.mockResolvedValue(null);
      await expect(requireAuth({ userId: 'abc' })).rejects.toThrow('Not authenticated');
    });
    it('returns user if found', async () => {
      const fakeUser = { _id: '123', role: 'customer' };
      mockedFindById.mockResolvedValue(fakeUser);
      const res = await requireAuth({ userId: '123' });
      expect(res).toBe(fakeUser);
      expect(mockedFindById).toHaveBeenCalledWith('123');
    });
  });

  describe('requireAdmin', () => {
    it('throws if not admin', async () => {
      mockedFindById.mockResolvedValue({ _id: '1', role: 'customer' });
      await expect(requireAdmin({ userId: '1' })).rejects.toThrow('Not authorized, admin only');
    });
    it('throws if staff', async () => {
      mockedFindById.mockResolvedValue({ _id: '1', role: 'staff' });
      await expect(requireAdmin({ userId: '1' })).rejects.toThrow('Not authorized, admin only');
    });
    it('returns user if admin', async () => {
      const admin = { _id: '1', role: 'admin' };
      mockedFindById.mockResolvedValue(admin);
      const res = await requireAdmin({ userId: '1' });
      expect(res).toBe(admin);
    });
    it('throws if not authenticated', async () => {
      await expect(requireAdmin({})).rejects.toThrow('Not authenticated');
    });
  });
});
