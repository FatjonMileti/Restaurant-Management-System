import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useIsFetching, useIsMutating } from '@tanstack/react-query';
import Navbar from './components/Navbar';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingSpinner from './components/LoadingSpinner';
import { useSocket } from './hooks/useSocket';

const Home = React.lazy(() => import('./pages/Home'));
const Login = React.lazy(() => import('./pages/Login'));
const Register = React.lazy(() => import('./pages/Register'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Menu = React.lazy(() => import('./pages/Menu'));
const Orders = React.lazy(() => import('./pages/Orders'));
const Reservations = React.lazy(() => import('./pages/Reservations'));
const Tables = React.lazy(() => import('./pages/Tables'));
const Settings = React.lazy(() => import('./pages/Settings'));

function App() {
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  useSocket();

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        {(isFetching > 0 || isMutating > 0) && (
          <div className="fixed inset-0 z-50 flex justify-center items-center bg-black/10 backdrop-blur-sm">
            <LoadingSpinner />
          </div>
        )}
        <div className="p-5 max-w-6xl mx-auto">
          <Suspense fallback={null}>
            <Routes>
              <Route path="/" element={<Menu />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route path="/menu" element={<Menu />} />
              <Route
                path="/orders"
                element={
                  <ProtectedRoute>
                    <Orders />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reservations"
                element={
                  <ProtectedRoute>
                    <Reservations />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tables"
                element={
                  <ProtectedRoute>
                    <Tables />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute adminOnly>
                    <Settings />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </Suspense>
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default App;
