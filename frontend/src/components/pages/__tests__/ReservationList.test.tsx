import React from 'react';
import moment from 'moment';
import { render, screen, fireEvent, within } from '@testing-library/react';
import ReservationList from '../ReservationList';
import { useReservations } from '../../../api/queries';

jest.mock('../../../api/queries', () => ({
  useReservations: jest.fn(),
  useCancelReservation: jest.fn(),
  useDeleteReservation: jest.fn(),
  useUsers: jest.fn(),
  useRestaurantSettings: jest.fn(),
  useTables: jest.fn(),
}));

const mockQueries = jest.requireMock('../../../api/queries') as any;

let mockRole = 'staff';
jest.mock('../../../store/authStore', () => ({
  useAuth: () => ({ user: { _id: 'staff1', name: 'Staff', role: mockRole } }),
}));

const mockReservation = (overrides: any = {}) => ({
  _id: 'res1',
  user: { _id: 'u1', name: 'John', email: 'john@example.com' },
  date: '2024-01-15',
  time: '19:00',
  guests: 2,
  tableNumber: 1,
  status: 'confirmed',
  createdAt: moment('2024-01-01T12:00:00Z').toISOString(),
  ...overrides,
});

const reservations = [
  mockReservation({ _id: 'res-111111', tableNumber: 1 }),
  mockReservation({
    _id: 'res-222222',
    user: { _id: 'u2', name: 'Jane', email: 'jane@example.com' },
    tableNumber: 2,
    status: 'completed',
  }),
];

const allUsers = [
  { _id: 'u1', name: 'John', email: 'john@example.com', role: 'customer' },
  { _id: 'u2', name: 'Jane', email: 'jane@example.com', role: 'customer' },
  // Bob has no reservations — must still appear in the dropdown.
  { _id: 'u3', name: 'Bob', email: 'bob@example.com', role: 'customer' },
];

const setup = (data: any[] = reservations, users: any[] = allUsers) => {
  mockQueries.useReservations.mockReturnValue({ data, error: null, isLoading: false });
  mockQueries.useUsers.mockReturnValue({ data: users });
  mockQueries.useCancelReservation.mockReturnValue({ mutateAsync: jest.fn() });
  mockQueries.useDeleteReservation.mockReturnValue({ mutateAsync: jest.fn() });
  mockQueries.useRestaurantSettings.mockReturnValue({ data: { tableCount: 10 } });
  mockQueries.useTables.mockReturnValue({ data: [] });
};

describe('ReservationList user filter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRole = 'staff';
  });

  it('renders all users sorted by name, including users with no reservations', () => {
    setup();
    render(<ReservationList />);
    const select = screen.getByLabelText('Filter by user');
    const options = within(select).getAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual(['All users', 'Bob', 'Jane', 'John']);
  });

  it('shows empty state when selecting a user with no reservations', () => {
    setup();
    render(<ReservationList />);
    fireEvent.change(screen.getByLabelText('Filter by user'), { target: { value: 'u3' } });
    expect(screen.getByText('No reservations yet.')).toBeInTheDocument();
  });

  it('filters reservations by selected user', () => {
    setup();
    render(<ReservationList />);
    fireEvent.change(screen.getByLabelText('Filter by user'), { target: { value: 'u2' } });
    expect(screen.queryByText(/By: John/)).not.toBeInTheDocument();
    expect(screen.getByText(/By: Jane/)).toBeInTheDocument();
  });

  it('shows all reservations again after Clear', () => {
    setup();
    render(<ReservationList />);
    fireEvent.change(screen.getByLabelText('Filter by user'), { target: { value: 'u2' } });
    expect(screen.queryByText(/By: John/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Clear'));
    expect(screen.getByText(/By: John/)).toBeInTheDocument();
    expect(screen.getByText(/By: Jane/)).toBeInTheDocument();
  });

  it('hides user dropdown for customers', () => {
    mockRole = 'customer';
    setup();
    render(<ReservationList />);
    expect(screen.queryByLabelText('Filter by user')).not.toBeInTheDocument();
  });
});
