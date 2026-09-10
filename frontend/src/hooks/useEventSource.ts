import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getEventSource } from '../eventSource';

export const useEventSource = () => {
  const qc = useQueryClient();

  useEffect(() => {
    const eventSource = getEventSource();

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
      eventSource.addEventListener(event, handler as EventListener);
      handlers.push(() => eventSource.removeEventListener(event, handler as EventListener));
    });

    return () => {
      handlers.forEach((unsub) => unsub());
    };
  }, [qc]);
};
