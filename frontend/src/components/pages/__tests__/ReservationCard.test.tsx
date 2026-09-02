import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ReservationCard from '../ReservationCard';
import { Reservation } from '../../../api/queries';

const mockReservation = (overrides: Partial<Reservation> = {}): Reservation => ({
  _id: 'res1',
  user: { _id: 'u1', name: 'John', email: 'john@example.com' },
  date: '2025-01-15',
  time: '19:00',
  guests: 4,
  tableNumber: 5,
  status: 'confirmed',
  specialRequests: 'Window seat',
  createdAt: new Date('2024-01-01T12:00:00Z').toISOString(),
  ...overrides,
});

describe('ReservationCard', () => {
  it('renders date, time, guests', () => {
    render(<ReservationCard reservation={mockReservation()} isStaff isOwner={false} onCancel={jest.fn()} onDelete={jest.fn()} onStatusChange={jest.fn()} />);
    expect(screen.getByText(/4 guest/)).toBeInTheDocument();
    expect(screen.getByText(/Table 5/)).toBeInTheDocument();
  });

  it('shows specialRequests', () => {
    render(<ReservationCard reservation={mockReservation()} isStaff isOwner onCancel={jest.fn()} onDelete={jest.fn()} onStatusChange={jest.fn()} />);
    expect(screen.getByText(/Window seat/)).toBeInTheDocument();
  });

  it('shows Edit/Cancel for confirmed', () => {
    render(
      <ReservationCard reservation={mockReservation({ status: 'confirmed' })} isStaff isOwner onEdit={jest.fn()} onCancel={jest.fn()} onDelete={jest.fn()} onStatusChange={jest.fn()} />,
    );
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('calls onCancel', () => {
    const onCancel = jest.fn();
    render(<ReservationCard reservation={mockReservation()} isStaff isOwner onCancel={onCancel} onDelete={jest.fn()} onStatusChange={jest.fn()} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledWith('res1');
  });

  it('shows Delete for cancelled', () => {
    const onDelete = jest.fn();
    render(
      <ReservationCard reservation={mockReservation({ status: 'cancelled' })} isStaff isOwner onCancel={jest.fn()} onDelete={onDelete} onStatusChange={jest.fn()} />,
    );
    expect(screen.getByText('Delete')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Delete'));
    expect(onDelete).toHaveBeenCalledWith('res1');
  });

  it('shows status select for staff', () => {
    render(<ReservationCard reservation={mockReservation()} isStaff isOwner={false} onCancel={jest.fn()} onDelete={jest.fn()} onStatusChange={jest.fn()} />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Confirmed')).toBeInTheDocument();
  });

  it('calls onStatusChange', () => {
    const onStatusChange = jest.fn();
    render(<ReservationCard reservation={mockReservation()} isStaff isOwner={false} onCancel={jest.fn()} onDelete={jest.fn()} onStatusChange={onStatusChange} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'completed' } });
    expect(onStatusChange).toHaveBeenCalledWith('res1', 'completed');
  });
});
