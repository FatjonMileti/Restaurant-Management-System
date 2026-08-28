import React from 'react';
import { useReservations, useCancelReservation, useDeleteReservation, Reservation } from '../../api/queries';
import { useAuth } from '../../store/authStore';
import LoadingSpinner from '../LoadingSpinner';
import FilterBar from '../FilterBar';
import StatusBadge from '../StatusBadge';
import ConfirmDialog from '../ConfirmDialog';

interface Props {
  onEditReservation?: (res: Reservation) => void;
}

export default function ReservationList({ onEditReservation }: Props) {
  const { user } = useAuth();
  const { data: reservations = [], error: fetchError, isLoading } = useReservations();
  const cancelReservation = useCancelReservation();
  const deleteReservation = useDeleteReservation();
  const [deleteConfirm, setDeleteConfirm] = React.useState<{ open: boolean; id?: string }>({ open: false });
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

  const handleDelete = async () => {
    if (deleteConfirm.id) {
      try { await deleteReservation.mutateAsync(deleteConfirm.id); } catch (err) { setActionError(err instanceof Error ? err.message : 'Failed to delete reservation'); }
    }
    setDeleteConfirm({ open: false });
  };

  const error = fetchError instanceof Error ? fetchError.message : actionError;

  const filteredReservations = reservations.filter((res: Reservation) => {
    const matchesStatus = statusFilter ? res.status === statusFilter : true;
    const matchesTable = tableFilter ? (res.tableNumber && String(res.tableNumber) === tableFilter) : true;
    return matchesStatus && matchesTable;
  });

  return (
    <>
      <FilterBar
        label="Filter reservations:"
        theme="blue"
        options={[{ value: '', label: 'All' }, { value: 'confirmed', label: 'Confirmed' }, { value: 'cancelled', label: 'Cancelled' }, { value: 'completed', label: 'Completed' }]}
        value={statusFilter}
        onChange={setStatusFilter}
        inputPlaceholder="Table #"
        inputValue={tableFilter}
        onInputChange={setTableFilter}
        inputType="number"
      />
      
      {error && !isLoading && <p className="error-text">{error}</p>}
      <ConfirmDialog open={deleteConfirm.open} title="Delete Reservation" message="Are you sure you want to delete this reservation?" onConfirm={handleDelete} onCancel={() => setDeleteConfirm({ open: false })} />
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
                <StatusBadge status={res.status} className="text-sm" />
                {(user?.role !== 'customer' || (user?.role === 'customer' && res.user?._id === user?._id)) && (
                  <div className="mt-2.5">
                    {res.status === 'confirmed' && (
                      <>
                        <button onClick={() => onEditReservation?.(res)} className="btn-blue-sm">Edit</button>
                        <button onClick={() => handleCancel(res._id)} className="btn-danger-sm ml-1">Cancel</button>
                      </>
                    )}
                    {(res.status === 'cancelled' || res.status === 'completed') && (
                      <button onClick={() => setDeleteConfirm({ open: true, id: res._id })} className="btn-danger-sm">Delete</button>
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
