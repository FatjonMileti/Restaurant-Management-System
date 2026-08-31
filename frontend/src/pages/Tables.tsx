import React from 'react';
import { Box, Typography } from '@mui/material';
import { useTables, useRestaurantSettings, useOrders, useReservations } from '../api/queries';
import { useAuth } from '../store/authStore';

export default function Tables() {
  const { user } = useAuth();
  const { data: tables = [], isLoading: tablesLoading } = useTables();
  const { data: settings } = useRestaurantSettings();
  const { data: orders = [] } = useOrders();
  const { data: reservations = [] } = useReservations();

  if (user?.role !== 'admin' && user?.role !== 'staff') {
    return (
      <Box className="p-5">
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 2 }}>Tables</Typography>
        <p className="text-red-600">Access denied. Only staff and admin can view tables.</p>
      </Box>
    );
  }

  const freeCount = tables.filter((t) => !t.isBusy).length;
  const busyCount = tables.filter((t) => t.isBusy).length;

  // Build lookup for busy details
  const busyOrderForTable = (n: number) => orders.find((o) => o.tableNumber === n && ['pending', 'preparing'].includes(o.status));
  const busyResForTable = (n: number) => reservations.find((r) => r.tableNumber === n && r.status === 'confirmed');

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>Tables Overview</Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
        {settings?.name ? `${settings.name} — ` : ''}{settings?.tableCount || tables.length} tables total • Free: {freeCount} • Busy: {busyCount}
      </Typography>

      {tablesLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <Box sx={{ animation: 'spin 1s linear infinite', height: 40, width: 40, border: '4px solid #e94560', borderTop: '4px solid transparent', borderRadius: '50%' }} />
        </Box>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 2, mt: 2 }}>
          {tables.map((t) => {
            const order = t.isBusy ? busyOrderForTable(t.number) : null;
            const res = !order && t.isBusy ? busyResForTable(t.number) : null;
            return (
              <Box
                key={t.number}
                className={`p-5 rounded-xl border-2 text-center transition-all ${t.isBusy ? 'bg-red-50 border-red-300' : 'bg-green-50 border-green-300'}`}
              >
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Table {t.number}</Typography>
                <Box
                  className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold text-white ${t.isBusy ? 'bg-red-500' : 'bg-green-600'}`}
                >
                  {t.isBusy ? `Busy (${t.busyType})` : 'Free'}
                </Box>
                {t.isBusy && (
                  <Box className="mt-3 text-xs text-gray-600">
                    {order && <p>Order #{order._id.slice(-6).toUpperCase()} — {order.status}</p>}
                    {res && <p>Reservation — {res.guests} guests {res.time && `at ${res.time}`}</p>}
                    {!order && !res && <p>Occupied</p>}
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
