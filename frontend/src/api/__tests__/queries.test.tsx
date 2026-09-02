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

import { useCategories, useMenu, useDashboardStats } from '../queries';

const createWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: any) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

describe('api queries', () => {
  afterEach(() => jest.clearAllMocks());

  it('useCategories maps id to _id', async () => {
    (gqlRequest.request as unknown as jest.Mock).mockResolvedValue({ categories: [{ id: 'c1', name: 'Food' }] });
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

  it('sends Authorization header when token present', async () => {
    (gqlRequest.request as unknown as jest.Mock).mockResolvedValue({ categories: [] });
    const { result } = renderHook(() => useCategories(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gqlRequest.request).toHaveBeenCalledWith(expect.anything(), expect.anything(), undefined, { Authorization: 'Bearer test-token' });
  });
});
