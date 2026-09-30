import { RequestContext } from 'async-context-kit';
import {
  getLogContext,
  getRequestId,
  requestContextMiddleware,
  setRequestUserId,
} from '../requestContext';

const runMiddleware = (headers: Record<string, string | undefined> = {}) =>
  new Promise<{ reqId: string | undefined; responseHeaders: Record<string, string> }>((resolve) => {
    const responseHeaders: Record<string, string> = {};
    const req: any = { headers, method: 'POST', url: '/graphql', path: '/graphql' };
    const res: any = {
      setHeader: (name: string, value: string) => {
        responseHeaders[name.toLowerCase()] = value;
      },
    };
    requestContextMiddleware(req, res, () => {
      resolve({ reqId: getRequestId(), responseHeaders });
    });
  });

describe('request context middleware', () => {
  it('generates a request id when the header is missing and echoes it', async () => {
    const { reqId, responseHeaders } = await runMiddleware();
    expect(reqId).toBeDefined();
    expect(typeof reqId).toBe('string');
    expect(responseHeaders['x-request-id']).toBe(reqId);
  });

  it('propagates a valid incoming x-request-id', async () => {
    const { reqId, responseHeaders } = await runMiddleware({
      'x-request-id': 'order-flow-123',
    });
    expect(reqId).toBe('order-flow-123');
    expect(responseHeaders['x-request-id']).toBe('order-flow-123');
  });

  it('replaces an invalid incoming id instead of trusting it', async () => {
    const { reqId } = await runMiddleware({ 'x-request-id': 'bad\r\ninjected: 1' });
    expect(reqId).toBeDefined();
    expect(reqId).not.toContain('\r');
    expect(reqId).not.toBe('bad\r\ninjected: 1');
  });

  it('is visible through async work without threading arguments', async () => {
    const seen: Array<string | undefined> = await new Promise((resolve) => {
      const req: any = { headers: { 'x-request-id': 'async-propagation' } };
      const res: any = { setHeader: () => undefined };
      // All async work must originate inside next(): that is where the
      // middleware's AsyncLocalStorage scope is active — exactly like
      // downstream Express handlers awaiting services and resolvers.
      requestContextMiddleware(req, res, () => {
        Promise.all([
          (async () => {
            await new Promise((r) => setTimeout(r, 5));
            return getRequestId();
          })(),
          (async () => getRequestId())(),
        ]).then(resolve);
      });
    });
    expect(seen).toEqual(['async-propagation', 'async-propagation']);
  });

  it('keeps concurrent requests isolated', async () => {
    const [a, b] = await Promise.all([
      runMiddleware({ 'x-request-id': 'req-a' }),
      runMiddleware({ 'x-request-id': 'req-b' }),
    ]);
    expect(a.reqId).toBe('req-a');
    expect(b.reqId).toBe('req-b');
  });

  it('never stores secrets in the context', async () => {
    await new Promise<void>((resolve) => {
      const req: any = {
        headers: {
          authorization: 'Bearer super-secret-token',
          cookie: 'session=abc',
          'x-request-id': 'no-secrets',
        },
        method: 'POST',
        url: '/graphql?password=hunter2',
        path: '/graphql',
        body: { password: 'hunter2' },
      };
      const res: any = { setHeader: () => undefined };
      requestContextMiddleware(req, res, () => {
        const ctx = RequestContext.get<any>();
        const dumped = JSON.stringify(ctx);
        expect(dumped).not.toContain('super-secret-token');
        expect(dumped).not.toContain('hunter2');
        expect(ctx?.authorization).toBeUndefined();
        expect(ctx?.cookie).toBeUndefined();
        resolve();
      });
    });
  });
});

describe('getLogContext / setRequestUserId', () => {
  it('returns an empty object outside a request', () => {
    expect(RequestContext.has()).toBe(false);
    expect(getLogContext()).toEqual({});
    expect(getRequestId()).toBeUndefined();
  });

  it('exposes requestId and userId only', async () => {
    await new Promise<void>((resolve) => {
      const req: any = { headers: {}, method: 'GET', url: '/', path: '/' };
      const res: any = { setHeader: () => undefined };
      requestContextMiddleware(req, res, () => {
        setRequestUserId('user-42');
        expect(getLogContext()).toEqual({
          requestId: expect.any(String),
          userId: 'user-42',
        });
        expect(getLogContext()).not.toHaveProperty('token');
        expect(getLogContext()).not.toHaveProperty('password');
        resolve();
      });
    });
  });

  it('setRequestUserId is a no-op outside a request (never throws)', () => {
    expect(() => setRequestUserId('user-1')).not.toThrow();
  });
});
