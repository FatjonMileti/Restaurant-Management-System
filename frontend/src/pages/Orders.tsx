import { useState } from 'react';
import { Box, Button, IconButton, Tooltip } from '@mui/material';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import { useAuth } from '../store/authStore';
import { useDeleteCompletedOrders } from '../api/queries';
import { getGraphQLErrorMessage } from '../utils/graphqlErrors';
import OrderFormComponent from '../components/pages/OrderForm';
import OrderList from '../components/pages/OrderList';
import PageHeader from '../components/PageHeader';
import ConfirmDialog from '../components/ConfirmDialog';
import { Order } from '../api/queries';

export default function Orders() {
  const { user } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [bulkNotice, setBulkNotice] = useState('');
  const [bulkError, setBulkError] = useState('');
  const deleteCompleted = useDeleteCompletedOrders();

  const isAdmin = user?.role === 'admin';

  const handleBulkDelete = async () => {
    setConfirmBulkDelete(false);
    setBulkNotice('');
    setBulkError('');
    try {
      const data = await deleteCompleted.mutateAsync();
      const count = (data as any)?.deleteCompletedOrders ?? 0;
      setBulkNotice(`Deleted ${count} completed/cancelled order${count === 1 ? '' : 's'}.`);
    } catch (err) {
      setBulkError(getGraphQLErrorMessage(err, 'Failed to delete orders'));
    }
  };

  return (
    <Box>
      <PageHeader
        title="Orders"
        action={
          user?.role !== 'customer' ? (
            <Box className="flex items-center gap-1 sm:gap-2">
              {isAdmin && (
                <>
                  <Button
                    variant="outlined"
                    color="error"
                    sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
                    onClick={() => setConfirmBulkDelete(true)}
                  >
                    Delete Completed
                  </Button>
                  <Tooltip title="Delete completed orders">
                    <IconButton
                      aria-label="Delete completed orders"
                      color="error"
                      sx={{ display: { xs: 'inline-flex', sm: 'none' } }}
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
                sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
                onClick={() => {
                  setShowCreate(!showCreate);
                  setEditingOrder(null);
                }}
              >
                {showCreate ? 'Cancel' : '+ New Order'}
              </Button>
              <Tooltip title={showCreate ? 'Cancel new order' : 'Create new order'}>
                <IconButton
                  aria-label={showCreate ? 'Cancel new order' : 'Create new order'}
                  color="secondary"
                  sx={{ display: { xs: 'inline-flex', sm: 'none' } }}
                  onClick={() => {
                    setShowCreate(!showCreate);
                    setEditingOrder(null);
                  }}
                >
                  {showCreate ? <CloseIcon /> : <AddIcon />}
                </IconButton>
              </Tooltip>
            </Box>
          ) : undefined
        }
      />
      {bulkNotice && <p className="text-green-600 text-sm mt-2">{bulkNotice}</p>}
      {bulkError && <p className="error-text mt-2">{bulkError}</p>}
      <ConfirmDialog
        open={confirmBulkDelete}
        title="Delete Completed Orders"
        message="Delete ALL completed and cancelled orders? This cannot be undone."
        onConfirm={handleBulkDelete}
        onCancel={() => setConfirmBulkDelete(false)}
      />
      <OrderFormComponent
        showCreate={showCreate}
        setShowCreate={setShowCreate}
        editingOrder={editingOrder}
        onEditDone={() => {
          setEditingOrder(null);
        }}
      />
      <OrderList
        onEditOrder={(order) => {
          setEditingOrder(order);
        }}
      />
    </Box>
  );
}
