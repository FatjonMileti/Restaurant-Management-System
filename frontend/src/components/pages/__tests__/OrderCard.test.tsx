import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import OrderCard from '../OrderCard';
import { Order } from '../../../api/queries';

const mockOrder = (overrides: Partial<Order> = {}): Order => ({
  _id: 'abc123def456',
  user: { _id: 'u1', name: 'John', email: 'john@example.com' },
  items: [{ name: 'Pizza', quantity: 2, price: 10 }],
  totalAmount: 20,
  status: 'pending',
  tableNumber: 3,
  createdAt: new Date('2024-01-01T12:00:00Z').toISOString(),
  ...overrides,
});

describe('OrderCard', () => {
  it('renders order id and table', () => {
    render(
      <OrderCard
        order={mockOrder()}
        isStaffView
        isOwner={false}
        onEdit={jest.fn()}
        onUpdateStatus={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(screen.getByText(/Order #/)).toBeInTheDocument();
    expect(screen.getByText(/Table 3/)).toBeInTheDocument();
  });

  it('renders items and total', () => {
    render(
      <OrderCard
        order={mockOrder()}
        isStaffView
        isOwner={false}
        onEdit={jest.fn()}
        onUpdateStatus={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(screen.getByText(/Pizza x2/)).toBeInTheDocument();
    expect(screen.getByText(/Total: \$20\.00/)).toBeInTheDocument();
  });

  it('shows user info for staff view', () => {
    render(
      <OrderCard
        order={mockOrder()}
        isStaffView
        isOwner={false}
        onEdit={jest.fn()}
        onUpdateStatus={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(screen.getByText(/By: John/)).toBeInTheDocument();
  });

  it('hides user info for customer view', () => {
    render(
      <OrderCard
        order={mockOrder()}
        isStaffView={false}
        isOwner={false}
        onEdit={jest.fn()}
        onUpdateStatus={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(screen.queryByText(/By: John/)).not.toBeInTheDocument();
  });

  it('shows Edit and Start Preparing for pending', () => {
    render(
      <OrderCard
        order={mockOrder({ status: 'pending' })}
        isStaffView
        isOwner
        onEdit={jest.fn()}
        onUpdateStatus={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Start Preparing')).toBeInTheDocument();
  });

  it('calls onEdit when Edit clicked', () => {
    const onEdit = jest.fn();
    render(
      <OrderCard
        order={mockOrder()}
        isStaffView
        isOwner
        onEdit={onEdit}
        onUpdateStatus={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    fireEvent.click(screen.getByText('Edit'));
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ _id: 'abc123def456' }));
  });

  it('calls onUpdateStatus for preparing actions', () => {
    const onUpdateStatus = jest.fn();
    render(
      <OrderCard
        order={mockOrder({ status: 'preparing' })}
        isStaffView
        isOwner
        onEdit={jest.fn()}
        onUpdateStatus={onUpdateStatus}
        onDelete={jest.fn()}
      />,
    );
    fireEvent.click(screen.getByText('Mark Completed'));
    expect(onUpdateStatus).toHaveBeenCalledWith('abc123def456', 'completed');
  });

  it('shows Delete for completed', () => {
    const onDelete = jest.fn();
    render(
      <OrderCard
        order={mockOrder({ status: 'completed' })}
        isStaffView
        isOwner
        onEdit={jest.fn()}
        onUpdateStatus={jest.fn()}
        onDelete={onDelete}
      />,
    );
    expect(screen.getByText('Delete')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Delete'));
    expect(onDelete).toHaveBeenCalledWith('abc123def456');
  });

  it('hides actions if not staff and not owner', () => {
    render(
      <OrderCard
        order={mockOrder()}
        isStaffView={false}
        isOwner={false}
        onEdit={jest.fn()}
        onUpdateStatus={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
  });
});
