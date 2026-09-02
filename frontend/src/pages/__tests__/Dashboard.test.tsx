import React from 'react';
import { render, screen } from '@testing-library/react';
import Dashboard from '../Dashboard';
import * as queries from '../../api/queries';

jest.mock('../../store/authStore', () => ({
  useAuth: () => ({ user: { name: 'Admin', role: 'admin', _id: 'u1' } }),
}));

const mockUseDashboardStats = jest.spyOn(queries, 'useDashboardStats');

describe('Dashboard page', () => {
  afterEach(() => jest.clearAllMocks());

  it('shows loading spinner when loading', () => {
    mockUseDashboardStats.mockReturnValue({ data: undefined, isLoading: true, error: null } as any);
    const { container } = render(<Dashboard />);
    expect(container.querySelector('.spinner')).toBeInTheDocument();
  });

  it('shows error on network failure', () => {
    mockUseDashboardStats.mockReturnValue({ data: undefined, isLoading: false, error: new Error('Failed to fetch') } as any);
    render(<Dashboard />);
    expect(screen.getByText(/Network error/)).toBeInTheDocument();
  });

  it('renders stats when data present', () => {
    mockUseDashboardStats.mockReturnValue({
      data: {
        totalOrders: 10,
        pendingOrders: 3,
        preparingOrders: 2,
        completedOrders: 4,
        cancelledOrders: 1,
        totalReservations: 7,
        confirmedReservations: 5,
        completedReservations: 1,
        cancelledReservations: 1,
        totalMenuItems: 20,
        availableMenuItems: 18,
        totalUsers: 5,
        totalCategories: 3,
        totalTables: 10,
        busyTables: 3,
        freeTables: 7,
        totalRevenue: 1500,
        todayOrders: 2,
        todayReservations: 1,
        recentOrders: [
          { _id: 'o1', totalAmount: 25, status: 'pending', tableNumber: 1, createdAt: new Date().toISOString(), user: { name: 'John' }, items: [] },
        ],
        ordersByStatus: [{ status: 'pending', count: 3 }],
        reservationsByStatus: [{ status: 'confirmed', count: 5 }],
      },
      isLoading: false,
      error: null,
    } as any);
    render(<Dashboard />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText(/Welcome,/)).toBeInTheDocument();
    expect(screen.getByText('Total Orders')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('$1500.00')).toBeInTheDocument();
    expect(screen.getByText('Recent Orders')).toBeInTheDocument();
  });

  it('renders today summary', () => {
    mockUseDashboardStats.mockReturnValue({
      data: {
        totalOrders: 1,
        pendingOrders: 0,
        preparingOrders: 0,
        completedOrders: 1,
        cancelledOrders: 0,
        totalReservations: 1,
        confirmedReservations: 1,
        completedReservations: 0,
        cancelledReservations: 0,
        totalMenuItems: 5,
        availableMenuItems: 5,
        totalUsers: 2,
        totalCategories: 1,
        totalTables: 10,
        busyTables: 1,
        freeTables: 9,
        totalRevenue: 100,
        todayOrders: 5,
        todayReservations: 3,
        recentOrders: [],
        ordersByStatus: [],
        reservationsByStatus: [],
      },
      isLoading: false,
      error: null,
    } as any);
    render(<Dashboard />);
    expect(screen.getByText(/Today: 5 orders/)).toBeInTheDocument();
  });
});
