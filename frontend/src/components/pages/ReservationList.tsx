import React, { useState, useMemo, useCallback } from 'react';
import {
  useReservations,
  useCancelReservation,
  useDeleteReservation,
  useUpdateReservation,
  Reservation,
} from '../../api/queries';
import { useAuth } from '../../store/authStore';
import FilterBar from '../FilterBar';
import ConfirmDialog from '../ConfirmDialog';
import ReservationCard from './ReservationCard';

interface Props {
  onEditReservation?: (res: Reservation) => void;
}

export default function ReservationList({ onEditReservation }: Props) {
  const { user } = useAuth();
  const { data: reservations = [], error: fetchError, isLoading } = useReservations();
  const cancelReservation = useCancelReservation();
  const deleteReservation = useDeleteReservation();
  const updateReservation = useUpdateReservation();
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id?: string }>({ open: false });
  const [actionError, setActionError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [tableFilter, setTableFilter] = useState('');

  const isStaff = user?.role === 'admin' || user?.role === 'staff';

  const handleStatusChange = useCallback(
    async (id: string, newStatus: string) => {
      try {
        await updateReservation.mutateAsync({ id, data: { status: newStatus } as any });
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Failed to update reservation status');
      }
    },
    [updateReservation],
  );

  const handleCancel = useCallback(
    async (id: string) => {
      try {
        await cancelReservation.mutateAsync(id);
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Failed to cancel reservation');
      }
    },
    [cancelReservation],
  );

  const handleDelete = useCallback(async () => {
    if (deleteConfirm.id) {
      try {
        await deleteReservation.mutateAsync(deleteConfirm.id);
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Failed to delete reservation');
      }
    }
    setDeleteConfirm({ open: false });
  }, [deleteConfirm.id, deleteReservation]);

  const handleDeleteClick = useCallback((id: string) => setDeleteConfirm({ open: true, id }), []);

  const error = fetchError instanceof Error ? fetchError.message : actionError;

  const filteredReservations = useMemo(
    () =>
      reservations.filter((res: Reservation) => {
        const matchesStatus = statusFilter ? res.status === statusFilter : true;
        const matchesTable = tableFilter ? res.tableNumber && String(res.tableNumber) === tableFilter : true;
        return matchesStatus && matchesTable;
      }),
    [reservations, statusFilter, tableFilter],
  );

  return (
    <>
      <FilterBar
        label="Filter reservations:"
        theme="blue"
        options={[
          { value: '', label: 'All' },
          { value: 'confirmed', label: 'Confirmed' },
          { value: 'cancelled', label: 'Cancelled' },
          { value: 'completed', label: 'Completed' },
        ]}
        value={statusFilter}
        onChange={setStatusFilter}
        inputPlaceholder="Table #"
        inputValue={tableFilter}
        onInputChange={setTableFilter}
        inputType="number"
        useTableSelect
      />

      {error && !isLoading && <p className="error-text">{error}</p>}
      <ConfirmDialog
        open={deleteConfirm.open}
        title="Delete Reservation"
        message="Are you sure you want to delete this reservation?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm({ open: false })}
      />
      {filteredReservations.length === 0 ? (
        <p className="text-gray-400 mt-5">No reservations yet.</p>
      ) : (
        filteredReservations.map((res: Reservation) => (
          <ReservationCard
            key={res._id}
            reservation={res}
            isStaff={isStaff}
            isOwner={res.user?._id === user?._id}
            onEdit={onEditReservation}
            onCancel={handleCancel}
            onDelete={handleDeleteClick}
            onStatusChange={handleStatusChange}
          />
        ))
      )}
    </>
  );
}
