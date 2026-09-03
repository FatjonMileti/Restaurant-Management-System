import * as gqlRequest from 'graphql-request';
import { useAuthStore } from '../authStore';

jest.mock('graphql-request', () => ({
  request: jest.fn(),
  gql: (s: TemplateStringsArray) => s.join(''),
}));

describe('authStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ user: null });
    jest.clearAllMocks();
  });

  it('reads null when no stored user', () => {
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('login persists user', async () => {
    const mockRequest = gqlRequest.request as unknown as jest.Mock;
    mockRequest.mockResolvedValue({
      login: {
        token: 'tok123',
        user: { id: 'u1', name: 'John', email: 'john@example.com', role: 'customer' },
      },
    });
    const user = await useAuthStore.getState().login('john@example.com', 'secret123');
    expect(user._id).toBe('u1');
    expect(user.token).toBe('tok123');
    expect(useAuthStore.getState().user?._id).toBe('u1');
    expect(localStorage.getItem('user')).toContain('u1');
  });

  it('register persists user', async () => {
    const mockRequest = gqlRequest.request as unknown as jest.Mock;
    mockRequest.mockResolvedValue({
      register: {
        token: 'regTok',
        user: { id: 'u2', name: 'Jane', email: 'jane@example.com', role: 'customer' },
      },
    });
    const user = await useAuthStore
      .getState()
      .register('Jane', 'jane@example.com', 'pwd123', '123');
    expect(user._id).toBe('u2');
    expect(localStorage.getItem('user')).toContain('u2');
  });

  it('logout clears storage', () => {
    localStorage.setItem(
      'user',
      JSON.stringify({ _id: 'u1', name: 'John', email: 'a@b.com', role: 'customer', token: 't' }),
    );
    useAuthStore.setState({
      user: { _id: 'u1', name: 'John', email: 'a@b.com', role: 'customer', token: 't' },
    } as any);
    useAuthStore.getState().logout();
    expect(useAuthStore.getState().user).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('persists user to localStorage', async () => {
    const mockRequest = gqlRequest.request as unknown as jest.Mock;
    mockRequest.mockResolvedValue({
      login: {
        token: 'tok',
        user: { id: 'u3', name: 'Bob', email: 'bob@example.com', role: 'staff' },
      },
    });
    await useAuthStore.getState().login('bob@example.com', 'pwd');
    const stored = JSON.parse(localStorage.getItem('user')!);
    expect(stored.email).toBe('bob@example.com');
    expect(stored.role).toBe('staff');
  });
});
