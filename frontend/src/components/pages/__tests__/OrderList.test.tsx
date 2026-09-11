import React from 'react';
import moment from 'moment';
import { render, screen, fireEvent, within } from '@testing-library/react';
import OrderList from '../OrderList';
import { useOrders, useUpdateOrderStatus, useDeleteOrder } from '../../../api/queries';

jest.mock('../../../api/queries', () => ({
  useOrders: jest.fn(),
  useUpdateOrderStatus: jest.fn(),
  useDeleteOrder: jest.fn(),
  useUsers: jest.fn(),
  useRestaurantSettings: jest.fn(),
  useTables: jest.fn(),
}));

const mockQueries = jest.requireMock('../../../api/queries') as any;

let mockRole = 'staff';
jest.mock('../../../store/authStore', () => ({
  useAuth: () => ({ user: { _id: 'staff1', name: 'Staff', role: mockRole } }),
}));

const mockOrder = (overrides: any = {}) => ({
  _id: 'order1',
  user: { _id: 'u1', name: 'John', email: 'john@example.com' },
  items: [{ name: 'Pizza', quantity: 1, price: 10 }],
  totalAmount: 10,
  status: 'pending',
  tableNumber: 1,
  createdAt: moment('2024-01-01T12:00:00Z').toISOString(),
  ...overrides,
});

const orders = [
  mockOrder({ _id: 'order-111111', tableNumber: 1 }),
  mockOrder({
    _id: 'order-222222',
    user: { _id: 'u2', name: 'Jane', email: 'jane@example.com' },
    tableNumber: 2,
    status: 'completed',
  }),
];

const allUsers = [
  { _id: 'u1', name: 'John', email: 'john@example.com', role: 'customer' },
  { _id: 'u2', name: 'Jane', email: 'jane@example.com', role: 'customer' },
  // Bob has no orders — must still appear in the dropdown.
  { _id: 'u3', name: 'Bob', email: 'bob@example.com', role: 'customer' },
];

const setup = (data: any[] = orders, users: any[] = allUsers) => {
  mockQueries.useOrders.mockReturnValue({ data, error: null });
  mockQueries.useUsers.mockReturnValue({ data: users });
  mockQueries.useUpdateOrderStatus.mockReturnValue({ mutateAsync: jest.fn() });
  mockQueries.useDeleteOrder.mockReturnValue({ mutateAsync: jest.fn() });
  mockQueries.useRestaurantSettings.mockReturnValue({ data: { tableCount: 10 } });
  mockQueries.useTables.mockReturnValue({ data: [] });
};

describe('OrderList user filter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRole = 'staff';
  });

  it('renders all users sorted by name, including users with no orders', () => {
    setup();
    render(<OrderList onEditOrder={jest.fn()} />);
    const select = screen.getByLabelText('Filter by user');
    const options = within(select).getAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual(['All users', 'Bob', 'Jane', 'John']);
  });

  it('shows no orders when selecting a user with no orders', () => {
    setup();
    render(<OrderList onEditOrder={jest.fn()} />);
    fireEvent.change(screen.getByLabelText('Filter by user'), { target: { value: 'u3' } });
    expect(screen.queryByText(/By:/)).not.toBeInTheDocument();
  });

  it('falls back to users seen in orders when the users list is unavailable', () => {
    setup(orders, []);
    render(<OrderList onEditOrder={jest.fn()} />);
    const select = screen.getByLabelText('Filter by user');
    const options = within(select).getAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual(['All users', 'John', 'Jane']);
  });

  it('filters orders by selected user', () => {
    setup();
    render(<OrderList onEditOrder={jest.fn()} />);
    fireEvent.change(screen.getByLabelText('Filter by user'), { target: { value: 'u2' } });
    expect(screen.queryByText(/By: John/)).not.toBeInTheDocument();
    expect(screen.getByText(/By: Jane/)).toBeInTheDocument();
  });

  it('shows all orders again after Clear', () => {
    setup();
    render(<OrderList onEditOrder={jest.fn()} />);
    fireEvent.change(screen.getByLabelText('Filter by user'), { target: { value: 'u2' } });
    expect(screen.queryByText(/By: John/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Clear'));
    expect(screen.getByText(/By: John/)).toBeInTheDocument();
    expect(screen.getByText(/By: Jane/)).toBeInTheDocument();
  });

  it('hides user dropdown for customers', () => {
    mockRole = 'customer';
    setup();
    render(<OrderList onEditOrder={jest.fn()} />);
    expect(screen.queryByLabelText('Filter by user')).not.toBeInTheDocument();
  });

  it('ignores orders without a user in dropdown options', () => {
    setup([...orders, mockOrder({ _id: 'order-333333', user: undefined, tableNumber: 3 })], []);
    render(<OrderList onEditOrder={jest.fn()} />);
    const select = screen.getByLabelText('Filter by user');
    expect(within(select).getAllByRole('option')).toHaveLength(3);
  });
});
