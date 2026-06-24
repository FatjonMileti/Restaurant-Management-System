import React, { useEffect, useState } from 'react';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';

interface ReservationUser {
  _id: string;
  name: string;
  email: string;
}

interface Reservation {
  _id: string;
  user?: ReservationUser;
  date: string;
  time: string;
  guests: number;
  tableNumber?: number;
  status: string;
  specialRequests?: string;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  confirmed: '#27ae60', cancelled: '#e74c3c', completed: '#3498db',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: 10, marginBottom: 10, borderRadius: 5, border: '1px solid #ccc', fontSize: '1rem',
  boxSizing: 'border-box',
};

const submitStyle: React.CSSProperties = {
  padding: '10px 25px', background: '#e94560', color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer',
};

const addBtnStyle: React.CSSProperties = {
  padding: '10px 20px', background: '#16a085', color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer',
};

function Reservations() {
  const { user } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ date: '', time: '', guests: 2, specialRequests: '' });

  useEffect(() => {
    fetchReservations();
  }, []);

  const fetchReservations = async () => {
    const { data } = await API.get<Reservation[]>('/reservations');
    setReservations(data);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await API.post('/reservations', { ...form, guests: Number(form.guests) });
    setForm({ date: '', time: '', guests: 2, specialRequests: '' });
    setShowForm(false);
    fetchReservations();
  };

  const handleCancel = async (id: string) => {
    await API.put(`/reservations/${id}/cancel`);
    fetchReservations();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Reservations</h2>
        <button onClick={() => setShowForm(!showForm)} style={addBtnStyle}>
          {showForm ? 'Cancel' : '+ New Reservation'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} style={{ background: '#f5f5f5', padding: 20, borderRadius: 8, marginBottom: 20 }}>
          <input name="date" type="date" value={form.date} onChange={handleChange} required style={inputStyle} />
          <input name="time" type="time" value={form.time} onChange={handleChange} required style={inputStyle} />
          <input name="guests" type="number" min="1" value={form.guests} onChange={handleChange} required style={inputStyle} />
          <textarea name="specialRequests" placeholder="Special requests" value={form.specialRequests} onChange={handleChange} style={inputStyle} />
          <button type="submit" style={submitStyle}>Reserve</button>
        </form>
      )}

      {reservations.length === 0 ? (
        <p style={{ color: '#888', marginTop: 20 }}>No reservations yet.</p>
      ) : (
        reservations.map((res) => (
          <div key={res._id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 15, marginBottom: 15 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <strong>{new Date(res.date).toLocaleDateString()} at {res.time}</strong>
                <p>{res.guests} guest(s) {res.tableNumber ? `| Table ${res.tableNumber}` : ''}</p>
                {res.specialRequests && <p style={{ color: '#666' }}>Note: {res.specialRequests}</p>}
                {user?.role !== 'customer' && res.user && <p style={{ color: '#888', fontSize: '0.85rem' }}>By: {res.user.name} ({res.user.email})</p>}
                <p style={{ color: '#888', fontSize: '0.85rem' }}>{new Date(res.createdAt).toLocaleString()}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{
                  background: statusColors[res.status], color: '#fff', padding: '4px 12px', borderRadius: 12,
                  display: 'inline-block',
                }}>
                  {res.status}
                </span>
                {res.status === 'confirmed' && (user?.role !== 'customer' || res.user?._id === user?._id) && (
                  <div style={{ marginTop: 10 }}>
                    <button onClick={() => handleCancel(res._id)} style={{ background: '#e74c3c', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: 4, cursor: 'pointer' }}>Cancel</button>
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
