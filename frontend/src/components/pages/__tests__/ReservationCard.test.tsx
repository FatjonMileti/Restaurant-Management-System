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
    render(
      <ReservationCard
        reservation={mockReservation()}
        isStaff
        isOwner={false}
        onCancel={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(screen.getByText(/4 guest/)).toBeInTheDocument();
    expect(screen.getByText(/Table 5/)).toBeInTheDocument();
  });

  it('shows specialRequests', () => {
    render(
      <ReservationCard
        reservation={mockReservation()}
        isStaff
        isOwner
        onCancel={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(screen.getByText(/Window seat/)).toBeInTheDocument();
  });

  it('shows Cancel for confirmed and calls onEdit on card click', () => {
    const onEdit = jest.fn();
    render(
      <ReservationCard
        reservation={mockReservation({ status: 'confirmed' })}
        isStaff
        isOwner
        onEdit={onEdit}
        onCancel={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    fireEvent.click(screen.getByText(/4 guest/).closest('.card')!);
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ _id: 'res1' }));
  });

  it('calls onCancel', () => {
    const onCancel = jest.fn();
    render(
      <ReservationCard
        reservation={mockReservation()}
        isStaff
        isOwner
        onCancel={onCancel}
        onDelete={jest.fn()}
      />,
    );
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledWith('res1');
  });

  it('shows Delete for cancelled', () => {
    const onDelete = jest.fn();
    render(
      <ReservationCard
        reservation={mockReservation({ status: 'cancelled' })}
        isStaff
        isOwner
        onCancel={jest.fn()}
        onDelete={onDelete}
      />,
    );
    expect(screen.getByText('Delete')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Delete'));
    expect(onDelete).toHaveBeenCalledWith('res1');
  });
});
