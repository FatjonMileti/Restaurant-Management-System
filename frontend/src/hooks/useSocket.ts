import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from '../socket';

export const useSocket = () => {
  const qc = useQueryClient();

  useEffect(() => {
    const socket = getSocket();

    const eventMap: Record<string, string[]> = {
      'menu:changed': ['menu', 'dashboardStats'],
      'orders:changed': ['orders', 'tables', 'dashboardStats'],
      'reservations:changed': ['reservations', 'tables', 'dashboardStats'],
      'categories:changed': ['categories', 'dashboardStats'],
      'users:changed': ['users', 'dashboardStats'],
      'settings:changed': ['restaurantSettings', 'dashboardStats'],
      'tables:changed': ['tables', 'dashboardStats'],
    };

    const handlers: Array<() => void> = [];

    Object.entries(eventMap).forEach(([event, keys]) => {
      const handler = () => {
        keys.forEach((key) => qc.invalidateQueries({ queryKey: [key] }));
      };
      socket.on(event, handler);
      handlers.push(() => socket.off(event, handler));
    });

    return () => {
      handlers.forEach((unsub) => unsub());
    };
  }, [qc]);
};
