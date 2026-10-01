// MongoDB replication via the RxDB replication-mongodb plugin
// (`replicateMongoDB` from `rxdb/plugins/replication-mongodb`).
//
// SQLite (via @basepurpose/rxdb-sqlite) stays the local store of truth.
// When MONGODB_URI is set, every collection below replicates two-way and
// live (push + pull, `live: true`) against the MongoDB database, so Mongo
// can serve as shared/cloud persistence (e.g. MongoDB Atlas).
//
// Requirements / notes:
// - The plugin tails MongoDB change streams, so the server must run as a
//   replica set (Atlas does by default; local `mongod` needs `--replSet`).
// - `replicationIdentifier` must stay stable across restarts — RxDB uses it
//   to flag revision history and checkpoint docs. Do not change it.
// - Startup never blocks on Mongo availability and never throws: without
//   MONGODB_URI replication stays disabled (dev/test default).
// - No schema changes are needed: the plugin maps RxDB docs (incl. the
//   `_deleted` flag) to plain Mongo documents via `rxdbDocToMongo`.
//
// SAFETY: starting the plugin against a standalone (non-replica-set) server
// fails every push (transactions) and pull-stream (change streams), and the
// change-stream failure can escape as an uncaught exception and crash the
// process. `startMongoReplication` therefore probes the deployment first via
// `checkMongoDeployment` and only starts replication against a reachable
// replica set. Otherwise the backend keeps serving from local SQLite.

import { MongoClient } from 'mongodb';
import type { Db } from 'mongodb';

export const REPLICATED_COLLECTIONS = [
  'users',
  'menuItems',
  'categories',
  'orders',
  'reservations',
  'settings',
  'activityLogs',
] as const;

export type MongoReplicationConfig = {
  connection: string;
  databaseName: string;
  batchSize: number;
  retryTime: number;
  live: boolean;
};

// Injectable replicate function (defaults to the real `replicateMongoDB`).
// Tests inject a fake so no MongoDB server is needed.
export type ReplicateMongoDBFn = (options: any) => any;

const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  const parsed = value ? Number.parseInt(value, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const isMongoReplicationEnabled = (): boolean => {
  const uri = process.env.MONGODB_URI;
  return !!uri && uri.trim().length > 0;
};

export const getMongoReplicationConfig = (): MongoReplicationConfig => ({
  connection: (process.env.MONGODB_URI as string).trim(),
  databaseName: process.env.MONGODB_DB_NAME?.trim() || 'restaurant',
  batchSize: parsePositiveInt(process.env.MONGODB_REPLICATION_BATCH_SIZE, 50),
  retryTime: parsePositiveInt(process.env.MONGODB_REPLICATION_RETRY_MS, 5000),
  live: process.env.MONGODB_REPLICATION_LIVE?.trim().toLowerCase() !== 'false',
});

export const buildCollectionReplicationOptions = (
  collection: any,
  collectionName: string,
  config: MongoReplicationConfig,
): any => ({
  collection,
  // Stable identifier — see header note. One namespace per collection.
  replicationIdentifier: `restaurant-${collectionName}-mongodb-sync`,
  mongodb: {
    connection: config.connection,
    databaseName: config.databaseName,
    collectionName,
  },
  pull: { batchSize: config.batchSize },
  push: { batchSize: config.batchSize },
  live: config.live,
  retryTime: config.retryTime,
});

const loadReplicateFn = async (): Promise<ReplicateMongoDBFn> => {
  // Dynamic import so dev/test processes without MONGODB_URI never pay for
  // (or fail on) loading the mongodb driver chain.
  const mod = await import('rxdb/plugins/replication-mongodb');
  return mod.replicateMongoDB;
};

let replicationStates: any[] = [];

export const getMongoReplicationStates = (): any[] => [...replicationStates];

export type MongoDeploymentStatus = {
  reachable: boolean;
  replicaSet: boolean;
  setName?: string;
};

export type CheckMongoDeploymentFn = (
  connection: string,
  timeoutMs?: number,
) => Promise<MongoDeploymentStatus>;

// Probe before starting replication: connect with a short timeout and read
// the `hello` response. A replica-set member reports `setName`; a standalone
// server does not (and cannot serve change streams / transactions).
// Never throws — unreachable servers report `{ reachable: false }`.
// The connection string is never logged (it may embed credentials).
export const checkMongoDeployment: CheckMongoDeploymentFn = async (
  connection: string,
  timeoutMs = 5000,
): Promise<MongoDeploymentStatus> => {
  let client: MongoClient | null = null;
  try {
    client = new MongoClient(connection, { serverSelectionTimeoutMS: timeoutMs });
    await client.connect();
    const hello = (await client.db('admin').command({ hello: 1 })) as { setName?: unknown };
    const setName = typeof hello?.setName === 'string' ? hello.setName : undefined;
    return { reachable: true, replicaSet: !!setName, setName };
  } catch {
    return { reachable: false, replicaSet: false };
  } finally {
    try {
      await client?.close();
    } catch {
      // Ignore close errors — the probe result already stands.
    }
  }
};

export type PreImageIssue = { collection: string; message: string };

export type EnsurePreImagesFn = (
  mongoDb: Pick<Db, 'createCollection' | 'command'>,
  collectionNames: readonly string[],
) => Promise<PreImageIssue[]>;

// The plugin opens its change stream with `fullDocumentBeforeChange:
// 'required'`, so every replicated collection must record pre-images.
// Enables `changeStreamPreAndPostImages` via `collMod` (creating the
// collection first when missing). Returns one issue per collection that
// could not be enabled (e.g. missing privileges, unsupported Atlas tier) —
// never throws. Callers must skip replication while issues remain.
export const ensureChangeStreamPreImages: EnsurePreImagesFn = async (
  mongoDb,
  collectionNames,
): Promise<PreImageIssue[]> => {
  const issues: PreImageIssue[] = [];
  for (const name of collectionNames) {
    try {
      try {
        await mongoDb.createCollection(name);
      } catch {
        // Collection already exists (or will be created on first insert) —
        // `collMod` below is the real gate.
      }
      await mongoDb.command({
        collMod: name,
        changeStreamPreAndPostImages: { enabled: true },
      });
    } catch (error) {
      issues.push({
        collection: name,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return issues;
};

export const preImageManualFixHint =
  'Enable pre-images manually per collection (needs dbAdmin/Atlas-admin rights, Atlas M10+). ' +
  'Example: db.runCommand({ collMod: "orders", changeStreamPreAndPostImages: { enabled: true } });';

export type EnsurePreImagesForReplicationFn = (
  config: MongoReplicationConfig,
) => Promise<PreImageIssue[]>;

// Opens a short-lived client (closed before replication starts — the plugin
// manages its own connections) and ensures pre-images on every replicated
// collection. Never throws: failures are returned as issues.
export const ensurePreImagesForReplication: EnsurePreImagesForReplicationFn = async (
  config,
): Promise<PreImageIssue[]> => {
  let client: MongoClient | null = null;
  try {
    client = new MongoClient(config.connection, { serverSelectionTimeoutMS: 5000 });
    await client.connect();
    return await ensureChangeStreamPreImages(client.db(config.databaseName), [
      ...REPLICATED_COLLECTIONS,
    ]);
  } catch (error) {
    return [
      {
        collection: '*',
        message: error instanceof Error ? error.message : String(error),
      },
    ];
  } finally {
    try {
      await client?.close();
    } catch {
      // Ignore close errors — the ensure result already stands.
    }
  }
};
export const startMongoReplication = async (
  db: any,
  replicateFn?: ReplicateMongoDBFn,
  checkDeploymentFn: CheckMongoDeploymentFn = checkMongoDeployment,
  ensurePreImagesFn: EnsurePreImagesForReplicationFn = ensurePreImagesForReplication,
): Promise<any[]> => {
  if (!isMongoReplicationEnabled()) {
    console.log('MongoDB replication disabled (MONGODB_URI not set) — using local SQLite only.');
    return [];
  }

  const config = getMongoReplicationConfig();

  // Never start the plugin against an incompatible/unreachable server (see
  // SAFETY note at the top of this file). The backend keeps serving SQLite;
  // replication picks up on the next restart once MongoDB is a replica set.
  let deployment: MongoDeploymentStatus;
  try {
    deployment = await checkDeploymentFn(config.connection);
  } catch {
    deployment = { reachable: false, replicaSet: false };
  }
  if (!deployment.reachable) {
    console.warn(
      'MongoDB replication skipped: server unreachable — using local SQLite only. ' +
        'Replication will start on the next restart once MongoDB is reachable.',
    );
    return [];
  }
  if (!deployment.replicaSet) {
    console.warn(
      'MongoDB replication skipped: server is standalone (no replica set) — change streams ' +
        'and transactions require one. Using local SQLite only. Convert the deployment ' +
        '(e.g. single-node replica set) and restart to enable replication.',
    );
    return [];
  }

  // The plugin tails the change stream with `fullDocumentBeforeChange:
  // 'required'`, so without pre-images the first delete/update fails the
  // stream and can crash the process — gate on it, and enable it when we
  // can (needs dbAdmin/Atlas-admin rights on the connection user).
  let preImageIssues: PreImageIssue[];
  try {
    preImageIssues = await ensurePreImagesFn(config);
  } catch {
    preImageIssues = [{ collection: '*', message: 'pre-image check failed' }];
  }
  if (preImageIssues.length > 0) {
    for (const issue of preImageIssues) {
      console.warn(
        `MongoDB replication skipped: change-stream pre-images not enabled on '${issue.collection}' (${issue.message}).`,
      );
    }
    console.warn(`MongoDB replication skipped: ${preImageManualFixHint}`);
    return [];
  }

  let replicate: ReplicateMongoDBFn;
  try {
    replicate = replicateFn ?? (await loadReplicateFn());
  } catch (error) {
    console.error(
      'MongoDB replication could not start (failed to load replication plugin):',
      error instanceof Error ? error.message : error,
    );
    return [];
  }

  const started: any[] = [];

  for (const name of REPLICATED_COLLECTIONS) {
    const collection = db?.[name];
    if (!collection) {
      console.warn(`MongoDB replication skipped: collection '${name}' not found on database.`);
      continue;
    }
    try {
      const state = replicate(buildCollectionReplicationOptions(collection, name, config));
      state?.error$?.subscribe?.((err: any) => {
        console.error(
          `MongoDB replication error [${name}]:`,
          err?.message ?? err,
        );
      });
      started.push(state);
      console.log(`MongoDB replication started for collection '${name}'.`);
    } catch (error) {
      // One failing collection must not take down the others (or the server).
      console.error(
        `MongoDB replication failed to start for collection '${name}':`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  replicationStates = started;
  return [...started];
};

export const stopMongoReplication = async (): Promise<void> => {
  const states = replicationStates;
  replicationStates = [];
  await Promise.all(
    states.map(async (state) => {
      try {
        await state?.cancel?.();
      } catch (error) {
        console.error(
          'MongoDB replication failed to stop cleanly:',
          error instanceof Error ? error.message : error,
        );
      }
    }),
  );
};
