import React, { useState } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useAuth } from '../store/authStore';
import OrderFormComponent from '../components/pages/OrderForm';
import OrderList from '../components/pages/OrderList';
import { Order } from '../api/queries';

export default function Orders() {
  const { user } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  return (
    <Box>
      <Box className="flex justify-between items-center mb-2">
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>Orders</Typography>
        {user?.role !== 'customer' && (
          <Button variant="contained" color="secondary" onClick={() => { setShowCreate(!showCreate); setEditingOrder(null); }}>
            {showCreate ? 'Cancel' : '+ New Order'}
          </Button>
        )}
      </Box>
      <OrderFormComponent
        showCreate={showCreate}
        setShowCreate={setShowCreate}
        editingOrder={editingOrder}
        onEditDone={() => { setEditingOrder(null); }}
      />
      <OrderList onEditOrder={(order) => { setEditingOrder(order); }} />
    </Box>
  );
}
