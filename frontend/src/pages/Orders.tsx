import React, { useState } from 'react';
import { Box, Button } from '@mui/material';
import { useAuth } from '../store/authStore';
import OrderFormComponent from '../components/pages/OrderForm';
import OrderList from '../components/pages/OrderList';
import PageHeader from '../components/PageHeader';
import { Order } from '../api/queries';

export default function Orders() {
  const { user } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  return (
    <Box>
      <PageHeader
        title="Orders"
        action={
          user?.role !== 'customer' ? (
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
          ) : undefined
        }
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
