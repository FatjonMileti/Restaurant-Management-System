import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { useAuth } from '../store/authStore';
import { useDashboardStats } from '../api/queries';
import DashboardStatCard from '../components/pages/DashboardStatCard';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';

export default function Dashboard() {
  const { user } = useAuth();
  const { data: stats, isLoading, error } = useDashboardStats();

  const todaySummary = useMemo(() => {
    if (!stats) return null;
    return `Today: ${stats.todayOrders} orders • ${stats.todayReservations} reservations`;
  }, [stats]);

  if (isLoading) {
    return null;
  }

  if (error) {
    const msg = error instanceof Error ? error.message : 'Failed to load dashboard';
    const isNetwork =
      msg.includes('Failed to fetch') ||
      msg.includes('NetworkError') ||
      msg.includes('Network error');
    return (
      <Box>
        <PageHeader title="Dashboard" />
        <p className="error-text">{isNetwork ? 'Network error: backend is unavailable' : msg}</p>
      </Box>
    );
  }

  if (!stats) return null;

  return (
    <Box>
      <PageHeader title="Dashboard" />
      <Typography variant="body1" className="mb-1">
        Welcome, <strong>{user?.name}</strong>!{' '}
        {todaySummary && <span className="text-gray-500">— {todaySummary}</span>}
      </Typography>

      {/* Primary stats */}
      <Box className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <DashboardStatCard
          title="Total Orders"
          value={stats.totalOrders}
          color="#e94560"
          subtitle={`${stats.pendingOrders} pending • ${stats.completedOrders} completed`}
        />
        <DashboardStatCard
          title="Reservations"
          value={stats.totalReservations}
          color="#0f3460"
          subtitle={`${stats.confirmedReservations} confirmed`}
        />
        <DashboardStatCard
          title="Menu Items"
          value={stats.totalMenuItems}
          color="#16a085"
          subtitle={`${stats.availableMenuItems} available • ${stats.totalCategories} categories`}
        />
        <DashboardStatCard
          title="Revenue"
          value={`$${stats.totalRevenue.toFixed(2)}`}
          color="#6c5ce7"
          subtitle="Completed orders"
        />
      </Box>

      {/* Secondary stats */}
      <Box className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
        <DashboardStatCard
          title="Tables"
          value={`${stats.busyTables}/${stats.totalTables}`}
          color="#f39c12"
          subtitle={`${stats.freeTables} free`}
        />
        <DashboardStatCard title="Users" value={stats.totalUsers} color="#0984e3" />
        <DashboardStatCard title="Today Orders" value={stats.todayOrders} color="#00b894" />
        <DashboardStatCard
          title="Today Reservations"
          value={stats.todayReservations}
          color="#a29bfe"
        />
      </Box>

      {/* Breakdown */}
      <Box className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <Box className="section-card">
          <h3 className="section-heading">Orders by Status</h3>
          <Box className="flex flex-wrap gap-2">
            {stats.ordersByStatus.length === 0 ? (
              <p className="text-sm text-gray-400">No orders</p>
            ) : (
              stats.ordersByStatus.map((s) => (
                <Box
                  key={s.status}
                  className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-md border"
                >
                  <StatusBadge status={s.status} className="text-xs" />
                  <span className="text-sm font-medium">{s.count}</span>
                </Box>
              ))
            )}
          </Box>
        </Box>
        <Box className="section-card">
          <h3 className="section-heading">Reservations by Status</h3>
          <Box className="flex flex-wrap gap-2">
            {stats.reservationsByStatus.length === 0 ? (
              <p className="text-sm text-gray-400">No reservations</p>
            ) : (
              stats.reservationsByStatus.map((s) => (
                <Box
                  key={s.status}
                  className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-md border"
                >
                  <StatusBadge status={s.status} className="text-xs" />
                  <span className="text-sm font-medium">{s.count}</span>
                </Box>
              ))
            )}
          </Box>
        </Box>
      </Box>

      {/* Recent orders */}
      <Box className="section-card mt-4">
        <h3 className="section-heading">Recent Orders</h3>
        {stats.recentOrders.length === 0 ? (
          <p className="text-sm text-gray-400">No recent orders</p>
        ) : (
          <Box className="flex flex-col gap-2">
            {stats.recentOrders.map((o) => (
              <Box
                key={o._id}
                className="flex justify-between items-center p-3 bg-gray-50 rounded-md border"
              >
                <Box>
                  <strong className="text-sm">Order #{o._id.slice(-6).toUpperCase()}</strong>
                  {o.tableNumber && (
                    <span className="text-sm text-gray-500"> • Table {o.tableNumber}</span>
                  )}
                  <p className="text-xs text-gray-500">
                    {new Date(o.createdAt).toLocaleString()}{' '}
                    {o.user?.name ? `• ${o.user.name}` : ''}
                  </p>
                </Box>
                <Box className="text-right">
                  <StatusBadge status={o.status} className="text-xs mb-1" />
                  <p className="text-sm font-semibold">${o.totalAmount.toFixed(2)}</p>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}
