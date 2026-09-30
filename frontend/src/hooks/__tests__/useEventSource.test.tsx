import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const listeners: Record<string, Array<(e: any) => void>> = {};
const esCalls: Array<string | undefined> = [];
let closeCalls = 0;

// NOTE: plain arrows, not jest.fn() — factory-created jest.fn()s lose
// their implementation in this setup (calls record, returns undefined),
// which silently disables the hook under test. Track calls manually.
jest.mock('../../eventSource', () => ({
  getEventSource: (id?: string) => {
    esCalls.push(id);
    return {
      addEventListener: (event: string, handler: (e: any) => void) => {
        (listeners[event] ??= []).push(handler);
      },
      removeEventListener: () => undefined,
    };
  },
  closeEventSource: () => {
    closeCalls += 1;
  },
}));

import { useEventSource } from '../useEventSource';
import { useAuthStore } from '../../store/authStore';

const testUser = (id: string) => ({
  _id: id,
  name: `User ${id}`,
  email: `${id}@test.com`,
  role: 'staff',
  token: `token-${id}`,
});

const fire = (event: string, data: any) => {
  const handlers = listeners[event] ?? [];
  expect(handlers.length).toBeGreaterThan(0);
  act(() => {
    handlers.forEach((h) => h({ data: JSON.stringify(data) }));
  });
};

const seedClient = (initial: Record<string, any>) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  Object.entries(initial).forEach(([k, v]) => qc.setQueryData([k], v));
  const wrapper = ({ children }: any) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return { qc, wrapper };
};

describe('useEventSource SSE cache updates', () => {
  beforeEach(() => {
    Object.keys(listeners).forEach((k) => delete listeners[k]);
    esCalls.length = 0;
    closeCalls = 0;
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    useAuthStore.setState({ user: testUser('u1') as any });
  });

  afterEach(() => {
    (console.log as jest.Mock).mockRestore?.();
    act(() => {
      useAuthStore.setState({ user: null });
    });
  });

  it('prepends a new order with normalized ids instead of refetching', () => {
    const { qc, wrapper } = seedClient({
      orders: [
        {
          _id: 'o1',
          status: 'pending',
          tableNumber: 1,
          items: [],
          totalAmount: 5,
          createdAt: '2024-01-01T12:00:00.000Z',
        },
      ],
    });
    const invalidateSpy = jest.spyOn(qc, 'invalidateQueries');
    renderHook(() => useEventSource(), { wrapper });
    fire('orders:changed', {
      order: {
        id: 'o2',
        user: { id: 'u1', name: 'John', email: 'john@example.com' },
        items: [],
        totalAmount: 10,
        status: 'pending',
        tableNumber: 2,
        createdAt: '2024-02-01T12:00:00.000Z',
      },
    });
    const cached = qc.getQueryData(['orders']) as any[];
    expect(cached).toHaveLength(2);
    expect(cached[0]._id).toBe('o2');
    expect(cached[0].user._id).toBe('u1');
    expect(cached[0].id).toBeUndefined();
    expect(cached[1]._id).toBe('o1');
    expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: ['orders'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['dashboardStats'] });
  });

  it('merges an order update in place', () => {
    const { qc, wrapper } = seedClient({
      orders: [
        { _id: 'o1', status: 'pending', tableNumber: 1, items: [], totalAmount: 5 },
        { _id: 'o2', status: 'pending', tableNumber: 2, items: [], totalAmount: 7 },
      ],
    });
    renderHook(() => useEventSource(), { wrapper });
    fire('orders:changed', { order: { id: 'o1', status: 'preparing', totalAmount: 5 } });
    const cached = qc.getQueryData(['orders']) as any[];
    expect(cached).toHaveLength(2);
    expect(cached[0].status).toBe('preparing');
    expect(cached[0].tableNumber).toBe(1);
    expect(cached[1].status).toBe('pending');
  });

  it('removes a deleted order and invalidates tables when it held a table', () => {
    const { qc, wrapper } = seedClient({
      orders: [{ _id: 'o1', status: 'pending', tableNumber: 3, items: [], totalAmount: 5 }],
    });
    const invalidateSpy = jest.spyOn(qc, 'invalidateQueries');
    renderHook(() => useEventSource(), { wrapper });
    fire('orders:changed', { order: { id: 'o1', deleted: true } });
    expect(qc.getQueryData(['orders'])).toEqual([]);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['tables'] });
  });

  it('falls back to refetch when the event carries no payload', () => {
    const { qc, wrapper } = seedClient({ orders: [] });
    const invalidateSpy = jest.spyOn(qc, 'invalidateQueries');
    renderHook(() => useEventSource(), { wrapper });
    fire('orders:changed', {});
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['orders'] });
  });

  it('normalizes and merges menu payloads', () => {
    const { qc, wrapper } = seedClient({
      menu: [{ _id: 'm1', name: 'Pizza', price: 10, category: 'Mains', available: true }],
    });
    renderHook(() => useEventSource(), { wrapper });
    fire('menu:changed', {
      menuItem: { id: 'm1', name: 'Pizza XL', price: 12, category: 'Mains', available: true },
    });
    const cached = qc.getQueryData(['menu']) as any[];
    expect(cached).toHaveLength(1);
    expect(cached[0]).toMatchObject({ _id: 'm1', name: 'Pizza XL', price: 12 });
    expect(cached[0].id).toBeUndefined();
  });

  it('replaces restaurant settings and invalidates tables', () => {
    const { qc, wrapper } = seedClient({
      restaurantSettings: { _id: 's1', name: 'Old', tableCount: 10 },
    });
    const invalidateSpy = jest.spyOn(qc, 'invalidateQueries');
    renderHook(() => useEventSource(), { wrapper });
    fire('settings:changed', { settings: { id: 's1', name: 'Bistro', tableCount: 12 } });
    expect(qc.getQueryData(['restaurantSettings'])).toMatchObject({
      _id: 's1',
      name: 'Bistro',
      tableCount: 12,
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['tables'] });
  });

  it('attaches listeners after login without a page refresh', () => {
    useAuthStore.setState({ user: null });
    const { qc, wrapper } = seedClient({ orders: [] });
    renderHook(() => useEventSource(), { wrapper });
    // Logged out at mount: no stream, no listeners.
    expect(esCalls).toEqual([]);
    expect(listeners['orders:changed'] ?? []).toHaveLength(0);

    // SPA login (no reload) must connect and attach.
    act(() => {
      useAuthStore.setState({ user: testUser('u2') as any });
    });
    expect(esCalls[esCalls.length - 1]).toBe('u2');
    fire('orders:changed', { order: { id: 'o9', status: 'pending' } });
    const cached = qc.getQueryData(['orders']) as any[];
    expect(cached).toHaveLength(1);
    expect(cached[0]._id).toBe('o9');
  });

  it('reconnects the stream when the user changes', () => {
    const { wrapper } = seedClient({});
    renderHook(() => useEventSource(), { wrapper });
    expect(esCalls).toEqual(['u1']);

    act(() => {
      useAuthStore.setState({ user: testUser('u2') as any });
    });
    expect(closeCalls).toBeGreaterThan(0);
    expect(esCalls[esCalls.length - 1]).toBe('u2');
  });

  it('closes the stream on logout', () => {
    const { wrapper } = seedClient({});
    renderHook(() => useEventSource(), { wrapper });
    expect(esCalls).toEqual(['u1']);

    act(() => {
      useAuthStore.setState({ user: null });
    });
    expect(closeCalls).toBeGreaterThan(0);
  });
});
