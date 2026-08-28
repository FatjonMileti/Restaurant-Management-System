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
    <Paper className="flex-1 p-8 rounded-xl text-white text-center">
      <Typography variant="h6" className="text-lg font-semibold">{title}</Typography>
      <Typography variant="h2" className="text-4xl font-bold mt-2">{value}</Typography>
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
      <Typography variant="h3" className="text-2xl font-bold mb-5">Dashboard</Typography>
      <Typography variant="body1">Welcome, <strong>{user?.name}</strong>!</Typography>
      <Box className="flex gap-5 mt-8 flex-col md:flex-row">
        <Card title="Total Orders" value={orders.length} color="#e94560" />
        <Card title="Reservations" value={reservations.length} color="#0f3460" />
        <Card title="Menu Items" value={menuItems.length} color="#16a085" />
      </Box>
    </Box>
  );
}
