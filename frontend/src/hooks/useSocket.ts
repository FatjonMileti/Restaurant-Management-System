import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from '../socket';

export const useSocket = () => {
  const qc = useQueryClient();

  useEffect(() => {
    const socket = getSocket();

    const eventMap: Record<string, string[]> = {
      'menu:changed': ['menu'],
      'orders:changed': ['orders', 'tables'],
      'reservations:changed': ['reservations', 'tables'],
      'categories:changed': ['categories'],
      'users:changed': ['users'],
      'settings:changed': ['restaurantSettings'],
      'tables:changed': ['tables'],
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
