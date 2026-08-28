import React, { useState } from 'react';
import { useAuth } from '../store/authStore';
import ReservationFormComponent from '../components/pages/ReservationForm';
import ReservationList from '../components/pages/ReservationList';
import { Reservation } from '../api/queries';

export default function Reservations() {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Reservations</h2>
        <button onClick={() => { setShowForm(!showForm); setEditingReservation(null); }} className="btn-secondary">
          {showForm ? 'Cancel' : '+ New Reservation'}
        </button>
      </div>
      <ReservationFormComponent
        showForm={showForm || !!editingReservation}
        setShowForm={(v) => { if (!v) { setEditingReservation(null); } setShowForm(v); }}
        editingReservation={editingReservation}
        onEditDone={() => { setEditingReservation(null); setShowForm(false); }}
      />
      <ReservationList onEditReservation={(res) => { setEditingReservation(res); setShowForm(true); }} />
    </div>
  );
}
