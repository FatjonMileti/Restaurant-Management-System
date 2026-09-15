import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const listeners: Record<string, Array<(e: any) => void>> = {};

jest.mock('../../eventSource', () => ({
  getEventSource: () => ({
    addEventListener: jest.fn((event: string, handler: (e: any) => void) => {
      (listeners[event] ??= []).push(handler);
    }),
    removeEventListener: jest.fn(),
  }),
}));

import { useEventSource } from '../useEventSource';

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
});
