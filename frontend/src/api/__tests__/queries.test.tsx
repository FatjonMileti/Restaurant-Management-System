import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as gqlRequest from 'graphql-request';

jest.mock('graphql-request', () => ({
  request: jest.fn(),
  gql: jest.fn((s: TemplateStringsArray) => s.join('')),
}));

jest.mock('../../store/authStore', () => ({
  useAuthStore: { getState: () => ({ user: { token: 'test-token' } }) },
  useAuth: () => ({
    user: {
      _id: 'u1',
      name: 'John',
      email: 'john@example.com',
      role: 'customer',
      token: 'test-token',
    },
  }),
}));

import {
  useCategories,
  useMenu,
  useDashboardStats,
  useOrders,
  useReservations,
  useCreateOrder,
  useCreateCategory,
  useUpdateOrder,
  useUpdateOrderStatus,
  useUpdateUser,
  useAdminUpdateUserPassword,
} from '../queries';

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

  it('useCreateOrder prepends the new order at the top of the list', async () => {
    (gqlRequest.request as unknown as jest.Mock).mockResolvedValue({
      createOrder: {
        id: 'new1',
        items: [],
        totalAmount: 10,
        status: 'pending',
        tableNumber: 3,
        createdAt: '2024-02-01T12:00:00.000Z',
      },
    });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    qc.setQueryData(
      ['orders'],
      [
        {
          _id: 'old1',
          items: [],
          totalAmount: 5,
          status: 'pending',
          tableNumber: 1,
          createdAt: '2024-01-01T12:00:00.000Z',
        },
      ],
    );
    const wrapper = ({ children }: any) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useCreateOrder(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({
        items: [{ menuItem: 'm1', name: 'Pizza', price: 10, quantity: 1 }],
        tableNumber: 3,
      });
    });
    const cached = qc.getQueryData(['orders']) as any[];
    expect(cached).toHaveLength(2);
    expect(cached[0]._id).toBe('new1');
    expect(cached[0].user?._id).toBe('u1');
    expect(cached[1]._id).toBe('old1');
  });

  it('useCreateOrder does not duplicate when the SSE upsert landed first', async () => {
    (gqlRequest.request as unknown as jest.Mock).mockResolvedValue({
      createOrder: {
        id: 'new1',
        items: [],
        totalAmount: 10,
        status: 'pending',
        tableNumber: 3,
        createdAt: '2024-02-01T12:00:00.000Z',
      },
    });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    // As stored by the useEventSource upsert: normalized, top of the list.
    qc.setQueryData(
      ['orders'],
      [
        {
          _id: 'new1',
          user: { _id: 'u1', name: 'John', email: 'john@example.com' },
          items: [],
          totalAmount: 10,
          status: 'pending',
          tableNumber: 3,
          createdAt: '2024-02-01T12:00:00.000Z',
        },
      ],
    );
    const wrapper = ({ children }: any) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useCreateOrder(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({
        items: [{ menuItem: 'm1', name: 'Pizza', price: 10, quantity: 1 }],
        tableNumber: 3,
      });
    });
    const cached = qc.getQueryData(['orders']) as any[];
    expect(cached).toHaveLength(1);
    expect(cached[0]._id).toBe('new1');
  });

  it('useCreateCategory does not duplicate when the SSE upsert landed first', async () => {
    (gqlRequest.request as unknown as jest.Mock).mockResolvedValue({
      createCategory: { id: 'c9', name: 'Drinks' },
    });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    qc.setQueryData(['categories'], [{ _id: 'c9', name: 'Drinks', id: undefined }]);
    const wrapper = ({ children }: any) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useCreateCategory(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ name: 'Drinks' });
    });
    const cached = qc.getQueryData(['categories']) as any[];
    expect(cached).toHaveLength(1);
    expect(cached[0]._id).toBe('c9');
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

  describe('useUpdateOrder optimistic cache', () => {
    const seedOrder = {
      _id: 'o1',
      user: { _id: 'u1', name: 'John', email: 'john@example.com' },
      items: [{ menuItem: { id: 'm1', name: 'Pizza' }, name: 'Pizza', price: 10, quantity: 1 }],
      totalAmount: 10,
      status: 'pending',
      tableNumber: 1,
      createdAt: '2024-01-01T12:00:00.000Z',
    };
    const serverOrder = {
      id: 'o1',
      user: { id: 'u1', name: 'John', email: 'john@example.com' },
      items: [],
      totalAmount: 10,
      status: 'pending',
      tableNumber: 1,
      createdAt: '2024-01-01T12:00:00.000Z',
    };

    const seedClient = () => {
      const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      qc.setQueryData(['orders'], [{ ...seedOrder }]);
      const wrapper = ({ children }: any) => (
        <QueryClientProvider client={qc}>{children}</QueryClientProvider>
      );
      return { qc, wrapper };
    };

    it('applies the edit to the cached order before the server responds', async () => {
      let resolveMutation!: (v: any) => void;
      (gqlRequest.request as unknown as jest.Mock)
        .mockImplementationOnce(
          () =>
            new Promise((res) => {
              resolveMutation = res;
            }),
        )
        .mockResolvedValue({ orders: [serverOrder] });
      const { qc, wrapper } = seedClient();
      const { result } = renderHook(() => useUpdateOrder(), { wrapper });
      await act(async () => {
        result.current.mutate({
          id: 'o1',
          data: {
            tableNumber: 5,
            items: [{ menuItem: 'm1', name: 'Pizza', price: 10, quantity: 2 }],
          },
        });
      });
      // Optimistic state: merged fields + recomputed total, server not yet responded.
      const cached = qc.getQueryData(['orders']) as any[];
      expect(cached[0].tableNumber).toBe(5);
      expect(cached[0].totalAmount).toBe(20);
      expect(cached[0].items).toHaveLength(1);
      await act(async () => {
        resolveMutation({ updateOrder: { id: 'o1', totalAmount: 20, status: 'pending' } });
      });
    });

    it('rolls back the optimistic edit when the server rejects', async () => {
      (gqlRequest.request as unknown as jest.Mock)
        .mockRejectedValueOnce(new Error('Table is busy'))
        .mockResolvedValue({ orders: [serverOrder] });
      const { qc, wrapper } = seedClient();
      const { result } = renderHook(() => useUpdateOrder(), { wrapper });
      await act(async () => {
        await expect(
          result.current.mutateAsync({ id: 'o1', data: { tableNumber: 9 } }),
        ).rejects.toThrow('Table is busy');
      });
      const cached = qc.getQueryData(['orders']) as any[];
      expect(cached[0].tableNumber).toBe(1);
      expect(cached[0].totalAmount).toBe(10);
    });

    it('skips tables invalidation when the table number is unchanged', async () => {
      (gqlRequest.request as unknown as jest.Mock).mockResolvedValue({
        updateOrder: { id: 'o1', totalAmount: 20, status: 'pending' },
        orders: [serverOrder],
      });
      const { qc, wrapper } = seedClient();
      const invalidateSpy = jest.spyOn(qc, 'invalidateQueries');
      const { result } = renderHook(() => useUpdateOrder(), { wrapper });
      await act(async () => {
        await result.current.mutateAsync({
          id: 'o1',
          data: {
            tableNumber: 1,
            items: [{ menuItem: 'm1', name: 'Pizza', price: 10, quantity: 2 }],
          },
        });
      });
      expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: ['tables'] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['dashboardStats'] });
    });

    it('invalidates tables when the table number changes', async () => {
      (gqlRequest.request as unknown as jest.Mock).mockResolvedValue({
        updateOrder: { id: 'o1', totalAmount: 10, status: 'pending' },
        orders: [serverOrder],
      });
      const { qc, wrapper } = seedClient();
      const invalidateSpy = jest.spyOn(qc, 'invalidateQueries');
      const { result } = renderHook(() => useUpdateOrder(), { wrapper });
      await act(async () => {
        await result.current.mutateAsync({ id: 'o1', data: { tableNumber: 5 } });
      });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['tables'] });
    });
  });

  describe('useUpdateOrderStatus optimistic cache', () => {
    const seedOrder = {
      _id: 'o1',
      user: { _id: 'u1', name: 'John', email: 'john@example.com' },
      items: [{ menuItem: { id: 'm1', name: 'Pizza' }, name: 'Pizza', price: 10, quantity: 1 }],
      totalAmount: 10,
      status: 'pending',
      tableNumber: 1,
      createdAt: '2024-01-01T12:00:00.000Z',
    };
    const serverOrder = {
      id: 'o1',
      user: { id: 'u1', name: 'John', email: 'john@example.com' },
      items: [],
      totalAmount: 10,
      status: 'pending',
      tableNumber: 1,
      createdAt: '2024-01-01T12:00:00.000Z',
    };

    const seedClient = () => {
      const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      qc.setQueryData(['orders'], [{ ...seedOrder }]);
      const wrapper = ({ children }: any) => (
        <QueryClientProvider client={qc}>{children}</QueryClientProvider>
      );
      return { qc, wrapper };
    };

    it('applies the status change to the cached order before the server responds', async () => {
      let resolveMutation!: (v: any) => void;
      (gqlRequest.request as unknown as jest.Mock)
        .mockImplementationOnce(
          () =>
            new Promise((res) => {
              resolveMutation = res;
            }),
        )
        .mockResolvedValue({ orders: [serverOrder] });
      const { qc, wrapper } = seedClient();
      const { result } = renderHook(() => useUpdateOrderStatus(), { wrapper });
      await act(async () => {
        result.current.mutate({ id: 'o1', status: 'preparing' });
      });
      // Optimistic state, server not yet responded.
      expect((qc.getQueryData(['orders']) as any[])[0].status).toBe('preparing');
      await act(async () => {
        resolveMutation({ updateOrderStatus: { id: 'o1', status: 'preparing' } });
      });
    });

    it('rolls back the status change when the server rejects', async () => {
      (gqlRequest.request as unknown as jest.Mock)
        .mockRejectedValueOnce(new Error('Forbidden'))
        .mockResolvedValue({ orders: [serverOrder] });
      const { qc, wrapper } = seedClient();
      const { result } = renderHook(() => useUpdateOrderStatus(), { wrapper });
      await act(async () => {
        await expect(result.current.mutateAsync({ id: 'o1', status: 'completed' })).rejects.toThrow(
          'Forbidden',
        );
      });
      expect((qc.getQueryData(['orders']) as any[])[0].status).toBe('pending');
    });
  });

  describe('useUpdateUser / useAdminUpdateUserPassword', () => {
    const seedUsers = () => {
      const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      qc.setQueryData(
        ['users'],
        [{ _id: 'u1', name: 'John', email: 'john@example.com', role: 'customer', phone: '111' }],
      );
      const wrapper = ({ children }: any) => (
        <QueryClientProvider client={qc}>{children}</QueryClientProvider>
      );
      return { qc, wrapper };
    };

    it('merges updated fields into the cached user', async () => {
      (gqlRequest.request as unknown as jest.Mock).mockResolvedValue({
        updateUser: {
          id: 'u1',
          name: 'Johnny',
          email: 'johnny@example.com',
          role: 'staff',
          phone: '222',
        },
      });
      const { qc, wrapper } = seedUsers();
      const { result } = renderHook(() => useUpdateUser(), { wrapper });
      await act(async () => {
        await result.current.mutateAsync({ id: 'u1', data: { name: 'Johnny', role: 'staff' } });
      });
      const cached = qc.getQueryData(['users']) as any[];
      expect(cached).toHaveLength(1);
      expect(cached[0]._id).toBe('u1');
      expect(cached[0].name).toBe('Johnny');
      expect(cached[0].role).toBe('staff');
      expect(gqlRequest.request).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        { id: 'u1', name: 'Johnny', role: 'staff' },
        { Authorization: 'Bearer test-token' },
      );
    });

    it('sends the new password to adminUpdateUserPassword', async () => {
      (gqlRequest.request as unknown as jest.Mock).mockResolvedValue({
        adminUpdateUserPassword: 'Password updated',
      });
      const { result } = renderHook(() => useAdminUpdateUserPassword(), {
        wrapper: createWrapper(),
      });
      let res: any;
      await act(async () => {
        res = await result.current.mutateAsync({ id: 'u1', password: 'newsecret123' });
      });
      expect(res.adminUpdateUserPassword).toBe('Password updated');
      expect(gqlRequest.request).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        { id: 'u1', password: 'newsecret123' },
        { Authorization: 'Bearer test-token' },
      );
    });
  });
});
