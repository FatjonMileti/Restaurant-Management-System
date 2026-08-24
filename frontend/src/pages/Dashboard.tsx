import React from 'react';
import { useAuth } from '../store/authStore';
import { useMenu, useOrders, useReservations } from '../api/queries';

interface CardProps {
  title: string;
  value: number;
  color: string;
}

function Card({ title, value, color }: CardProps) {
  return (
    <div style={{
      flex: 1, padding: 30, borderRadius: 10, background: color, color: '#fff', textAlign: 'center',
    }}>
      <h3>{title}</h3>
      <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{value}</p>
    </div>
  );
}

function Dashboard() {
  const { user } = useAuth();
  const { data: orders = [] } = useOrders();
  const { data: reservations = [] } = useReservations();
  const { data: menuItems = [] } = useMenu();

  return (
    <div>
      <h2>Dashboard</h2>
      <p>Welcome, <strong>{user?.name}</strong>!</p>
      <div style={{ display: 'flex', gap: 20, marginTop: 30 }}>
        <Card title="Total Orders" value={orders.length} color="#e94560" />
        <Card title="Reservations" value={reservations.length} color="#0f3460" />
        <Card title="Menu Items" value={menuItems.length} color="#16a085" />
      </div>
    </div>
  );
}

export default Dashboard;
