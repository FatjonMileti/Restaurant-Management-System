jest.mock('../models/User', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    find: jest.fn(),
  },
}));
jest.mock('jsonwebtoken', () => ({ sign: jest.fn().mockReturnValue('fake-token') }));
jest.mock('bcryptjs', () => ({ compare: jest.fn() }));
jest.mock('../socket', () => ({ emitEvent: jest.fn() }));

import User from '../models/User';
import { authResolvers } from '../graphql/resolvers/auth';

describe('auth resolvers', () => {
  beforeEach(() => jest.clearAllMocks());

  it('register creates user and returns token', async () => {
    (User.findOne as unknown as jest.Mock).mockResolvedValue(null);
    const mockUser = { _id: { toString: () => '123' }, name: 'John', email: 'john@example.com', role: 'customer' };
    (User.create as unknown as jest.Mock).mockResolvedValue(mockUser as any);
    const res: any = await authResolvers.register({ name: 'John', email: 'john@example.com', password: 'secret123' });
    expect(res.token).toBe('fake-token');
    expect(res.user.email).toBe('john@example.com');
  });

  it('register throws if user exists', async () => {
    (User.findOne as unknown as jest.Mock).mockResolvedValue({ email: 'john@example.com' });
    await expect(authResolvers.register({ name: 'John', email: 'john@example.com', password: 'secret123' })).rejects.toThrow(
      'User already exists',
    );
  });

  it('login throws on invalid credentials', async () => {
    (User.findOne as unknown as jest.Mock).mockResolvedValue(null);
    await expect(authResolvers.login({ email: 'a@b.com', password: 'wrong' })).rejects.toThrow('Invalid email or password');
  });

  it('authMe returns null if no userId', async () => {
    const res = await authResolvers.authMe({}, {});
    expect(res).toBeNull();
  });
});
