import React from 'react';
import { render, screen } from '@testing-library/react';
import TableCard from '../TableCard';

describe('TableCard', () => {
  it('renders table number', () => {
    render(<TableCard table={{ number: 3, isBusy: false, busyType: null, occupiedBy: null }} />);
    expect(screen.getByText('Table 3')).toBeInTheDocument();
    expect(screen.getByText('Free')).toBeInTheDocument();
  });

  it('shows busy with order', () => {
    render(<TableCard table={{ number: 1, isBusy: true, busyType: 'order', occupiedBy: 'o1' }} order={{ _id: 'order123456', status: 'pending' }} />);
    expect(screen.getByText(/Busy \(order\)/)).toBeInTheDocument();
    expect(screen.getByText(/123456/)).toBeInTheDocument();
  });

  it('shows reservation details', () => {
    render(<TableCard table={{ number: 2, isBusy: true, busyType: 'reservation', occupiedBy: 'r1' }} reservation={{ guests: 4, time: '19:00' }} />);
    expect(screen.getByText(/Reservation — 4 guests/)).toBeInTheDocument();
    expect(screen.getByText(/at 19:00/)).toBeInTheDocument();
  });

  it('shows Occupied if busy but no details', () => {
    render(<TableCard table={{ number: 5, isBusy: true, busyType: 'order', occupiedBy: 'x' }} />);
    expect(screen.getByText('Occupied')).toBeInTheDocument();
  });

  it('applies busy/free classes', () => {
    const { container: busy } = render(<TableCard table={{ number: 1, isBusy: true, busyType: 'order', occupiedBy: 'o1' }} />);
    expect(busy.firstChild).toHaveClass('table-card-busy');
    const { container: free } = render(<TableCard table={{ number: 2, isBusy: false, busyType: null, occupiedBy: null }} />);
    expect(free.firstChild).toHaveClass('table-card-free');
  });
});
