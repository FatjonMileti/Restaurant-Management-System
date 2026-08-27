import React, { useState } from 'react';
import { useAuth } from '../store/authStore';
import ReservationFormComponent from '../components/pages/ReservationForm';
import ReservationList from '../components/pages/ReservationList';

export default function Reservations() {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Reservations</h2>
        <button onClick={() => setShowForm(!showForm)} className="btn-secondary">
          {showForm ? 'Cancel' : '+ New Reservation'}
        </button>
      </div>
      <ReservationFormComponent showForm={showForm} setShowForm={setShowForm} />
      <ReservationList />
    </div>
  );
}
