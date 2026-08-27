import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../store/authStore';
import { useCreateReservation } from '../../api/queries';

interface ReservationFormData {
  date: string;
  time: string;
  guests: number;
  specialRequests: string;
}

interface Props {
  showForm: boolean;
  setShowForm: (v: boolean) => void;
}

export default function ReservationFormComponent({ showForm, setShowForm }: Props) {
  const createReservation = useCreateReservation();
  const [actionError, setActionError] = useState('');
  const { register, handleSubmit, reset } = useForm<ReservationFormData>({
    defaultValues: { date: '', time: '', guests: 2, specialRequests: '' },
  });

  const onSubmit = async (data: ReservationFormData) => {
    try {
      await createReservation.mutateAsync({ ...data, guests: Number(data.guests) });
      reset();
      setShowForm(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to create reservation');
    }
  };

  return showForm ? (
    <form onSubmit={handleSubmit(onSubmit)} className="form-panel">
      <input type="date" {...register('date', { required: true })} className="form-input-sm" />
      <input type="time" {...register('time', { required: true })} className="form-input-sm" />
      <input type="number" min={1} {...register('guests', { required: true, valueAsNumber: true })} className="form-input-sm" />
      <textarea placeholder="Special requests" {...register('specialRequests')} className="form-input-sm" />
      {actionError && <p className="error-text">{actionError}</p>}
      <button type="submit" disabled={createReservation.isPending} className="btn-primary">Reserve</button>
    </form>
  ) : null;
}
