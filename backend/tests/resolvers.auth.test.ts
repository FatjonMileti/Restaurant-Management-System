jest.mock('../config/rxdb', () => ({
  getDB: jest.fn().mockResolvedValue({
    users: {
      findOne: jest.fn(),
      insert: jest.fn(),
    },
  }),
  getRxDB: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({ sign: jest.fn().mockReturnValue('fake-token') }));
jest.mock('bcryptjs', () => ({ compare: jest.fn() }));
jest.mock('../socket', () => ({ emitEvent: jest.fn() }));

import { getDB } from '../config/rxdb';
import { authResolvers } from '../graphql/resolvers/auth';

const mockUsers = {
  findOne: jest.fn(),
  insert: jest.fn(),
};

beforeEach(() => {
  (getDB as unknown as jest.Mock).mockResolvedValue({ users: mockUsers });
  jest.clearAllMocks();
});

describe('auth resolvers', () => {
  it('register creates user and returns token', async () => {
    mockUsers.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
    const mockUser = { _id: { toString: () => '123' }, name: 'John', email: 'john@example.com', role: 'customer' } as any;
    mockUsers.insert.mockResolvedValue(mockUser);
    const res: any = await authResolvers.register({ name: 'John', email: 'john@example.com', password: 'secret123' });
    expect(res.token).toBe('fake-token');
    expect(res.user.email).toBe('john@example.com');
  });

  it('register throws if user exists', async () => {
    mockUsers.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue({}) });
    await expect(
      authResolvers.register({ name: 'John', email: 'john@example.com', password: 'secret123' }),
    ).rejects.toThrow('User already exists');
  });

  it('login throws on invalid credentials', async () => {
    mockUsers.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
    await expect(authResolvers.login({ email: 'a@b.com', password: 'wrong' })).rejects.toThrow('Invalid email or password');
  });

  it('authMe returns null if no userId', async () => {
    const res = await authResolvers.authMe({}, {});
    expect(res).toBeNull();
  });
});
