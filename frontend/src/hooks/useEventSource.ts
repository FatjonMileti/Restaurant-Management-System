import { useEffect } from 'react';
import { useQueryClient, QueryClient } from '@tanstack/react-query';
import { getEventSource } from '../eventSource';
import { mapId, mapUserRef } from '../api/queries';
import { useAuth } from '../store/authStore';

const parseData = (event: Event): any | null => {
  try {
    const raw = (event as MessageEvent).data;
    if (raw === undefined || raw === null || raw === '') return null;
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
};

const matchesId = (entry: any, id: string) => entry && (entry._id === id || entry.id === id);

// Merge a server entity into a cached list: update in place when present,
// prepend when new (lists are ordered newest-first).
const upsertById = (qc: QueryClient, key: string[], item: any) => {
  qc.setQueryData(key, (old: any) => {
    const list = old ?? [];
    const idx = list.findIndex((e: any) => e && (e._id === item._id || e._id === item.id));
    if (idx === -1) return [item, ...list];
    const next = [...list];
    next[idx] = { ...next[idx], ...item };
    return next;
  });
};

const removeById = (qc: QueryClient, key: string[], id: string): any | undefined => {
  const list = (qc.getQueryData(key) as any[] | undefined) ?? [];
  const removed = list.find((e: any) => matchesId(e, id));
  qc.setQueryData(key, (old: any) => (old ?? []).filter((e: any) => !matchesId(e, id)));
  return removed;
};

const normalizeOrder = (o: any) => mapUserRef(mapId(o));
const normalizeSimple = (o: any) => mapId(o);

export const useEventSource = () => {
  const qc = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    const eventSource = getEventSource(user?._id || '');
    if (!eventSource) return;

    // Apply an entity payload to its cached list; fall back to a refetch when
    // the event carries no usable payload (e.g. an older backend).
    const handleEntityEvent = (
      event: Event,
      key: string[],
      field: string,
      normalize: (raw: any) => any,
      onRemove?: (removed: any) => void,
    ) => {
      const entity = parseData(event)?.[field];
      if (entity && typeof entity === 'object') {
        if ((entity as any).deleted) {
          const id = (entity as any).id ?? (entity as any)._id;
          if (id) {
            onRemove?.(removeById(qc, key, id));
          } else {
            qc.invalidateQueries({ queryKey: key });
          }
        } else {
          upsertById(qc, key, normalize(entity));
        }
      } else {
        qc.invalidateQueries({ queryKey: key });
      }
      qc.invalidateQueries({ queryKey: ['dashboardStats'] });
    };

    const handlers: Array<[string, (e: Event) => void]> = [
      ['menu:changed', (e) => handleEntityEvent(e, ['menu'], 'menuItem', normalizeSimple)],
      [
        'orders:changed',
        (e) =>
          handleEntityEvent(e, ['orders'], 'order', normalizeOrder, (removed) => {
            // Deletes emit no tables:changed — free the table from the payload.
            if (removed?.tableNumber != null) qc.invalidateQueries({ queryKey: ['tables'] });
          }),
      ],
      [
        'reservations:changed',
        (e) =>
          handleEntityEvent(e, ['reservations'], 'reservation', normalizeOrder, (removed) => {
            if (removed?.tableNumber != null) qc.invalidateQueries({ queryKey: ['tables'] });
          }),
      ],
      [
        'categories:changed',
        (e) => handleEntityEvent(e, ['categories'], 'category', normalizeSimple),
      ],
      ['users:changed', (e) => handleEntityEvent(e, ['users'], 'user', normalizeSimple)],
      [
        'settings:changed',
        (e) => {
          const settings = parseData(e)?.settings;
          if (settings) {
            qc.setQueryData(['restaurantSettings'], mapId(settings));
          } else {
            qc.invalidateQueries({ queryKey: ['restaurantSettings'] });
          }
          // tableCount drives the tables query.
          qc.invalidateQueries({ queryKey: ['tables'] });
          qc.invalidateQueries({ queryKey: ['dashboardStats'] });
        },
      ],
      [
        'tables:changed',
        () => {
          qc.invalidateQueries({ queryKey: ['tables'] });
          qc.invalidateQueries({ queryKey: ['dashboardStats'] });
        },
      ],
      [
        'logs:changed',
        (e) => {
          // Infinite activity-log queries are keyed ['activityLogs', 'infinite', ...filters];
          // patch every cached infinite list by prepending the new entry, then
          // refetch counts in the background.
          const raw = parseData(e)?.activityLog;
          if (raw && typeof raw === 'object' && (raw as any).id) {
            const normalized = { ...(raw as any), _id: (raw as any).id };
            const queries = qc.getQueryCache().findAll({ queryKey: ['activityLogs', 'infinite'] });
            queries.forEach((q) => {
              qc.setQueryData(q.queryKey, (old: any) => {
                if (!old?.pages) return old;
                const first = old.pages[0] ?? [];
                if (first.some((l: any) => l && l._id === normalized._id)) return old;
                return { ...old, pages: [[normalized, ...first], ...old.pages.slice(1)] };
              });
            });
          } else {
            qc.invalidateQueries({ queryKey: ['activityLogs'] });
          }
          qc.invalidateQueries({ queryKey: ['activityLogs', 'count'] });
          qc.invalidateQueries({ queryKey: ['dashboardStats'] });
        },
      ],
    ];

    const cleanups = handlers.map(([event, handler]) => {
      eventSource.addEventListener(event, handler as EventListener);
      return () => eventSource.removeEventListener(event, handler as EventListener);
    });

    return () => {
      cleanups.forEach((unsub) => unsub());
    };
  }, [qc]);
};
