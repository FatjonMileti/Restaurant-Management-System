import { useState } from 'react';
import { Box, Button } from '@mui/material';
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
            <Box className="flex gap-2">
              {isAdmin && (
                <Button variant="outlined" color="error" onClick={() => setConfirmBulkDelete(true)}>
                  Delete Completed
                </Button>
              )}
              <Button
                variant="contained"
                color="secondary"
                onClick={() => {
                  setShowCreate(!showCreate);
                  setEditingOrder(null);
                }}
              >
                {showCreate ? 'Cancel' : '+ New Order'}
              </Button>
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
