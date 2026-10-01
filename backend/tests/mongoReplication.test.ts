import {
  REPLICATED_COLLECTIONS,
  buildCollectionReplicationOptions,
  checkMongoDeployment,
  ensureChangeStreamPreImages,
  getMongoReplicationConfig,
  getMongoReplicationStates,
  isMongoReplicationEnabled,
  startMongoReplication,
  stopMongoReplication,
} from '../config/mongoReplication';

const ORIGINAL_ENV = { ...process.env };

const setEnv = (vars: Record<string, string | undefined>) => {
  for (const [key, value] of Object.entries(vars)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
};

const makeDb = () => {
  const db: Record<string, object> = {};
  for (const name of REPLICATED_COLLECTIONS) db[name] = { name };
  return db;
};

const makeState = () => ({
  cancel: jest.fn().mockResolvedValue(undefined),
  subscribeCalls: [] as any[],
  error$: {
    subscribe(fn: any) {
      (this as any).fn = fn;
      return { unsubscribe: jest.fn() };
    },
  },
});

// Fake deployment probe reporting a healthy single-node replica set.
const replicaSet = async () => ({ reachable: true, replicaSet: true, setName: 'rs0' });

// Fake pre-image gate reporting everything already enabled.
const noPreImageIssues = async () => [];

describe('mongoReplication', () => {
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(async () => {
    await stopMongoReplication();
    process.env = { ...ORIGINAL_ENV };
    jest.restoreAllMocks();
  });

  describe('isMongoReplicationEnabled', () => {
    it('is disabled without MONGODB_URI', () => {
      setEnv({ MONGODB_URI: undefined });
      expect(isMongoReplicationEnabled()).toBe(false);
    });

    it('is disabled for blank MONGODB_URI', () => {
      setEnv({ MONGODB_URI: '   ' });
      expect(isMongoReplicationEnabled()).toBe(false);
    });

    it('is enabled with MONGODB_URI', () => {
      setEnv({ MONGODB_URI: 'mongodb://localhost:27017' });
      expect(isMongoReplicationEnabled()).toBe(true);
    });
  });

  describe('getMongoReplicationConfig', () => {
    it('applies defaults', () => {
      setEnv({
        MONGODB_URI: 'mongodb://localhost:27017',
        MONGODB_DB_NAME: undefined,
        MONGODB_REPLICATION_BATCH_SIZE: undefined,
        MONGODB_REPLICATION_RETRY_MS: undefined,
        MONGODB_REPLICATION_LIVE: undefined,
      });
      expect(getMongoReplicationConfig()).toEqual({
        connection: 'mongodb://localhost:27017',
        databaseName: 'restaurant',
        batchSize: 50,
        retryTime: 5000,
        live: true,
      });
    });

    it('honors overrides and falls back on invalid numbers', () => {
      setEnv({
        MONGODB_URI: 'mongodb://mongo:27017',
        MONGODB_DB_NAME: 'custom',
        MONGODB_REPLICATION_BATCH_SIZE: 'not-a-number',
        MONGODB_REPLICATION_RETRY_MS: '1000',
        MONGODB_REPLICATION_LIVE: 'false',
      });
      const config = getMongoReplicationConfig();
      expect(config.databaseName).toBe('custom');
      expect(config.batchSize).toBe(50);
      expect(config.retryTime).toBe(1000);
      expect(config.live).toBe(false);
    });
  });

  describe('buildCollectionReplicationOptions', () => {
    it('builds stable per-collection options', () => {
      const collection = { name: 'orders' };
      const options = buildCollectionReplicationOptions(collection, 'orders', {
        connection: 'mongodb://localhost:27017',
        databaseName: 'restaurant',
        batchSize: 25,
        retryTime: 1000,
        live: true,
      });
      expect(options.collection).toBe(collection);
      expect(options.replicationIdentifier).toBe('restaurant-orders-mongodb-sync');
      expect(options.mongodb).toEqual({
        connection: 'mongodb://localhost:27017',
        databaseName: 'restaurant',
        collectionName: 'orders',
      });
      expect(options.pull).toEqual({ batchSize: 25 });
      expect(options.push).toEqual({ batchSize: 25 });
      expect(options.live).toBe(true);
      expect(options.retryTime).toBe(1000);
    });
  });

  describe('ensureChangeStreamPreImages', () => {
    it('enables pre-images on every collection', async () => {
      const createCollection = jest.fn().mockResolvedValue(undefined);
      const command = jest.fn().mockResolvedValue({ ok: 1 });
      const issues = await ensureChangeStreamPreImages(
        { createCollection, command } as any,
        ['users', 'orders'],
      );
      expect(issues).toEqual([]);
      expect(createCollection).toHaveBeenCalledTimes(2);
      expect(command).toHaveBeenCalledTimes(2);
      expect(command).toHaveBeenCalledWith({
        collMod: 'users',
        changeStreamPreAndPostImages: { enabled: true },
      });
    });

    it('tolerates already-existing collections', async () => {
      const createCollection = jest.fn().mockRejectedValue(new Error('NamespaceExists'));
      const command = jest.fn().mockResolvedValue({ ok: 1 });
      const issues = await ensureChangeStreamPreImages(
        { createCollection, command } as any,
        ['users'],
      );
      expect(issues).toEqual([]);
      expect(command).toHaveBeenCalledTimes(1);
    });

    it('reports collections whose collMod fails, without throwing', async () => {
      const createCollection = jest.fn().mockResolvedValue(undefined);
      const command = jest
        .fn()
        .mockResolvedValueOnce({ ok: 1 })
        .mockRejectedValueOnce(new Error('not authorized on restaurant to execute command'));
      const issues = await ensureChangeStreamPreImages(
        { createCollection, command } as any,
        ['users', 'orders'],
      );
      expect(issues).toEqual([
        { collection: 'orders', message: 'not authorized on restaurant to execute command' },
      ]);
    });
  });

  describe('checkMongoDeployment', () => {
    it('reports unreachable for a refused connection without throwing', async () => {
      const status = await checkMongoDeployment('mongodb://127.0.0.1:9', 500);
      expect(status).toEqual({ reachable: false, replicaSet: false });
    });
  });

  describe('startMongoReplication', () => {
    it('does nothing without MONGODB_URI', async () => {
      setEnv({ MONGODB_URI: undefined });
      const replicateFn = jest.fn();
      const checkFn = jest.fn();
      const states = await startMongoReplication(makeDb(), replicateFn, checkFn);
      expect(states).toEqual([]);
      expect(replicateFn).not.toHaveBeenCalled();
      expect(checkFn).not.toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('disabled'));
    });

    it('skips replication when MongoDB is unreachable', async () => {
      setEnv({ MONGODB_URI: 'mongodb://localhost:27017' });
      const replicateFn = jest.fn();
      const states = await startMongoReplication(makeDb(), replicateFn, async () => ({
        reachable: false,
        replicaSet: false,
      }));
      expect(states).toEqual([]);
      expect(replicateFn).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('unreachable'));
    });

    it('skips replication against a standalone server', async () => {
      setEnv({ MONGODB_URI: 'mongodb://localhost:27017' });
      const replicateFn = jest.fn();
      const states = await startMongoReplication(makeDb(), replicateFn, async () => ({
        reachable: true,
        replicaSet: false,
      }));
      expect(states).toEqual([]);
      expect(replicateFn).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('standalone'));
    });

    it('treats a throwing deployment check as unreachable', async () => {
      setEnv({ MONGODB_URI: 'mongodb://localhost:27017' });
      const replicateFn = jest.fn();
      const states = await startMongoReplication(makeDb(), replicateFn, async () => {
        throw new Error('probe exploded');
      });
      expect(states).toEqual([]);
      expect(replicateFn).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('unreachable'));
    });

    it('skips replication when pre-images cannot be enabled', async () => {
      setEnv({ MONGODB_URI: 'mongodb://localhost:27017' });
      const replicateFn = jest.fn();
      const states = await startMongoReplication(makeDb(), replicateFn, replicaSet, async () => [
        { collection: 'orders', message: 'not authorized' },
      ]);
      expect(states).toEqual([]);
      expect(replicateFn).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('orders'));
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('pre-images manually'));
    });

    it('treats a throwing pre-image check as a skip', async () => {
      setEnv({ MONGODB_URI: 'mongodb://localhost:27017' });
      const replicateFn = jest.fn();
      const states = await startMongoReplication(makeDb(), replicateFn, replicaSet, async () => {
        throw new Error('probe exploded');
      });
      expect(states).toEqual([]);
      expect(replicateFn).not.toHaveBeenCalled();
    });

    it('starts one two-way live replication per collection', async () => {
      setEnv({ MONGODB_URI: 'mongodb://localhost:27017' });
      const db = makeDb();
      const state = makeState();
      const subscribeSpy = jest.spyOn(state.error$, 'subscribe');
      const replicateFn = jest.fn().mockReturnValue(state);

      const states = await startMongoReplication(db, replicateFn, replicaSet, noPreImageIssues);

      expect(replicateFn).toHaveBeenCalledTimes(REPLICATED_COLLECTIONS.length);
      for (const name of REPLICATED_COLLECTIONS) {
        expect(replicateFn).toHaveBeenCalledWith(
          expect.objectContaining({
            collection: db[name],
            replicationIdentifier: `restaurant-${name}-mongodb-sync`,
            mongodb: expect.objectContaining({ collectionName: name }),
          }),
        );
      }
      expect(subscribeSpy).toHaveBeenCalledTimes(REPLICATED_COLLECTIONS.length);
      expect(states).toHaveLength(REPLICATED_COLLECTIONS.length);
      expect(getMongoReplicationStates()).toHaveLength(REPLICATED_COLLECTIONS.length);
    });

    it('skips collections missing from the database', async () => {
      setEnv({ MONGODB_URI: 'mongodb://localhost:27017' });
      const db = makeDb();
      delete (db as Record<string, unknown>).orders;
      const replicateFn = jest.fn().mockReturnValue(makeState());

      const states = await startMongoReplication(db, replicateFn, replicaSet, noPreImageIssues);

      expect(replicateFn).toHaveBeenCalledTimes(REPLICATED_COLLECTIONS.length - 1);
      expect(replicateFn).not.toHaveBeenCalledWith(
        expect.objectContaining({ replicationIdentifier: 'restaurant-orders-mongodb-sync' }),
      );
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('orders'));
      expect(states).toHaveLength(REPLICATED_COLLECTIONS.length - 1);
    });

    it('isolates a per-collection startup failure', async () => {
      setEnv({ MONGODB_URI: 'mongodb://localhost:27017' });
      const replicateFn = jest
        .fn()
        .mockImplementationOnce(() => {
          throw new Error('boom');
        })
        .mockImplementation(() => makeState());

      const states = await startMongoReplication(makeDb(), replicateFn, replicaSet, noPreImageIssues);

      expect(replicateFn).toHaveBeenCalledTimes(REPLICATED_COLLECTIONS.length);
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('users'),
        expect.stringContaining('boom'),
      );
      expect(states).toHaveLength(REPLICATED_COLLECTIONS.length - 1);
    });

    it('returns empty when every collection fails to start', async () => {
      setEnv({ MONGODB_URI: 'mongodb://localhost:27017' });
      const replicateFn = jest.fn().mockImplementation(() => {
        throw new Error('mongo unreachable');
      });
      const states = await startMongoReplication(makeDb(), replicateFn, replicaSet, noPreImageIssues);
      expect(states).toEqual([]);
      expect(errorSpy).toHaveBeenCalledTimes(REPLICATED_COLLECTIONS.length);
    });
  });

  describe('stopMongoReplication', () => {
    it('cancels started states and clears the registry', async () => {
      setEnv({ MONGODB_URI: 'mongodb://localhost:27017' });
      const first = makeState();
      const second = makeState();
      const replicateFn = jest.fn().mockReturnValueOnce(first).mockReturnValue(second);
      const db = { users: { name: 'users' }, menuItems: { name: 'menuItems' } };

      // Only two collections on this fake db.
      const states = await startMongoReplication(db, replicateFn, replicaSet, noPreImageIssues);
      expect(states).toHaveLength(2);

      await stopMongoReplication();
      expect(first.cancel).toHaveBeenCalledTimes(1);
      expect(second.cancel).toHaveBeenCalledTimes(1);
      expect(getMongoReplicationStates()).toEqual([]);

      // Second stop is a safe no-op.
      await stopMongoReplication();
      expect(first.cancel).toHaveBeenCalledTimes(1);
    });
  });
});
