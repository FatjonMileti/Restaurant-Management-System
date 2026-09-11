import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as gqlRequest from 'graphql-request';

jest.mock('graphql-request', () => ({
  request: jest.fn(),
  gql: jest.fn((s: TemplateStringsArray) => s.join('')),
}));

jest.mock('../../store/authStore', () => ({
  useAuthStore: { getState: () => ({ user: { token: 'test-token' } }) },
}));

import { useCategories, useMenu, useDashboardStats, useOrders, useReservations } from '../queries';

const createWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: any) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

describe('api queries', () => {
  afterEach(() => jest.clearAllMocks());

  it('useCategories maps id to _id', async () => {
    (gqlRequest.request as unknown as jest.Mock).mockResolvedValue({
      categories: [{ id: 'c1', name: 'Food' }],
    });
    const { result } = renderHook(() => useCategories(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0]._id).toBe('c1');
  });

  it('useMenu maps data', async () => {
    (gqlRequest.request as unknown as jest.Mock).mockResolvedValue({
      menuItems: [{ id: 'm1', name: 'Pizza', price: 10, category: 'Food', available: true }],
    });
    const { result } = renderHook(() => useMenu(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].name).toBe('Pizza');
  });

  it('useDashboardStats maps recentOrders', async () => {
    (gqlRequest.request as unknown as jest.Mock).mockResolvedValue({
      dashboardStats: {
        totalOrders: 5,
        pendingOrders: 1,
        preparingOrders: 1,
        completedOrders: 2,
        cancelledOrders: 1,
        totalReservations: 3,
        confirmedReservations: 2,
        completedReservations: 0,
        cancelledReservations: 1,
        totalMenuItems: 10,
        availableMenuItems: 9,
        totalUsers: 4,
        totalCategories: 2,
        totalTables: 10,
        busyTables: 2,
        freeTables: 8,
        totalRevenue: 200,
        todayOrders: 1,
        todayReservations: 0,
        recentOrders: [{ id: 'o1', totalAmount: 20, status: 'pending' }],
        ordersByStatus: [],
        reservationsByStatus: [],
      },
    });
    const { result } = renderHook(() => useDashboardStats(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.recentOrders[0]._id).toBe('o1');
  });

  it('useOrders maps nested user.id to user._id', async () => {
    (gqlRequest.request as unknown as jest.Mock).mockResolvedValue({
      orders: [
        {
          id: 'o1',
          user: { id: 'u1', name: 'John', email: 'john@example.com' },
          items: [],
          totalAmount: 10,
          status: 'pending',
        },
        { id: 'o2', user: null, items: [], totalAmount: 0, status: 'pending' },
      ],
    });
    const { result } = renderHook(() => useOrders(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0]._id).toBe('o1');
    expect(result.current.data?.[0].user?._id).toBe('u1');
    expect(result.current.data?.[0].user?.name).toBe('John');
    expect(result.current.data?.[1].user).toBeNull();
  });

  it('useReservations maps nested user.id to user._id', async () => {
    (gqlRequest.request as unknown as jest.Mock).mockResolvedValue({
      reservations: [
        {
          id: 'r1',
          user: { id: 'u2', name: 'Jane', email: 'jane@example.com' },
          date: '2024-01-15',
          time: '19:00',
          guests: 2,
          status: 'confirmed',
        },
      ],
    });
    const { result } = renderHook(() => useReservations(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0]._id).toBe('r1');
    expect(result.current.data?.[0].user?._id).toBe('u2');
  });

  it('sends Authorization header when token present', async () => {
    (gqlRequest.request as unknown as jest.Mock).mockResolvedValue({ categories: [] });
    const { result } = renderHook(() => useCategories(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gqlRequest.request).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      undefined,
      { Authorization: 'Bearer test-token' },
    );
  });

  it('passes an absolute URL to graphql-request (relative /graphql breaks its new URL() call)', async () => {
    const { resolveGraphQLEndpoint } = await import('../../graphql/queries');
    const url = resolveGraphQLEndpoint('/graphql');
    expect(url).toBe(`${window.location.origin}/graphql`);
    expect(() => new URL(url)).not.toThrow();
    expect(resolveGraphQLEndpoint('http://localhost:5000/graphql')).toBe(
      'http://localhost:5000/graphql',
    );
  });

  it('calls graphql-request with the resolved endpoint', async () => {
    const { resolveGraphQLEndpoint } = await import('../../graphql/queries');
    (gqlRequest.request as unknown as jest.Mock).mockResolvedValue({ categories: [] });
    const { result } = renderHook(() => useCategories(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gqlRequest.request).toHaveBeenCalledWith(
      resolveGraphQLEndpoint(),
      expect.anything(),
      undefined,
      { Authorization: 'Bearer test-token' },
    );
  });
});
