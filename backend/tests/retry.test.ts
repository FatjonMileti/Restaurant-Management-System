import {
  authError,
  conflictError,
  forbiddenError,
  notFoundError,
  validationError,
} from '../graphql/errors';
import { isTransientError, withTransientRetry } from '../retry';

const sqliteBusy = () => Object.assign(new Error('database is locked'), { code: 'SQLITE_BUSY' });

const immediateSleep = (seen: number[]) => async (ms: number) => {
  seen.push(ms);
};

describe('isTransientError', () => {
  it.each([['SQLITE_BUSY'], ['SQLITE_LOCKED'], ['SQLITE_PROTOCOL'], ['SQLITE_IOERR']])(
    'treats %s as transient',
    (code) => {
      expect(isTransientError(Object.assign(new Error(code), { code }))).toBe(true);
    },
  );

  it('treats lock messages without a code as transient', () => {
    expect(isTransientError(new Error('database is locked'))).toBe(true);
    expect(isTransientError(new Error('SQLITE_BUSY: database is locked'))).toBe(true);
  });

  it('treats retryable network/system failures as transient', () => {
    expect(isTransientError(Object.assign(new Error('reset'), { code: 'ECONNRESET' }))).toBe(true);
    expect(isTransientError(Object.assign(new Error('x'), { statusCode: 503 }))).toBe(true);
    expect(isTransientError(Object.assign(new Error('x'), { status: 429 }))).toBe(true);
    const timeout = new Error('attempt timed out');
    timeout.name = 'TimeoutError';
    expect(isTransientError(timeout)).toBe(true);
  });

  it('never treats permanent application errors as transient', () => {
    for (const err of [
      validationError('Name is required'),
      authError(),
      authError('Invalid email or password'),
      forbiddenError('Not authorized, admin only'),
      notFoundError('Order not found'),
      conflictError('Table is busy'),
      new Error('prt: UNIQUE constraint failed'),
    ]) {
      expect(isTransientError(err)).toBe(false);
    }
  });

  it('does not retry unknown errors by default', () => {
    expect(isTransientError(new Error('some bug'))).toBe(false);
    expect(isTransientError('string failure')).toBe(false);
  });
});

describe('withTransientRetry', () => {
  it('returns the result when the operation succeeds first try', async () => {
    const seen: number[] = [];
    const fn = jest.fn().mockResolvedValue('ok');
    await expect(
      withTransientRetry(fn, { jitter: false, sleep: immediateSleep(seen) }),
    ).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(seen).toEqual([]);
  });

  it('recovers after transient failures', async () => {
    const seen: number[] = [];
    const fn = jest
      .fn()
      .mockRejectedValueOnce(sqliteBusy())
      .mockRejectedValueOnce(sqliteBusy())
      .mockResolvedValue('recovered');
    await expect(
      withTransientRetry(fn, { jitter: false, sleep: immediateSleep(seen) }),
    ).resolves.toBe('recovered');
    expect(fn).toHaveBeenCalledTimes(3);
    expect(seen).toEqual([50, 100]);
  });

  it('gives up after exhausting retries and rethrows the original error', async () => {
    const seen: number[] = [];
    const failure = sqliteBusy();
    const fn = jest.fn().mockRejectedValue(failure);
    await expect(
      withTransientRetry(fn, { retries: 2, jitter: false, sleep: immediateSleep(seen) }),
    ).rejects.toBe(failure);
    expect(fn).toHaveBeenCalledTimes(3);
    expect(seen).toEqual([50, 100]);
  });

  it.each([
    ['validation', validationError('Name is required')],
    ['auth', authError()],
    ['forbidden', forbiddenError('nope')],
    ['not found', notFoundError('Order not found')],
    ['conflict', conflictError('Table is busy')],
  ])('does not retry permanent %s errors', async (_label, err) => {
    const fn = jest.fn().mockRejectedValue(err);
    await expect(withTransientRetry(fn, { sleep: immediateSleep([]) })).rejects.toBe(err);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('applies exponential backoff capped by maxDelay', async () => {
    const seen: number[] = [];
    const fn = jest.fn().mockRejectedValue(sqliteBusy());
    await expect(
      withTransientRetry(fn, {
        retries: 3,
        backoff: 'exponential',
        delay: 500,
        maxDelay: 600,
        jitter: false,
        sleep: immediateSleep(seen),
      }),
    ).rejects.toThrow('database is locked');
    expect(seen).toEqual([500, 600, 600]);
  });

  it('applies full jitter deterministically with an injected random source', async () => {
    const seen: number[] = [];
    const fn = jest.fn().mockRejectedValue(sqliteBusy());
    await expect(
      withTransientRetry(fn, {
        retries: 2,
        delay: 100,
        jitter: true,
        random: () => 0.5,
        sleep: immediateSleep(seen),
      }),
    ).rejects.toThrow();
    expect(seen).toEqual([50, 100]);
  });

  it('fails fast with zero retries configured', async () => {
    const fn = jest.fn().mockRejectedValue(sqliteBusy());
    await expect(withTransientRetry(fn, { retries: 0, sleep: immediateSleep([]) })).rejects.toThrow(
      'database is locked',
    );
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('supports per-attempt timeouts', async () => {
    const hanging = jest.fn().mockImplementation(() => new Promise(() => undefined));
    await expect(
      withTransientRetry(hanging, { retries: 1, delay: 1, jitter: false, timeout: 20 }),
    ).rejects.toMatchObject({ name: 'TimeoutError' });
    expect(hanging).toHaveBeenCalledTimes(2);
  }, 10000);

  it('stops retrying when the caller aborts', async () => {
    const controller = new AbortController();
    const seen: number[] = [];
    const fn = jest.fn().mockImplementation(async () => {
      controller.abort();
      throw sqliteBusy();
    });
    await expect(
      withTransientRetry(fn, {
        retries: 10,
        jitter: false,
        signal: controller.signal,
        sleep: immediateSleep(seen),
      }),
    ).rejects.toThrow();
    expect(fn.mock.calls.length).toBeLessThan(11);
  });
});
