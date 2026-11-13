jest.mock('../config/rxdb', () => ({
  getDB: jest.fn(),
}));

import { getDB } from '../config/rxdb.js';
import {
  optionalAiAuth,
  requireAiAdmin,
  requireAiAuth,
} from '../ai/middleware.js';
import { createRateLimiter } from '../ai/rateLimit.js';
import { loadConfirmableDraft } from '../ai/conversation/draftService.js';

const asMock = (value: unknown) => value as jest.Mock;

const mockResponse = () => {
  const res: any = {
    statusCode: 200,
    body: undefined as unknown,
    headers: {} as Record<string, string>,
    status: jest.fn(function (this: any, code: number) {
      this.statusCode = code;
      return this;
    }),
    json: jest.fn(function (this: any, payload: unknown) {
      this.body = payload;
      return this;
    }),
    setHeader: jest.fn((name: string, value: string) => {
      res.headers[name] = value;
    }),
  };
  return res;
};

describe('AI auth middleware', () => {
  it('requires authentication and admin privileges where declared', () => {
    const res = mockResponse();
    const next = jest.fn();
    requireAiAuth({} as any, res, next);
    expect(res.statusCode).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
    expect(next).not.toHaveBeenCalled();

    const customerRes = mockResponse();
    requireAiAdmin(
      { user: { _id: 'u1', role: 'customer' } } as any,
      customerRes,
      jest.fn(),
    );
    expect(customerRes.statusCode).toBe(403);
    expect(customerRes.body.error.code).toBe('FORBIDDEN');

    const adminRes = mockResponse();
    const adminNext = jest.fn();
    requireAiAdmin({ user: { _id: 'a1', role: 'admin' } } as any, adminRes, adminNext);
    expect(adminNext).toHaveBeenCalledTimes(1);
  });

  it('allows anonymous access through optional auth without a token', async () => {
    const req: any = { headers: {} };
    const next = jest.fn();
    await optionalAiAuth(req, mockResponse(), next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toBeUndefined();
    expect(getDB).not.toHaveBeenCalled();
  });
});

describe('AI rate limiter', () => {
  it('allows the configured number of requests and returns Retry-After', () => {
    const limiter = createRateLimiter({
      windowMs: 30_000,
      max: 2,
      keyPrefix: 'test',
      keyGenerator: () => 'same-client',
    });

    const first = mockResponse();
    limiter({} as any, first, jest.fn());
    expect(first.statusCode).toBe(200);

    const second = mockResponse();
    limiter({} as any, second, jest.fn());
    expect(second.statusCode).toBe(200);

    const third = mockResponse();
    const next = jest.fn();
    limiter({} as any, third, next);
    expect(third.statusCode).toBe(429);
    expect(third.body.error.code).toBe('RATE_LIMITED');
    expect(third.headers['Retry-After']).toBeDefined();
    expect(next).not.toHaveBeenCalled();
  });
});

describe('draft ownership and expiry', () => {
  let json: any;
  let update: jest.Mock;

  beforeEach(() => {
    update = jest.fn(async ({ $set }: any) => {
      json = { ...json, ...$set };
      return json;
    });
    json = {
      _id: 'draft-1',
      kind: 'order',
      userId: 'owner-1',
      status: 'pending',
      payload: '{}',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    asMock(getDB).mockResolvedValue({
      aiDrafts: {
        findOne: jest.fn(() => ({
          exec: async () => ({ toJSON: () => json, update }),
        })),
      },
    });
  });

  it('treats another user draft as not found', async () => {
    await expect(loadConfirmableDraft('draft-1', 'someone-else')).rejects.toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
    });
  });

  it('marks an expired draft and refuses to confirm it', async () => {
    json.expiresAt = new Date(Date.now() - 1000).toISOString();
    await expect(loadConfirmableDraft('draft-1', 'owner-1')).rejects.toMatchObject({
      code: 'DRAFT_EXPIRED',
      status: 410,
    });
    expect(update).toHaveBeenCalledWith({ $set: expect.objectContaining({ status: 'expired' }) });
  });

  it('refuses a draft that is already being processed', async () => {
    json.status = 'processing';
    await expect(loadConfirmableDraft('draft-1', 'owner-1')).rejects.toMatchObject({
      code: 'DRAFT_NOT_PENDING',
      status: 409,
    });
  });

  it('returns a pending, unexpired draft for its owner', async () => {
    await expect(loadConfirmableDraft('draft-1', 'owner-1')).resolves.toMatchObject({
      id: 'draft-1',
      kind: 'order',
      status: 'pending',
    });
  });
});
