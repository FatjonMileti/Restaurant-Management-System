import React from 'react';
import { useReservations, useCancelReservation, Reservation } from '../../api/queries';
import { useAuth } from '../../store/authStore';

const statusColorMap: Record<string, string> = {
  confirmed: 'bg-green-600',
  cancelled: 'bg-red-500',
  completed: 'bg-blue-500',
};

export default function ReservationList() {
  const { user } = useAuth();
  const { data: reservations = [], error: fetchError } = useReservations();
  const cancelReservation = useCancelReservation();
  const [actionError, setActionError] = React.useState('');

  const handleCancel = async (id: string) => {
    try {
      await cancelReservation.mutateAsync(id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to cancel reservation');
    }
  };

  const error = fetchError instanceof Error ? fetchError.message : actionError;

  return (
    <>
      {error && <p className="error-text">{error}</p>}
      {reservations.length === 0 ? (
        <p className="text-gray-400 mt-5">No reservations yet.</p>
      ) : (
        reservations.map((res: Reservation) => (
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
                {res.status === 'confirmed' && (user?.role !== 'customer' || res.user?._id === user?._id) && (
                  <div className="mt-2.5">
                    <button onClick={() => handleCancel(res._id)} className="btn-danger-sm">Cancel</button>
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
