import React, { Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { useIsFetching, useIsMutating } from '@tanstack/react-query';
import Navbar from './components/Navbar';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingSpinner from './components/LoadingSpinner';
import { useEventSource } from './hooks/useEventSource';

const Login = React.lazy(() => import('./pages/Login'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Menu = React.lazy(() => import('./pages/Menu'));
const Orders = React.lazy(() => import('./pages/Orders'));
const Reservations = React.lazy(() => import('./pages/Reservations'));
const Tables = React.lazy(() => import('./pages/Tables'));
const Settings = React.lazy(() => import('./pages/Settings'));
const Logs = React.lazy(() => import('./pages/Logs'));

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

function App() {
  const isFetching = useIsFetching({ predicate: (query) => !query.meta?.silent });
  const isMutating = useIsMutating({ predicate: (mutation) => !mutation.meta?.silent });
  useEventSource();
  const location = useLocation();

  return (
    <ErrorBoundary>
      <MotionConfig reducedMotion="user">
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          {(isFetching > 0 || isMutating > 0) && (
            <div className="fixed inset-0 z-50 flex justify-center items-center bg-black/10 backdrop-blur-sm">
              <LoadingSpinner />
            </div>
          )}
          <div className="p-5 max-w-6xl mx-auto">
            <Suspense fallback={null}>
              <AnimatePresence mode="wait">
                <Routes location={location} key={location.pathname}>
                  <Route
                    path="/"
                    element={
                      <PageTransition>
                        <Menu />
                      </PageTransition>
                    }
                  />
                  <Route
                    path="/login"
                    element={
                      <PageTransition>
                        <Login />
                      </PageTransition>
                    }
                  />
                  {/* <Route path="/register" element={<Register />} /> */}
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute adminOnly>
                        <PageTransition>
                          <Dashboard />
                        </PageTransition>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/menu"
                    element={
                      <PageTransition>
                        <Menu />
                      </PageTransition>
                    }
                  />
                  <Route
                    path="/orders"
                    element={
                      <ProtectedRoute>
                        <PageTransition>
                          <Orders />
                        </PageTransition>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/reservations"
                    element={
                      <ProtectedRoute>
                        <PageTransition>
                          <Reservations />
                        </PageTransition>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/tables"
                    element={
                      <ProtectedRoute>
                        <PageTransition>
                          <Tables />
                        </PageTransition>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/settings"
                    element={
                      <ProtectedRoute adminOnly>
                        <PageTransition>
                          <Settings />
                        </PageTransition>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/logs"
                    element={
                      <ProtectedRoute adminOnly>
                        <PageTransition>
                          <Logs />
                        </PageTransition>
                      </ProtectedRoute>
                    }
                  />
                </Routes>
              </AnimatePresence>
            </Suspense>
          </div>
        </div>
      </MotionConfig>
    </ErrorBoundary>
  );
}

export default App;
