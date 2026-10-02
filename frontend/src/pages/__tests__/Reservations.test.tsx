import { render, screen, fireEvent } from '@testing-library/react';
import Reservations from '../Reservations';
import * as queries from '../../api/queries';

let mockRole: string | undefined = 'admin';
jest.mock('../../store/authStore', () => ({
  useAuth: () => ({ user: mockRole ? { role: mockRole, _id: 'u1' } : null }),
}));

jest.mock('../../components/pages/ReservationList', () => () => <div>Reservation list</div>);
jest.mock('../../components/pages/ReservationForm', () => () => <div>Reservation form</div>);

const mockUseDeleteCompletedReservations = jest.spyOn(queries, 'useDeleteCompletedReservations');

describe('Reservations page bulk delete', () => {
  beforeEach(() => {
    mockRole = 'admin';
    mockUseDeleteCompletedReservations.mockReturnValue({ mutateAsync: jest.fn() } as any);
  });
  afterEach(() => jest.clearAllMocks());

  it('shows Delete Completed for admin', () => {
    render(<Reservations />);
    expect(screen.getByText('Delete Completed')).toBeInTheDocument();
    expect(screen.getByText('+ New Reservation')).toBeInTheDocument();
  });

  it('hides Delete Completed for staff but keeps New Reservation', () => {
    mockRole = 'staff';
    render(<Reservations />);
    expect(screen.queryByText('Delete Completed')).not.toBeInTheDocument();
    expect(screen.getByText('+ New Reservation')).toBeInTheDocument();
  });

  it('asks for confirmation before bulk deleting', async () => {
    const mutateAsync = jest.fn().mockResolvedValue({ deleteCompletedReservations: 2 });
    mockUseDeleteCompletedReservations.mockReturnValue({ mutateAsync } as any);
    render(<Reservations />);
    fireEvent.click(screen.getByText('Delete Completed'));
    expect(screen.getByText('Delete Completed Reservations')).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Confirm'));
    expect(mutateAsync).toHaveBeenCalledWith();
    expect(
      await screen.findByText('Deleted 2 completed/cancelled reservations.'),
    ).toBeInTheDocument();
  });

  it('does not bulk delete when the confirmation is cancelled', () => {
    const mutateAsync = jest.fn();
    mockUseDeleteCompletedReservations.mockReturnValue({ mutateAsync } as any);
    render(<Reservations />);
    fireEvent.click(screen.getByText('Delete Completed'));
    fireEvent.click(screen.getByText('Cancel'));
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('shows an error when bulk delete fails', async () => {
    const mutateAsync = jest.fn().mockRejectedValue(new Error('Forbidden'));
    mockUseDeleteCompletedReservations.mockReturnValue({ mutateAsync } as any);
    render(<Reservations />);
    fireEvent.click(screen.getByText('Delete Completed'));
    fireEvent.click(screen.getByText('Confirm'));
    expect(await screen.findByText('Forbidden')).toBeInTheDocument();
  });
});
