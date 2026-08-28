import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { useAuth } from '../store/authStore';
import { useMenu, useOrders, useReservations } from '../api/queries';

interface CardProps {
  title: string;
  value: number;
  color: string;
}

function Card({ title, value, color }: CardProps) {
  return (
    <Paper sx={{ flex: 1, p: 4, borderRadius: 2, textAlign: 'center', bgcolor: color, color: '#fff' }}>
      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{title}</Typography>
      <Typography variant="h2" sx={{ fontWeight: 'bold', mt: 2 }}>{value}</Typography>
    </Paper>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data: orders = [] } = useOrders();
  const { data: reservations = [] } = useReservations();
  const { data: menuItems = [] } = useMenu();

  return (
    <Box>
      <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 2 }}>Dashboard</Typography>
      <Typography variant="body1">Welcome, <strong>{user?.name}</strong>!</Typography>
      <Box sx={{ display: 'flex', gap: 2, mt: 4, flexDirection: { xs: 'column', md: 'row' } }}>
        <Card title="Total Orders" value={orders.length} color="#e94560" />
        <Card title="Reservations" value={reservations.length} color="#0f3460" />
        <Card title="Menu Items" value={menuItems.length} color="#16a085" />
      </Box>
    </Box>
  );
}
