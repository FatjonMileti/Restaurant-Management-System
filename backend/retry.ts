// Static import is correct at runtime in every environment (tsx, jest ESM,
// and the compiled CJS `require()`, which resolves the package's `require`
// condition to its `.cjs` build — verified). tsc under `module: node16`
// without `"type": "module"` still reports TS1479 for dual CJS+ESM
// packages, so the error is suppressed here rather than restructuring to
// dynamic imports (which would add async indirection to every retry call).
// @ts-expect-error TS1479: dual-package ESM type resolution under CJS emit
import { retry, type RetryOptions } from 'node-retry-kit';
import { AppError } from './graphql/errors.js';
import { getLogContext } from './requestContext.js';

/**
 * Transient-failure retry for local persistence operations.
 *
 * The backend has no external HTTP dependencies — every resolver talks
 * to embedded SQLite through RxDB. Concurrent writes (two staff devices
 * creating orders, a mutation racing the activity-log insert) can surface
 * `SQLITE_BUSY` / `SQLITE_LOCKED`, which always clear on their own. Those
 * — and only those — are worth retrying with a short exponential backoff.
 *
 * Never retried: validation errors, auth failures, permission errors,
 * not-found / conflict domain errors, and any other permanent `AppError`.
 */

const TRANSIENT_SQLITE_CODES = new Set([
  'SQLITE_BUSY',
  'SQLITE_LOCKED',
  'SQLITE_PROTOCOL',
  'SQLITE_IOERR',
]);

const TRANSIENT_MESSAGE_HINTS = [
  /SQLITE_(BUSY|LOCKED|PROTOCOL|IOERR)/i,
  /database (is|table is) locked/i,
];

const TRANSIENT_SYSTEM_CODES = new Set(['ECONNRESET', 'ETIMEDOUT', 'EPIPE', 'EAI_AGAIN']);

const TRANSIENT_HTTP_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

const readCode = (err: unknown): string | undefined => {
  const code = (err as { code?: unknown })?.code;
  return typeof code === 'string' ? code : undefined;
};

const readStatus = (err: unknown): number | undefined => {
  const status =
    (err as { status?: unknown; statusCode?: unknown })?.status ??
    (err as { statusCode?: unknown })?.statusCode;
  return typeof status === 'number' ? status : undefined;
};

/** True only for failures that may succeed if attempted again shortly. */
export const isTransientError = (err: unknown): boolean => {
  // Permanent application errors — including validation, auth and conflict
  // ("Table is busy") — must never be retried.
  if (err instanceof AppError) return false;
  if (err instanceof Error && err.name === 'AbortError') return false;
  // Per-attempt timeouts from node-retry-kit are retryable by design.
  if (err instanceof Error && err.name === 'TimeoutError') return true;
  const code = readCode(err);
  if (code && (TRANSIENT_SQLITE_CODES.has(code) || TRANSIENT_SYSTEM_CODES.has(code))) return true;
  const status = readStatus(err);
  if (status !== undefined && TRANSIENT_HTTP_STATUSES.has(status)) return true;
  if (err instanceof Error && TRANSIENT_MESSAGE_HINTS.some((re) => re.test(err.message))) {
    return true;
  }
  return false;
};

export interface TransientRetryOptions {
  retries?: number;
  backoff?: 'fixed' | 'exponential';
  delay?: number;
  maxDelay?: number;
  jitter?: boolean | 'full' | 'equal';
  timeout?: number;
  signal?: AbortSignal;
  random?: () => number;
  /** @internal injectable wait, used by tests to skip real timers. */
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
  /** Label for retry-attempt log lines (e.g. `orders.insert`). */
  operation?: string;
}

const logRetryAttempt = (operation: string, error: unknown, attempt: number, delay: number) => {
  const err = error instanceof Error ? error : new Error(String(error));
  console.warn(
    JSON.stringify({
      level: 'warn',
      msg: `retrying transient failure (${operation})`,
      ...getLogContext(),
      attempt,
      delayMs: delay,
      errorName: err.name,
      errorCode: readCode(error),
      errorMessage: err.message,
    }),
  );
};

/**
 * Run `fn` with exponential backoff + jitter, retrying only transient
 * failures. The original error is rethrown unwrapped on exhaustion (or
 * immediately for permanent errors), so existing error handling and
 * GraphQL error codes are preserved.
 */
export const withTransientRetry = <T>(
  fn: () => T | Promise<T>,
  options: TransientRetryOptions = {},
): Promise<T> => {
  const { operation = 'operation', sleep, ...rest } = options;
  const retryOptions: RetryOptions = {
    retries: 3,
    backoff: 'exponential',
    delay: 50,
    maxDelay: 1000,
    jitter: true,
    ...rest,
    shouldRetry: (error) => {
      // The per-attempt signal aborts on every timeout — that must not stop
      // retries. Only the caller-owned signal means "stop".
      if (options.signal?.aborted) return false;
      return isTransientError(error);
    },
    onRetry: (error, ctx) => {
      logRetryAttempt(operation, error, ctx.attempt, ctx.delay);
    },
  };
  if (sleep) retryOptions.sleep = sleep;
  return retry(() => fn(), retryOptions);
};
