import React, { useState } from 'react';
import { Box, Button } from '@mui/material';
import { useAuth } from '../store/authStore';
import ReservationFormComponent from '../components/pages/ReservationForm';
import ReservationList from '../components/pages/ReservationList';
import PageHeader from '../components/PageHeader';
import { Reservation } from '../api/queries';

export default function Reservations() {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);

  return (
    <Box>
      <PageHeader
        title="Reservations"
        action={
          <Button
            variant="contained"
            color="secondary"
            onClick={() => {
              setShowForm(!showForm);
              setEditingReservation(null);
            }}
          >
            {showForm ? 'Cancel' : '+ New Reservation'}
          </Button>
        }
      />
      <ReservationFormComponent
        showForm={showForm || !!editingReservation}
        setShowForm={(v) => {
          if (!v) {
            setEditingReservation(null);
          }
          setShowForm(v);
        }}
        editingReservation={editingReservation}
        onEditDone={() => {
          setEditingReservation(null);
          setShowForm(false);
        }}
      />
      <ReservationList
        onEditReservation={(res) => {
          setEditingReservation(res);
          setShowForm(true);
        }}
      />
    </Box>
  );
}
