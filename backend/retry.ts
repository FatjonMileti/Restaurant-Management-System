import { isTransientError as isPackageTransient, retry, type RetryOptions } from 'node-retry-kit';
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
 * Classification delegates to the package's `isTransientError` (SQLite
 * lock codes/messages, retryable network codes incl. `cause`-chain, HTTP
 * 408/425/429/5xx); `AppError`s stay permanently non-retryable on top,
 * since they are domain errors by construction (validation, auth,
 * permission, not-found, "Table is busy" conflicts).
 */

const readCode = (err: unknown): string | undefined => {
  const code = (err as { code?: unknown })?.code;
  return typeof code === 'string' ? code : undefined;
};

/** True only for failures that may succeed if attempted again shortly. */
export const isTransientError = (err: unknown): boolean => {
  // Permanent application errors — including validation, auth and conflict
  // ("Table is busy") — must never be retried.
  if (err instanceof AppError) return false;
  return isPackageTransient(err);
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
    // The documented recipe: never retry user cancellation, only
    // transient failures. `abortedByUser` (not `signal.aborted`, which
    // also fires on per-attempt timeouts) is the correct guard.
    shouldRetry: (error, ctx) => !ctx.abortedByUser && isTransientError(error),
    onRetry: (error, ctx) => {
      logRetryAttempt(operation, error, ctx.attempt, ctx.delay);
    },
  };
  if (sleep) retryOptions.sleep = sleep;
  return retry(() => fn(), retryOptions);
};
