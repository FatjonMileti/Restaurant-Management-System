import React from 'react';
import { useReservations, useCancelReservation, useDeleteReservation, Reservation } from '../../api/queries';
import { useAuth } from '../../store/authStore';
import LoadingSpinner from '../LoadingSpinner';

const statusColorMap: Record<string, string> = {
  confirmed: 'bg-green-600',
  cancelled: 'bg-red-500',
  completed: 'bg-blue-500',
};

interface Props {
  onEditReservation?: (res: Reservation) => void;
}

export default function ReservationList({ onEditReservation }: Props) {
  const { user } = useAuth();
  const { data: reservations = [], error: fetchError, isLoading } = useReservations();
  const cancelReservation = useCancelReservation();
  const deleteReservation = useDeleteReservation();
  const [actionError, setActionError] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [tableFilter, setTableFilter] = React.useState('');

  const handleCancel = async (id: string) => {
    try {
      await cancelReservation.mutateAsync(id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to cancel reservation');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this reservation?')) return;
    try {
      await deleteReservation.mutateAsync(id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete reservation');
    }
  };

  const error = fetchError instanceof Error ? fetchError.message : actionError;

  const filteredReservations = reservations.filter((res: Reservation) => {
    const matchesStatus = statusFilter ? res.status === statusFilter : true;
    const matchesTable = tableFilter ? (res.tableNumber && String(res.tableNumber) === tableFilter) : true;
    return matchesStatus && matchesTable;
  });

  return (
    <>
      <div className="bg-blue-50 p-3 rounded-lg shadow-sm flex gap-3 mb-4 items-center border border-blue-200">
        <span className="text-sm font-semibold text-blue-800">Filter reservations:</span>
        <label className="text-sm font-medium">Status:</label>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="form-input-sm w-36">
          <option value="">All</option>
          <option value="confirmed">Confirmed</option>
          <option value="cancelled">Cancelled</option>
          <option value="completed">Completed</option>
        </select>
        <label className="text-sm font-medium ml-2">Table:</label>
        <input type="number" placeholder="Table #" value={tableFilter} onChange={(e) => setTableFilter(e.target.value)} className="form-input-sm w-28" />
        {(statusFilter || tableFilter) && (
          <button onClick={() => { setStatusFilter(''); setTableFilter(''); }} className="btn-secondary text-xs">Clear</button>
        )}
      </div>
      {isLoading && <LoadingSpinner />}
      {error && !isLoading && <p className="error-text">{error}</p>}
      {filteredReservations.length === 0 ? (
        <p className="text-gray-400 mt-5">No reservations yet.</p>
      ) : (
        filteredReservations.map((res: Reservation) => (
          <div key={res._id} className="card">
            <div className="flex justify-between">
              <div>
                <strong>{new Date(res.date).toLocaleDateString()} at {res.time}</strong>
                <p className="text-sm">{res.guests} guest(s) {res.tableNumber ? `| Table ${res.tableNumber}` : ''}</p>
                {res.specialRequests && <p className="text-gray-500 text-sm">Note: {res.specialRequests}</p>}
                {user?.role !== 'customer' && res.user && <p className="text-gray-400 text-xs">By: {res.user.name} ({res.user.email})</p>}
                <p className="text-gray-400 text-xs">{new Date(res.createdAt).toLocaleString()}</p>
              </div>
              <div className="text-right">
                <span className={`${statusColorMap[res.status] || 'bg-gray-500'} text-white px-3 py-1 rounded-full inline-block text-sm capitalize`}>
                  {res.status}
                </span>
                {(user?.role !== 'customer' || (user?.role === 'customer' && res.user?._id === user?._id)) && (
                  <div className="mt-2.5">
                    {res.status === 'confirmed' && (
                      <>
                        <button onClick={() => onEditReservation?.(res)} className="btn-blue-sm">Edit</button>
                        <button onClick={() => handleCancel(res._id)} className="btn-danger-sm ml-1">Cancel</button>
                      </>
                    )}
                    {(res.status === 'cancelled' || res.status === 'completed') && (
                      <button onClick={() => handleDelete(res._id)} className="btn-danger-sm">Delete</button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))
      )}
    </>
  );
}
