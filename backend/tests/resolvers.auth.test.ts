jest.mock('../config/rxdb', () => ({
  getDB: jest.fn(),
  getRxDB: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({ sign: jest.fn().mockReturnValue('fake-token') }));
jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  genSalt: jest.fn().mockResolvedValue('salt'),
  hash: jest.fn().mockResolvedValue('hashed'),
}));
jest.mock('../sse', () => ({ emitEvent: jest.fn() }));

import { getDB } from '../config/rxdb';
import { authResolvers } from '../graphql/resolvers/auth';

const mockUsers = {
  find: jest.fn(),
  findOne: jest.fn(),
  insert: jest.fn(),
};

beforeEach(() => {
  (getDB as unknown as jest.Mock).mockResolvedValue({ users: mockUsers });
  jest.clearAllMocks();
});

describe('auth resolvers', () => {
  it('register creates user and returns token', async () => {
    mockUsers.find.mockReturnValue({ exec: jest.fn().mockResolvedValue([]) });
    const mockUser = {
      _id: '123',
      name: 'John',
      email: 'john@example.com',
      role: 'customer',
      toJSON: () => ({
        _id: '123',
        name: 'John',
        email: 'john@example.com',
        role: 'customer',
        password: 'hashed',
      }),
    } as any;
    mockUsers.insert.mockResolvedValue(mockUser);
    const res: any = await authResolvers.register({
      name: 'John',
      email: 'john@example.com',
      password: 'secret123',
    });
    expect(res.token).toBe('fake-token');
    expect(res.user.email).toBe('john@example.com');
  });

  it('register throws if user exists', async () => {
    const existingUser = { toJSON: () => ({ email: 'john@example.com' }) };
    mockUsers.find.mockReturnValue({ exec: jest.fn().mockResolvedValue([existingUser]) });
    await expect(
      authResolvers.register({ name: 'John', email: 'john@example.com', password: 'secret123' }),
    ).rejects.toThrow('User already exists');
  });

  it('login throws on invalid credentials', async () => {
    mockUsers.find.mockReturnValue({ exec: jest.fn().mockResolvedValue([]) });
    await expect(authResolvers.login({ email: 'a@b.com', password: 'wrong' })).rejects.toThrow(
      'Invalid email or password',
    );
  });

  it('authMe returns null if no userId', async () => {
    const res = await authResolvers.authMe({}, {});
    expect(res).toBeNull();
  });

  it('authUsers allows staff and strips passwords', async () => {
    mockUsers.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ toJSON: () => ({ _id: 's1', role: 'staff' }) }),
    });
    mockUsers.find.mockReturnValue({
      exec: jest
        .fn()
        .mockResolvedValue([
          { toJSON: () => ({ _id: 'u1', name: 'John', email: 'j@x.com', password: 'hashed' }) },
        ]),
    });
    const res: any = await authResolvers.authUsers({}, { userId: 's1' });
    expect(res).toHaveLength(1);
    expect(res[0].email).toBe('j@x.com');
    expect(res[0].password).toBeUndefined();
  });

  it('authUsers rejects customers', async () => {
    mockUsers.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ toJSON: () => ({ _id: 'c1', role: 'customer' }) }),
    });
    await expect(authResolvers.authUsers({}, { userId: 'c1' })).rejects.toThrow(
      'staff or admin only',
    );
  });

  it('authUsers rejects unauthenticated callers', async () => {
    await expect(authResolvers.authUsers({}, {})).rejects.toThrow('Not authenticated');
  });

  describe('updateUser (admin edit)', () => {
    const adminCtx = { userId: 'admin1' };
    const adminDoc = { toJSON: () => ({ _id: 'admin1', role: 'admin', name: 'Admin' }) };

    const targetDoc = (overrides: any = {}) => {
      const data = {
        _id: 'u1',
        name: 'John',
        email: 'john@example.com',
        phone: '111',
        role: 'customer',
        ...overrides,
      };
      return {
        toJSON: () => ({ ...data }),
        update: jest.fn().mockImplementation(async ({ $set }: any) => {
          Object.assign(data, $set);
        }),
      };
    };

    it('updates name, email, phone and role', async () => {
      const doc = targetDoc();
      mockUsers.findOne.mockImplementation((id: any) => ({
        exec: jest.fn().mockResolvedValue(id === 'admin1' ? adminDoc : doc),
      }));
      mockUsers.find.mockReturnValue({ exec: jest.fn().mockResolvedValue([]) });
      const res: any = await authResolvers.updateUser(
        { id: 'u1', name: 'Johnny', email: 'johnny@example.com', phone: '222', role: 'staff' },
        adminCtx,
      );
      expect(doc.update).toHaveBeenCalledWith({
        $set: { name: 'Johnny', email: 'johnny@example.com', phone: '222', role: 'staff' },
      });
      expect(res.name).toBe('Johnny');
      expect(res.role).toBe('staff');
      expect(res.password).toBeUndefined();
    });

    it('throws CONFLICT when the new email is already in use', async () => {
      const doc = targetDoc();
      mockUsers.findOne.mockImplementation((id: any) => ({
        exec: jest.fn().mockResolvedValue(id === 'admin1' ? adminDoc : doc),
      }));
      mockUsers.find.mockReturnValue({
        exec: jest
          .fn()
          .mockResolvedValue([{ toJSON: () => ({ _id: 'u2', email: 'taken@example.com' }) }]),
      });
      await expect(
        authResolvers.updateUser({ id: 'u1', email: 'taken@example.com' }, adminCtx),
      ).rejects.toThrow('Email already in use');
    });

    it('rejects when no fields are provided', async () => {
      mockUsers.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(adminDoc) });
      await expect(authResolvers.updateUser({ id: 'u1' }, adminCtx)).rejects.toThrow(
        'No fields to update',
      );
    });

    it('prevents an admin from changing their own role', async () => {
      const self = targetDoc({ _id: 'admin1', role: 'admin' });
      mockUsers.findOne.mockImplementation((id: any) => ({
        exec: jest.fn().mockResolvedValue(id === 'admin1' ? (self as any) : self),
      }));
      // requireAdmin sees the admin role via the same doc
      await expect(
        authResolvers.updateUser({ id: 'admin1', role: 'customer' }, adminCtx),
      ).rejects.toThrow('Cannot change your own role');
    });

    it('throws NOT_FOUND for unknown users', async () => {
      mockUsers.findOne.mockImplementation((id: any) => ({
        exec: jest.fn().mockResolvedValue(id === 'admin1' ? adminDoc : null),
      }));
      await expect(
        authResolvers.updateUser({ id: 'missing', name: 'X' }, adminCtx),
      ).rejects.toThrow('User not found');
    });

    it('rejects non-admin callers', async () => {
      mockUsers.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ toJSON: () => ({ _id: 'c1', role: 'customer' }) }),
      });
      await expect(
        authResolvers.updateUser({ id: 'u1', name: 'X' }, { userId: 'c1' }),
      ).rejects.toThrow('admin only');
    });
  });

  describe('adminUpdateUserPassword', () => {
    const adminCtx = { userId: 'admin1' };
    const adminDoc = { toJSON: () => ({ _id: 'admin1', role: 'admin', name: 'Admin' }) };

    it('hashes and stores the new password without asking for the old one', async () => {
      const bcrypt = require('bcryptjs');
      const doc = {
        toJSON: () => ({ _id: 'u1', name: 'John', email: 'john@example.com' }),
        update: jest.fn().mockResolvedValue(undefined),
      };
      mockUsers.findOne.mockImplementation((id: any) => ({
        exec: jest.fn().mockResolvedValue(id === 'admin1' ? adminDoc : doc),
      }));
      const res = await authResolvers.adminUpdateUserPassword(
        { id: 'u1', password: 'newsecret123' },
        adminCtx,
      );
      expect(res).toBe('Password updated');
      expect(bcrypt.hash).toHaveBeenCalledWith('newsecret123', 'salt');
      expect(doc.update).toHaveBeenCalledWith({ $set: { password: 'hashed' } });
    });

    it('rejects short passwords', async () => {
      mockUsers.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(adminDoc) });
      await expect(
        authResolvers.adminUpdateUserPassword({ id: 'u1', password: '123' }, adminCtx),
      ).rejects.toThrow('Password must be at least 6 characters');
    });

    it('throws NOT_FOUND for unknown users', async () => {
      mockUsers.findOne.mockImplementation((id: any) => ({
        exec: jest.fn().mockResolvedValue(id === 'admin1' ? adminDoc : null),
      }));
      await expect(
        authResolvers.adminUpdateUserPassword(
          { id: 'missing', password: 'newsecret123' },
          adminCtx,
        ),
      ).rejects.toThrow('User not found');
    });

    it('rejects non-admin callers', async () => {
      mockUsers.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ toJSON: () => ({ _id: 's1', role: 'staff' }) }),
      });
      await expect(
        authResolvers.adminUpdateUserPassword(
          { id: 'u1', password: 'newsecret123' },
          { userId: 's1' },
        ),
      ).rejects.toThrow('admin only');
    });
  });
});
