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
});
