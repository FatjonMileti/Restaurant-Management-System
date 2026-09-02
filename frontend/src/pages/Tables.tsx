import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { useTables, useRestaurantSettings, useOrders, useReservations } from '../api/queries';
import { useAuth } from '../store/authStore';
import PageHeader from '../components/PageHeader';
import TableCard from '../components/pages/TableCard';

export default function Tables() {
  const { user } = useAuth();
  const { data: tables = [], isLoading: tablesLoading } = useTables();
  const { data: settings } = useRestaurantSettings();
  const { data: orders = [] } = useOrders();
  const { data: reservations = [] } = useReservations();

  const { freeCount, busyCount, orderMap, reservationMap } = useMemo(() => {
    const free = tables.filter((t) => !t.isBusy).length;
    const busy = tables.filter((t) => t.isBusy).length;
    const oMap = new Map<number, any>();
    orders.forEach((o) => {
      if (o.tableNumber && ['pending', 'preparing'].includes(o.status)) oMap.set(o.tableNumber, o);
    });
    const rMap = new Map<number, any>();
    reservations.forEach((r) => {
      if (r.tableNumber && r.status === 'confirmed' && !oMap.has(r.tableNumber)) rMap.set(r.tableNumber, r);
    });
    return { freeCount: free, busyCount: busy, orderMap: oMap, reservationMap: rMap };
  }, [tables, orders, reservations]);

  if (user?.role !== 'admin' && user?.role !== 'staff') {
    return (
      <Box className="p-5">
        <PageHeader title="Tables" />
        <p className="error-text">Access denied. Only staff and admin can view tables.</p>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" className="page-heading mb-1">
        Tables Overview
      </Typography>
      <Typography variant="body2" className="text-gray-500 mb-2">
        {settings?.name ? `${settings.name} — ` : ''}
        {settings?.tableCount || tables.length} tables total • Free: {freeCount} • Busy: {busyCount}
      </Typography>

      {tablesLoading ? (
        <Box className="loading-wrapper !py-4">
          <Box className="spinner" />
        </Box>
      ) : (
        <Box className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-2">
          {tables.map((t) => (
            <TableCard
              key={t.number}
              table={t}
              order={t.isBusy ? orderMap.get(t.number) : null}
              reservation={!orderMap.get(t.number) && t.isBusy ? reservationMap.get(t.number) : null}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}
