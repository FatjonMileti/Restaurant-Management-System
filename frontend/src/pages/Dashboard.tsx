import React from 'react';
import { useAuth } from '../store/authStore';
import { useMenu, useOrders, useReservations } from '../api/queries';

interface CardProps {
  title: string;
  value: number;
  color: string;
}

const cardBg: Record<string, string> = {
  '#e94560': 'bg-[#e94560]',
  '#0f3460': 'bg-[#0f3460]',
  '#16a085': 'bg-[#16a085]',
};

function Card({ title, value, color }: CardProps) {
  return (
    <div className={`flex-1 p-8 rounded-xl text-white text-center ${cardBg[color] || 'bg-gray-800'}`}>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-4xl font-bold mt-2">{value}</p>
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
      <h2 className="text-2xl font-bold">Dashboard</h2>
      <p className="mt-2">Welcome, <strong>{user?.name}</strong>!</p>
      <div className="flex gap-5 mt-8 flex-col md:flex-row">
        <Card title="Total Orders" value={orders.length} color="#e94560" />
        <Card title="Reservations" value={reservations.length} color="#0f3460" />
        <Card title="Menu Items" value={menuItems.length} color="#16a085" />
      </div>
    </div>
  );
}

export default Dashboard;
