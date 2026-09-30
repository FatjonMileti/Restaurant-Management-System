import http from 'http';
import { AddressInfo } from 'net';
import { SSEServer } from 'node-sse-hub';
import { closeSSE, emitEvent, getSSEStats, initSSE } from '../sse';

interface ReceivedFrame {
  event?: string;
  data: string;
}

interface TestClient {
  frames: ReceivedFrame[];
  destroy: () => void;
}

const waitFor = async (
  cond: () => boolean,
  timeoutMs = 2000,
  label = 'condition',
): Promise<void> => {
  const start = Date.now();
  while (!cond()) {
    if (Date.now() - start > timeoutMs) throw new Error(`timed out waiting for ${label}`);
    await new Promise((r) => setTimeout(r, 10));
  }
};

/**
 * Minimal Express-like stub: initSSE only needs `app.get(path, handler)`.
 * Requests are routed to the captured handler with `params.userId` parsed
 * out of the URL, on top of the real IncomingMessage/ServerResponse that
 * the hub requires.
 */
const startTestServer = (): Promise<{ server: http.Server; baseUrl: string }> =>
  new Promise((resolve) => {
    let routeHandler: any;
    initSSE({ get: (_path: string, handler: any) => (routeHandler = handler) });
    const server = http.createServer((req, res) => {
      const match = req.url?.match(/^\/events\/([^/?]+)/);
      if (match && req.method === 'GET') {
        (req as any).params = { userId: decodeURIComponent(match[1]) };
        routeHandler(req, res);
      } else {
        res.statusCode = 404;
        res.end('not found');
      }
    });
    server.listen(0, () => {
      resolve({ server, baseUrl: `http://127.0.0.1:${(server.address() as AddressInfo).port}` });
    });
  });

describe('SSE hub (initSSE / emitEvent)', () => {
  let server: http.Server;
  let baseUrl: string;
  const clients: TestClient[] = [];

  const connectClient = (userId: string): Promise<TestClient> =>
    new Promise((resolve, reject) => {
      const frames: ReceivedFrame[] = [];
      let buffer = '';
      const req = http.get(
        `${baseUrl}/events/${userId}`,
        { headers: { Accept: 'text/event-stream' } },
        (res) => {
          if (res.statusCode !== 200) {
            reject(new Error(`expected 200, got ${res.statusCode}`));
            return;
          }
          const client: TestClient = {
            frames,
            destroy: () => {
              res.destroy();
              req.destroy();
            },
          };
          res.on('data', (chunk: Buffer) => {
            buffer += chunk.toString();
            let idx: number;
            while ((idx = buffer.indexOf('\n\n')) !== -1) {
              const raw = buffer.slice(0, idx);
              buffer = buffer.slice(idx + 2);
              let event: string | undefined;
              const dataLines: string[] = [];
              for (const line of raw.split('\n')) {
                if (line.startsWith('event:')) event = line.slice(6).trim();
                else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
                else if (line.startsWith(':')) continue; // heartbeat comment
              }
              if (event !== undefined || dataLines.length > 0) {
                frames.push({ event, data: dataLines.join('\n') });
              }
            }
          });
          clients.push(client);
          resolve(client);
        },
      );
      req.on('error', reject);
    });

  beforeAll(async () => {
    ({ server, baseUrl } = await startTestServer());
  });

  afterEach(async () => {
    while (clients.length > 0) clients.pop()!.destroy();
    await waitFor(() => getSSEStats().connections === 0, 3000, 'connections to drain');
  });

  afterAll(async () => {
    await closeSSE();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('opens a stream and sends a connected event', async () => {
    const client = await connectClient('user-1');
    await waitFor(() => client.frames.length > 0, 2000, 'connected frame');
    expect(client.frames[0]).toMatchObject({ event: 'connected', data: '{}' });
    expect(getSSEStats().connections).toBe(1);
  });

  it('broadcasts typed payloads to connected clients', async () => {
    const client = await connectClient('user-1');
    await waitFor(() => client.frames.length > 0, 2000, 'connected frame');
    emitEvent('orders:changed', { order: { id: 'o1', status: 'pending' } }, 'someone-else');
    await waitFor(() => client.frames.length > 1, 2000, 'broadcast frame');
    expect(client.frames[1].event).toBe('orders:changed');
    expect(JSON.parse(client.frames[1].data)).toEqual({
      order: { id: 'o1', status: 'pending' },
    });
  });

  it('excludes the sender but delivers to everyone else', async () => {
    const sender = await connectClient('user-1');
    const other = await connectClient('user-2');
    await waitFor(
      () => sender.frames.length > 0 && other.frames.length > 0,
      2000,
      'connected frames',
    );
    emitEvent('menu:changed', { menuItem: { id: 'm1' } }, 'user-1');
    await waitFor(() => other.frames.length > 1, 2000, 'other client frame');
    expect(other.frames[1].event).toBe('menu:changed');
    await new Promise((r) => setTimeout(r, 200));
    expect(sender.frames.length).toBe(1);
  });

  it('fans out to multiple clients', async () => {
    const a = await connectClient('user-1');
    const b = await connectClient('user-2');
    const c = await connectClient('user-3');
    await waitFor(
      () => a.frames.length > 0 && b.frames.length > 0 && c.frames.length > 0,
      2000,
      'connected frames',
    );
    emitEvent('tables:changed', {});
    await waitFor(
      () => a.frames.length > 1 && b.frames.length > 1 && c.frames.length > 1,
      2000,
      'broadcast to all',
    );
    for (const client of [a, b, c]) expect(client.frames[1].event).toBe('tables:changed');
  });

  it('passes delete payloads through untouched', async () => {
    const client = await connectClient('user-1');
    await waitFor(() => client.frames.length > 0, 2000, 'connected frame');
    emitEvent('orders:changed', { order: { id: 'gone', deleted: true } }, 'someone-else');
    await waitFor(() => client.frames.length > 1, 2000, 'delete frame');
    expect(JSON.parse(client.frames[1].data)).toEqual({
      order: { id: 'gone', deleted: true },
    });
  });

  it('cleans up connections on disconnect without leaking', async () => {
    const client = await connectClient('user-1');
    await waitFor(() => client.frames.length > 0, 2000, 'connected frame');
    expect(getSSEStats()).toMatchObject({ connections: 1, trackedUsers: 1 });
    client.destroy();
    await waitFor(
      () => getSSEStats().connections === 0 && getSSEStats().trackedUsers === 0,
      3000,
      'cleanup after disconnect',
    );
  });

  it('handles missing user id and broadcasts with no clients gracefully', async () => {
    const status = await new Promise<number>((resolve) => {
      http
        .get(`${baseUrl}/events`, (res) => resolve(res.statusCode ?? 0))
        .on('error', () => resolve(-1));
    });
    expect(status).toBe(404);
    expect(() => emitEvent('orders:changed', { order: { id: 'o9' } })).not.toThrow();
  });
});

describe('SSE heartbeat keep-alive', () => {
  it('emits heartbeat comments on the configured interval', async () => {
    const hub = new SSEServer({ heartbeatInterval: 50, heartbeatComment: 'hb' });
    const server: http.Server = await new Promise((resolve) => {
      const s = http.createServer((req, res) => hub.connect(req, res)).listen(0, () => resolve(s));
    });
    try {
      const port = (server.address() as AddressInfo).port;
      const comments: string[] = [];
      let buffer = '';
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('no heartbeat received')), 2000);
        const req = http.get(`http://127.0.0.1:${port}/`, (res) => {
          res.on('data', (chunk: Buffer) => {
            buffer += chunk.toString();
            let idx: number;
            while ((idx = buffer.indexOf('\n\n')) !== -1) {
              const raw = buffer.slice(0, idx);
              buffer = buffer.slice(idx + 2);
              if (raw.startsWith(':')) comments.push(raw);
              if (comments.length > 0) {
                clearTimeout(timer);
                res.destroy();
                req.destroy();
                resolve();
              }
            }
          });
        });
        req.on('error', (err) => {
          clearTimeout(timer);
          reject(err);
        });
      });
      expect(comments[0]).toContain('hb');
    } finally {
      await hub.close();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
