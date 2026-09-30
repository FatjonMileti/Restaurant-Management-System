// See retry.ts for why the static import carries @ts-expect-error: the
// package is dual CJS+ESM and every runtime resolves it correctly; only
// tsc's CJS emit reports TS1479.
// @ts-expect-error TS1479: dual-package ESM type resolution under CJS emit
import { SSEServer } from 'node-sse-hub';

/**
 * Server-Sent Events hub (`node-sse-hub`).
 *
 * Contract (unchanged for existing clients):
 * - `GET /events/:userId` opens a stream; the client first receives an
 *   `connected` event.
 * - `emitEvent(event, data, excludeUserId?)` broadcasts to every connected
 *   client except those of the excluded user (the sender already applied
 *   the change optimistically via React Query).
 * - Keep-alive comments every 15s keep proxies (Caddy `flush_interval -1`)
 *   from treating idle streams as dead; `EventSource` ignores them.
 *
 * Deliberately NOT using the hub's history/replay store: history is a
 * global log, while this app broadcasts except-sender. Storing excluded
 * events globally would replay them to whoever reconnects next (the
 * library documents the same caveat for direct messages), so replay
 * stays disabled and delivery remains live-only — exactly like before.
 *
 * This replaces the previous hand-rolled client `Set`, which leaked:
 * `clients.delete({ userId, res })` built a fresh object every time, so
 * disconnects never removed anything.
 */

const sse = new SSEServer({ heartbeatInterval: 15000 });

// node-sse-hub addresses connections by connection id; resolvers address
// the sender by user id — keep the mapping to preserve exclude-sender.
const connectionUsers = new Map<string, string>();

// Swallow hub errors (e.g. a write to a dying socket) so they never crash
// the process; live delivery to the remaining clients is unaffected.
sse.on('error', () => undefined);

let initialized = false;

export const initSSE = (app: any) => {
  if (!initialized) {
    initialized = true;
    sse.on('disconnect', (connection) => {
      const userId = connectionUsers.get(connection.id);
      connectionUsers.delete(connection.id);
    });
  }
  app.get('/events/:userId', (req: any, res: any) => {
    if (!req.params.userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    const connection = sse.connect(req, res);
    const userId = req.params.userId as string;
    connectionUsers.set(connection.id, userId);
    sse.sendTo(connection.id, { event: 'connected', data: {} });
  });
};

// emit event to all clients except those of the given userId
export const emitEvent = (event: string, data?: any, excludeUserId?: string) => {
  const payload = { event, data: data ?? {} };
  const connections = sse.getConnections();
  for (const connection of connections) {
    const userId = connectionUsers.get(connection.id);
    if (excludeUserId && userId === excludeUserId) {
      continue;
    }
    sse.sendTo(connection.id, payload);
  }
};

/** Test/ops introspection: hub stats plus tracked user mappings. */
export const getSSEStats = () => ({
  ...sse.getStats(),
  trackedUsers: connectionUsers.size,
});

/** Graceful shutdown / test teardown. Idempotent. */
export const closeSSE = (): Promise<void> => sse.close();
