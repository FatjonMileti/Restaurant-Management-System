import { useState } from 'react';
import { Box, Button, IconButton, Tooltip } from '@mui/material';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import { useAuth } from '../store/authStore';
import { useDeleteCompletedReservations } from '../api/queries';
import { getGraphQLErrorMessage } from '../utils/graphqlErrors';
import ReservationFormComponent from '../components/pages/ReservationForm';
import ReservationList from '../components/pages/ReservationList';
import PageHeader from '../components/PageHeader';
import ConfirmDialog from '../components/ConfirmDialog';
import { Reservation } from '../api/queries';

export default function Reservations() {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [bulkNotice, setBulkNotice] = useState('');
  const [bulkError, setBulkError] = useState('');
  const deleteCompleted = useDeleteCompletedReservations();

  const isAdmin = user?.role === 'admin';

  const handleBulkDelete = async () => {
    setConfirmBulkDelete(false);
    setBulkNotice('');
    setBulkError('');
    try {
      const data = await deleteCompleted.mutateAsync();
      const count = (data as any)?.deleteCompletedReservations ?? 0;
      setBulkNotice(`Deleted ${count} completed/cancelled reservation${count === 1 ? '' : 's'}.`);
    } catch (err) {
      setBulkError(getGraphQLErrorMessage(err, 'Failed to delete reservations'));
    }
  };

  return (
    <Box>
      <PageHeader
        title="Reservations"
        action={
          <Box className="flex items-center gap-1 sm:gap-2">
            {isAdmin && (
              <>
                <Button
                  variant="outlined"
                  color="error"
                  className="hidden sm:inline-flex"
                  onClick={() => setConfirmBulkDelete(true)}
                >
                  Delete Completed
                </Button>
                <Tooltip title="Delete completed reservations">
                  <IconButton
                    aria-label="Delete completed reservations"
                    color="error"
                    className="sm:!hidden"
                    onClick={() => setConfirmBulkDelete(true)}
                    size="medium"
                  >
                    <DeleteSweepIcon />
                  </IconButton>
                </Tooltip>
              </>
            )}
            <Button
              variant="contained"
              color="secondary"
              className="hidden sm:inline-flex"
              onClick={() => {
                setShowForm(!showForm);
                setEditingReservation(null);
              }}
            >
              {showForm ? 'Cancel' : '+ New Reservation'}
            </Button>
            <Tooltip title={showForm ? 'Cancel new reservation' : 'Create new reservation'}>
              <IconButton
                aria-label={showForm ? 'Cancel new reservation' : 'Create new reservation'}
                color="secondary"
                className="sm:!hidden"
                onClick={() => {
                  setShowForm(!showForm);
                  setEditingReservation(null);
                }}
              >
                {showForm ? <CloseIcon /> : <AddIcon />}
              </IconButton>
            </Tooltip>
          </Box>
        }
      />
      {bulkNotice && <p className="text-green-600 text-sm mt-2">{bulkNotice}</p>}
      {bulkError && <p className="error-text mt-2">{bulkError}</p>}
      <ConfirmDialog
        open={confirmBulkDelete}
        title="Delete Completed Reservations"
        message="Delete ALL completed and cancelled reservations? This cannot be undone."
        onConfirm={handleBulkDelete}
        onCancel={() => setConfirmBulkDelete(false)}
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
