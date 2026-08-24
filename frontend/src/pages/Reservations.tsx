import React, { useState } from 'react';
import { useAuth } from '../store/authStore';
import { useCancelReservation, useCreateReservation, useReservations } from '../api/queries';

const statusColorMap: Record<string, string> = {
  confirmed: 'bg-green-600',
  cancelled: 'bg-red-500',
  completed: 'bg-blue-500',
};

function Reservations() {
  const { user } = useAuth();
  const { data: reservations = [], error: fetchError } = useReservations();
  const createReservation = useCreateReservation();
  const cancelReservation = useCancelReservation();

  const [showForm, setShowForm] = useState(false);
  const [actionError, setActionError] = useState('');
  const [form, setForm] = useState({ date: '', time: '', guests: 2, specialRequests: '' });
  const error = fetchError instanceof Error ? fetchError.message : actionError;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createReservation.mutateAsync({ ...form, guests: Number(form.guests) });
      setForm({ date: '', time: '', guests: 2, specialRequests: '' });
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

  const inputClass = "w-full p-2.5 mb-2.5 rounded-md border border-gray-300 text-base focus:outline-none focus:ring-2 focus:ring-[#e94560]";

  return (
    <div>
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Reservations</h2>
        <button onClick={() => setShowForm(!showForm)} className="px-5 py-2.5 bg-[#16a085] text-white border-none rounded-md cursor-pointer hover:bg-[#138d75] transition-colors">
          {showForm ? 'Cancel' : '+ New Reservation'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-gray-100 p-5 rounded-lg mb-5 mt-4">
          <input name="date" type="date" value={form.date} onChange={handleChange} required className={inputClass} />
          <input name="time" type="time" value={form.time} onChange={handleChange} required className={inputClass} />
          <input name="guests" type="number" min={1} value={form.guests} onChange={handleChange} required className={inputClass} />
          <textarea name="specialRequests" placeholder="Special requests" value={form.specialRequests} onChange={handleChange} className={inputClass} />
          {actionError && <p className="text-red-600">{actionError}</p>}
          <button type="submit" disabled={createReservation.isPending} className="px-6 py-2.5 bg-[#e94560] text-white border-none rounded-md cursor-pointer hover:bg-[#d63d54] transition-colors disabled:opacity-50">Reserve</button>
        </form>
      )}

      {error && <p className="text-red-600">{error}</p>}
      {reservations.length === 0 ? (
        <p className="text-gray-400 mt-5">No reservations yet.</p>
      ) : (
        reservations.map((res) => (
          <div key={res._id} className="border border-gray-200 rounded-lg p-4 mb-4 bg-white shadow-sm hover:shadow-md transition-shadow">
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
                    <button onClick={() => handleCancel(res._id)} className="bg-red-500 text-white border-none px-3 py-1.5 rounded cursor-pointer hover:bg-red-600 transition-colors text-xs">Cancel</button>
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
