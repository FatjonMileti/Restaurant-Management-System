import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const linkStyle: React.CSSProperties = {
  color: '#fff',
  textDecoration: 'none',
  marginRight: 20,
  fontSize: '1rem',
};

const btnStyle: React.CSSProperties = {
  background: '#e94560',
  color: '#fff',
  border: 'none',
  padding: '8px 16px',
  borderRadius: 5,
  cursor: 'pointer',
};

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav style={{ background: '#1a1a2e', padding: '15px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Link to="/" style={{ color: '#fff', textDecoration: 'none', fontSize: '1.3rem', fontWeight: 'bold' }}>
        Restaurant MS
      </Link>
      <div>
        <Link to="/menu" style={linkStyle}>Menu</Link>
        {user ? (
          <>
            <Link to="/dashboard" style={linkStyle}>Dashboard</Link>
            <Link to="/orders" style={linkStyle}>Orders</Link>
            <Link to="/reservations" style={linkStyle}>Reservations</Link>
            {user.role === 'admin' && <Link to="/admin" style={linkStyle}>Admin</Link>}
            <span style={{ color: '#fff', marginRight: 15 }}>{user.name}</span>
            <button onClick={handleLogout} style={btnStyle}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/login" style={linkStyle}>Login</Link>
            <Link to="/register" style={linkStyle}>Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
