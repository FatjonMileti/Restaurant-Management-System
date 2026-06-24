import React, { useEffect, useState } from 'react';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';

interface Stats {
  orders: number;
  reservations: number;
  menuItems: number;
}

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
  const [stats, setStats] = useState<Stats>({ orders: 0, reservations: 0, menuItems: 0 });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ordersRes, reservationsRes, menuRes] = await Promise.all([
          API.get('/orders'),
          API.get('/reservations'),
          API.get('/menu'),
        ]);
        setStats({
          orders: ordersRes.data.length,
          reservations: reservationsRes.data.length,
          menuItems: menuRes.data.length,
        });
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, []);

  return (
    <div>
      <h2>Dashboard</h2>
      <p>Welcome, <strong>{user?.name}</strong>!</p>
      <div style={{ display: 'flex', gap: 20, marginTop: 30 }}>
        <Card title="Total Orders" value={stats.orders} color="#e94560" />
        <Card title="Reservations" value={stats.reservations} color="#0f3460" />
        <Card title="Menu Items" value={stats.menuItems} color="#16a085" />
      </div>
    </div>
  );
}

export default Dashboard;
