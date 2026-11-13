import type { Request, RequestHandler } from 'express';
import { AiErrorCodes } from './errors.js';

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  keyPrefix: string;
  keyGenerator?: (req: Request) => string;
}

export class SlidingWindowRateLimiter {
  private readonly hits = new Map<string, number[]>();
  private readonly windowMs: number;
  private readonly max: number;

  constructor(windowMs: number, max: number) {
    this.windowMs = Math.max(1, windowMs);
    this.max = Math.max(1, max);
  }

  consume(key: string, now = Date.now()): { allowed: boolean; retryAfterMs: number } {
    const cutoff = now - this.windowMs;
    const previous = (this.hits.get(key) ?? []).filter((timestamp) => timestamp > cutoff);
    if (previous.length >= this.max) {
      const retryAfterMs = Math.max(0, previous[0] + this.windowMs - now);
      this.hits.set(key, previous);
      return { allowed: false, retryAfterMs };
    }
    previous.push(now);
    this.hits.set(key, previous);
    if (this.hits.size > 10000) {
      for (const [entryKey, timestamps] of this.hits) {
        if (timestamps.every((timestamp) => timestamp <= cutoff)) this.hits.delete(entryKey);
      }
    }
    return { allowed: true, retryAfterMs: 0 };
  }

  reset(): void {
    this.hits.clear();
  }
}

const limiters = new Set<SlidingWindowRateLimiter>();

export const createRateLimiter = (options: RateLimitOptions): RequestHandler => {
  const limiter = new SlidingWindowRateLimiter(options.windowMs, options.max);
  limiters.add(limiter);
  const keyGenerator =
    options.keyGenerator ??
    ((req: Request) => req.user?._id ?? req.ip ?? req.socket?.remoteAddress ?? 'anonymous');

  return (req, res, next) => {
    const key = `${options.keyPrefix}:${keyGenerator(req)}`;
    const result = limiter.consume(key);
    if (!result.allowed) {
      const retryAfterSeconds = Math.max(1, Math.ceil(result.retryAfterMs / 1000));
      res.setHeader('Retry-After', String(retryAfterSeconds));
      res.status(429).json({
        error: {
          code: AiErrorCodes.RATE_LIMITED,
          message: `Too many requests. Please wait ${retryAfterSeconds} second(s) and try again.`,
        },
      });
      return;
    }
    next();
  };
};

/** Test hook. */
export const resetRateLimiters = (): void => {
  for (const limiter of limiters) limiter.reset();
};
