import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../store/authStore';
import { useCreateReservation, useUpdateReservation, Reservation } from '../../api/queries';

interface ReservationFormData {
  date: string;
  time: string;
  guests: number;
  specialRequests: string;
}

interface Props {
  showForm: boolean;
  setShowForm: (v: boolean) => void;
  editingReservation?: Reservation | null;
  onEditDone?: () => void;
}

export default function ReservationFormComponent({ showForm, setShowForm, editingReservation, onEditDone }: Props) {
  const createReservation = useCreateReservation();
  const updateReservation = useUpdateReservation();
  const [actionError, setActionError] = useState('');
  const { register, handleSubmit, reset } = useForm<ReservationFormData>({
    defaultValues: editingReservation ? {
      date: editingReservation.date ? new Date(editingReservation.date).toISOString().split('T')[0] : '',
      time: editingReservation.time || '',
      guests: editingReservation.guests || 2,
      specialRequests: editingReservation.specialRequests || '',
    } : { date: '', time: '', guests: 2, specialRequests: '' },
  });

  useEffect(() => {
    if (editingReservation) {
      reset({
        date: editingReservation.date ? new Date(editingReservation.date).toISOString().split('T')[0] : '',
        time: editingReservation.time || '',
        guests: editingReservation.guests || 2,
        specialRequests: editingReservation.specialRequests || '',
      });
    }
  }, [editingReservation, reset]);

  const onSubmit = async (data: ReservationFormData) => {
    try {
      if (editingReservation) {
        await updateReservation.mutateAsync({ id: editingReservation._id, data: { ...data, guests: Number(data.guests) } });
        onEditDone?.();
      } else {
        await createReservation.mutateAsync({ ...data, guests: Number(data.guests) });
        setShowForm(false);
      }
      reset();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : editingReservation ? 'Failed to edit reservation' : 'Failed to create reservation');
    }
  };

  if (!showForm && !editingReservation) return null;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="form-panel">
      <h3 className="text-lg font-semibold mb-3">{editingReservation ? 'Edit Reservation' : 'New Reservation'}</h3>
      <input type="date" {...register('date', { required: true })} className="form-input-sm" />
      <input type="time" {...register('time', { required: true })} className="form-input-sm" />
      <input type="number" min={1} {...register('guests', { required: true, valueAsNumber: true })} className="form-input-sm" />
      <textarea placeholder="Special requests" {...register('specialRequests')} className="form-input-sm" />
      {actionError && <p className="error-text">{actionError}</p>}
      <div className="flex gap-2 mt-2">
        <button type="submit" disabled={(editingReservation ? updateReservation.isPending : createReservation.isPending)} className="btn-primary">{editingReservation ? 'Save Changes' : 'Reserve'}</button>
        <button type="button" onClick={() => { if (editingReservation && onEditDone) { onEditDone(); } else { setShowForm(false); } }} className="btn-secondary">Cancel</button>
      </div>
    </form>
  );
}
