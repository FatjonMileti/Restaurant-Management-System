import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const btnPrimary: React.CSSProperties = {
  background: '#e94560',
  color: '#fff',
  padding: '12px 30px',
  borderRadius: 5,
  textDecoration: 'none',
  marginRight: 15,
  fontWeight: 'bold',
};

const btnSecondary: React.CSSProperties = {
  background: '#16213e',
  color: '#fff',
  padding: '12px 30px',
  borderRadius: 5,
  textDecoration: 'none',
  fontWeight: 'bold',
};

function Home() {
  const { user } = useAuth();

  if (user) return <Navigate to="/menu" />;

  return (
    <div style={{ textAlign: 'center', marginTop: 80 }}>
      <h1>Welcome to Restaurant Management System</h1>
      <p style={{ color: '#666', fontSize: '1.1rem', margin: '20px 0' }}>
        Manage your menu, orders, and reservations all in one place.
      </p>
      <div style={{ marginTop: 30 }}>
        <Link to="/register" style={btnPrimary}>Get Started</Link>
        <Link to="/login" style={btnSecondary}>Login</Link>
      </div>
    </div>
  );
}

export default Home;
