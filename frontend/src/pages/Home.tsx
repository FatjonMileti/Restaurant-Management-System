import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../store/authStore';

function Home() {
  const { user } = useAuth();

  if (user) return <Navigate to="/menu" />;

  return (
    <div className="text-center mt-20">
      <h1 className="text-3xl font-bold">Welcome to Restaurant Management System</h1>
      <p className="text-gray-500 text-lg my-5">
        Manage your menu, orders, and reservations all in one place.
      </p>
      <div className="mt-8 flex justify-center gap-4">
        <Link to="/register" className="bg-[#e94560] text-white px-8 py-3 rounded-md no-underline font-bold hover:bg-[#d63d54] transition-colors">Get Started</Link>
        <Link to="/login" className="bg-[#16213e] text-white px-8 py-3 rounded-md no-underline font-bold hover:bg-[#1a2a4a] transition-colors">Login</Link>
      </div>
    </div>
  );
}

export default Home;
