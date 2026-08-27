import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../store/authStore';
import { useCancelReservation, useCreateReservation, useReservations } from '../api/queries';

const statusColorMap: Record<string, string> = {
  confirmed: 'bg-green-600',
  cancelled: 'bg-red-500',
  completed: 'bg-blue-500',
};

interface ReservationForm {
  date: string;
  time: string;
  guests: number;
  specialRequests: string;
}

function Reservations() {
  const { user } = useAuth();
  const { data: reservations = [], error: fetchError } = useReservations();
  const createReservation = useCreateReservation();
  const cancelReservation = useCancelReservation();

  const [showForm, setShowForm] = useState(false);
  const [actionError, setActionError] = useState('');
  const { register, handleSubmit, reset } = useForm<ReservationForm>({
    defaultValues: { date: '', time: '', guests: 2, specialRequests: '' },
  });
  const error = fetchError instanceof Error ? fetchError.message : actionError;

  const onSubmit = async (data: ReservationForm) => {
    try {
      await createReservation.mutateAsync({ ...data, guests: Number(data.guests) });
      reset();
      setShowForm(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to create reservation');
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await cancelReservation.mutateAsync(id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to cancel reservation');
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Reservations</h2>
        <button onClick={() => setShowForm(!showForm)} className="btn-secondary">
          {showForm ? 'Cancel' : '+ New Reservation'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="form-panel">
          <input type="date" {...register('date', { required: true })} className="form-input-sm" />
          <input type="time" {...register('time', { required: true })} className="form-input-sm" />
          <input type="number" min={1} {...register('guests', { required: true, valueAsNumber: true })} className="form-input-sm" />
          <textarea placeholder="Special requests" {...register('specialRequests')} className="form-input-sm" />
          {actionError && <p className="error-text">{actionError}</p>}
          <button type="submit" disabled={createReservation.isPending} className="btn-primary">Reserve</button>
        </form>
      )}

      {error && <p className="error-text">{error}</p>}
      {reservations.length === 0 ? (
        <p className="text-gray-400 mt-5">No reservations yet.</p>
      ) : (
        reservations.map((res) => (
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
    </div>
  );
}

export default Reservations;
