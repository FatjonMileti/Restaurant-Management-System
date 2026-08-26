import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/authStore';

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-[#1a1a2e] px-8 py-4 flex justify-between items-center">
      <Link to="/menu" className="text-white no-underline text-xl font-bold">
        Restaurant MS
      </Link>
      <div className="flex items-center">
        {location.pathname != "/menu" && (
          <Link to="/menu" className="text-white no-underline mr-5 text-base">Menu</Link>
        )}
        {user ? (
          <>
            <Link to="/dashboard" className="text-white no-underline mr-5 text-base">Dashboard</Link>
            <Link to="/orders" className="text-white no-underline mr-5 text-base">Orders</Link>
            <Link to="/reservations" className="text-white no-underline mr-5 text-base">Reservations</Link>
            {user.role === 'admin' && <Link to="/settings" className="text-white no-underline mr-5 text-base">Settings</Link>}
            <span className="text-white mr-4">{user.name}</span>
            <button onClick={handleLogout} className="bg-[#e94560] text-white border-none px-4 py-2 rounded-md cursor-pointer hover:bg-[#d63d54] transition-colors">Logout</button>
          </>
        ) : (
          <>
            <Link to="/login" className="text-white no-underline mr-5 text-base">Login</Link>
            <Link to="/register" className="text-white no-underline text-base">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
