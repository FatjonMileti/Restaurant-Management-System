import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../../store/authStore';
import { useCreateReservation, useUpdateReservation, Reservation } from '../../api/queries';
import TableSelect from '../TableSelect';
import { reservationSchema, ReservationFormData } from '../../validation/schemas';

interface Props {
  showForm: boolean;
  setShowForm: (v: boolean) => void;
  editingReservation?: Reservation | null;
  onEditDone?: () => void;
}

export default function ReservationFormComponent({
  showForm,
  setShowForm,
  editingReservation,
  onEditDone,
}: Props) {
  const { user } = useAuth();
  const isStaff = user?.role === 'admin' || user?.role === 'staff';
  const createReservation = useCreateReservation();
  const updateReservation = useUpdateReservation();
  const [actionError, setActionError] = useState('');
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ReservationFormData>({
    resolver: zodResolver(reservationSchema),
    defaultValues: editingReservation
      ? {
          date: editingReservation.date
            ? new Date(editingReservation.date).toISOString().split('T')[0]
            : '',
          time: editingReservation.time || '',
          guests: editingReservation.guests || 2,
          tableNumber: editingReservation.tableNumber || undefined,
          specialRequests: editingReservation.specialRequests || '',
          status: (editingReservation.status as ReservationFormData['status']) || 'confirmed',
        }
      : {
          date: '',
          time: '',
          guests: 2,
          tableNumber: undefined,
          specialRequests: '',
          status: 'confirmed',
        },
  });
  const selectedTable = watch('tableNumber');

  useEffect(() => {
    setActionError('');
    if (editingReservation) {
      reset({
        date: editingReservation.date
          ? new Date(editingReservation.date).toISOString().split('T')[0]
          : '',
        time: editingReservation.time || '',
        guests: editingReservation.guests || 2,
        tableNumber: editingReservation.tableNumber || undefined,
        specialRequests: editingReservation.specialRequests || '',
        status: (editingReservation.status as ReservationFormData['status']) || 'confirmed',
      });
    } else {
      reset({
        date: '',
        time: '',
        guests: 2,
        tableNumber: undefined,
        specialRequests: '',
        status: 'confirmed',
      });
    }
  }, [editingReservation, reset]);

  const onSubmit = async (data: ReservationFormData) => {
    try {
      const payload = {
        ...data,
        guests: Number(data.guests),
        tableNumber: data.tableNumber ? Number(data.tableNumber) : undefined,
      };
      if (editingReservation) {
        await updateReservation.mutateAsync({ id: editingReservation._id, data: payload });
        onEditDone?.();
      } else {
        await createReservation.mutateAsync(payload);
        setShowForm(false);
      }
      reset();
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : editingReservation
            ? 'Failed to edit reservation'
            : 'Failed to create reservation',
      );
    }
  };

  if (!showForm && !editingReservation) return null;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="form-panel">
      <h3 className="text-lg font-semibold mb-3">
        {editingReservation ? 'Edit Reservation' : 'New Reservation'}
      </h3>
      <label className="form-label">Date</label>
      <input type="date" {...register('date')} className="form-input-sm" />
      {errors.date && <p className="error-text text-sm">{errors.date.message}</p>}
      <label className="form-label">Time</label>
      <input type="time" {...register('time')} className="form-input-sm" />
      {errors.time && <p className="error-text text-sm">{errors.time.message}</p>}
      <label className="form-label">Guests</label>
      <input
        type="number"
        min={1}
        {...register('guests', { valueAsNumber: true })}
        className="form-input-sm"
      />
      {errors.guests && <p className="error-text text-sm">{errors.guests.message}</p>}
      <div className="mb-2.5">
        <label className="form-label">Table</label>
        <TableSelect
          value={selectedTable ? String(selectedTable) : ''}
          onChange={(v) => setValue('tableNumber', v ? Number(v) : (undefined as any))}
          placeholder="Select table"
          className="form-input-sm !mb-0"
          showBusyLabel
        />
      </div>
      <label className="form-label">Special Requests</label>
      <textarea
        placeholder="Special requests"
        {...register('specialRequests')}
        className="form-input-sm"
      />
      {isStaff && editingReservation && (
        <>
          <label className="form-label">Status</label>
          <select {...register('status')} className="form-input-sm">
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </>
      )}
      {actionError && <p className="error-text">{actionError}</p>}
      <div className="flex gap-2 mt-2">
        <button
          type="submit"
          disabled={editingReservation ? updateReservation.isPending : createReservation.isPending}
          className="btn-primary"
        >
          {editingReservation ? 'Save Changes' : 'Reserve'}
        </button>
        <button
          type="button"
          onClick={() => {
            if (editingReservation && onEditDone) {
              onEditDone();
            } else {
              setShowForm(false);
            }
          }}
          className="btn-secondary"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
