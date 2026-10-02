import { render, screen, fireEvent } from '@testing-library/react';
import Orders from '../Orders';
import * as queries from '../../api/queries';

let mockRole: string | undefined = 'admin';
jest.mock('../../store/authStore', () => ({
  useAuth: () => ({ user: mockRole ? { role: mockRole, _id: 'u1' } : null }),
}));

jest.mock('../../components/pages/OrderList', () => () => <div>Order list</div>);
jest.mock('../../components/pages/OrderForm', () => () => <div>Order form</div>);

const mockUseDeleteCompletedOrders = jest.spyOn(queries, 'useDeleteCompletedOrders');

describe('Orders page bulk delete', () => {
  beforeEach(() => {
    mockRole = 'admin';
    mockUseDeleteCompletedOrders.mockReturnValue({ mutateAsync: jest.fn() } as any);
  });
  afterEach(() => jest.clearAllMocks());

  it('shows Delete Completed for admin', () => {
    render(<Orders />);
    expect(screen.getByText('Delete Completed')).toBeInTheDocument();
    expect(screen.getByText('+ New Order')).toBeInTheDocument();
  });

  it('hides Delete Completed for staff but keeps New Order', () => {
    mockRole = 'staff';
    render(<Orders />);
    expect(screen.queryByText('Delete Completed')).not.toBeInTheDocument();
    expect(screen.getByText('+ New Order')).toBeInTheDocument();
  });

  it('hides both actions for customers', () => {
    mockRole = 'customer';
    render(<Orders />);
    expect(screen.queryByText('Delete Completed')).not.toBeInTheDocument();
    expect(screen.queryByText('+ New Order')).not.toBeInTheDocument();
  });

  it('asks for confirmation before bulk deleting', async () => {
    const mutateAsync = jest.fn().mockResolvedValue({ deleteCompletedOrders: 3 });
    mockUseDeleteCompletedOrders.mockReturnValue({ mutateAsync } as any);
    render(<Orders />);
    fireEvent.click(screen.getByText('Delete Completed'));
    expect(screen.getByText('Delete Completed Orders')).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Confirm'));
    expect(mutateAsync).toHaveBeenCalledWith();
    expect(await screen.findByText('Deleted 3 completed/cancelled orders.')).toBeInTheDocument();
  });

  it('does not bulk delete when the confirmation is cancelled', () => {
    const mutateAsync = jest.fn();
    mockUseDeleteCompletedOrders.mockReturnValue({ mutateAsync } as any);
    render(<Orders />);
    fireEvent.click(screen.getByText('Delete Completed'));
    fireEvent.click(screen.getByText('Cancel'));
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('shows an error when bulk delete fails', async () => {
    const mutateAsync = jest.fn().mockRejectedValue(new Error('Forbidden'));
    mockUseDeleteCompletedOrders.mockReturnValue({ mutateAsync } as any);
    render(<Orders />);
    fireEvent.click(screen.getByText('Delete Completed'));
    fireEvent.click(screen.getByText('Confirm'));
    expect(await screen.findByText('Forbidden')).toBeInTheDocument();
  });
});
