import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Menu from './pages/Menu';
import Orders from './pages/Orders';
import Reservations from './pages/Reservations';
import Settings from './pages/Settings';

function App() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="p-5 max-w-6xl mx-auto">
          <Routes>
            {/* <Route path="/" element={<Home />} /> */}
            <Route path="/" element={<Menu />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/menu" element={<Menu />} />
            <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
            <Route path="/reservations" element={<ProtectedRoute><Reservations /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute adminOnly><Settings /></ProtectedRoute>} />
          </Routes>
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default App;
