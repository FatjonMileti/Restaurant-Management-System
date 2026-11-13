import { createRxDatabase, addRxPlugin } from 'rxdb';
import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder';
import { RxDBUpdatePlugin } from 'rxdb/plugins/update';
import { RxDBCleanupPlugin } from 'rxdb/plugins/cleanup';
import { RxDBLeaderElectionPlugin } from 'rxdb/plugins/leader-election';
import { RxDBMigrationSchemaPlugin } from 'rxdb/plugins/migration-schema';

addRxPlugin(RxDBLeaderElectionPlugin);
addRxPlugin(RxDBCleanupPlugin);
addRxPlugin(RxDBQueryBuilderPlugin);
addRxPlugin(RxDBUpdatePlugin);
addRxPlugin(RxDBMigrationSchemaPlugin);

type Collections = {
  users: any;
  menuItems: any;
  categories: any;
  orders: any;
  reservations: any;
  settings: any;
  activityLogs: any;
  aiConversations: any;
  aiMessages: any;
  aiKnowledgeDocuments: any;
  aiKnowledgeChunks: any;
  aiDrafts: any;
};

let dbInstance: any = null;
let dbInitPromise: Promise<any> | null = null;

export const getRxDB = async (): Promise<any> => {
  if (dbInstance) return dbInstance;
  // Share the in-flight init so concurrent callers (e.g. server startup and
  // the /seed route) don't create the database twice (RxDB DB8 error).
  if (!dbInitPromise) {
    dbInitPromise = initRxDB().then(
      (db) => {
        dbInstance = db;
        return db;
      },
      (err) => {
        dbInitPromise = null;
        throw err;
      },
    );
  }
  return dbInitPromise;
};

const initRxDB = async (): Promise<any> => {
  const { getRxStorageSQLite } = await import('@basepurpose/rxdb-sqlite');
  const { getNodeAdapter } = await import('@basepurpose/rxdb-sqlite/node');

  const db = await createRxDatabase<{ collections: Collections }>({
    name: 'restaurant-db',
    storage: getRxStorageSQLite({ adapter: getNodeAdapter }),
  });

  // Define User collection schema
  const userSchema = {
    title: 'user schema',
    version: 0,
    description: 'user collection',
    type: 'object',
    primaryKey: '_id',
    properties: {
      _id: { type: 'string', maxLength: 100 },
      name: { type: 'string' },
      email: { type: 'string', unique: true },
      password: { type: 'string' },
      role: { type: 'string', enum: ['customer', 'staff', 'admin'], default: 'customer' },
      phone: { type: 'string' },
    },
    required: ['name', 'email', 'password'],
    indexes: ['email'],
  };

  // Define MenuItem collection schema
  const menuItemSchema = {
    title: 'menuItem schema',
    version: 1,
    description: 'menuItem collection',
    type: 'object',
    primaryKey: '_id',
    properties: {
      _id: { type: 'string', maxLength: 100 },
      name: { type: 'string' },
      description: { type: 'string' },
      price: { type: 'number' },
      category: { type: 'string' },
      image: { type: 'string' },
      available: { type: 'boolean' },
      updatedAt: { type: 'string' },
    },
    required: ['name', 'price'],
    indexes: ['category'],
  };

  // Define Category collection schema
  const categorySchema = {
    title: 'category schema',
    version: 0,
    description: 'category collection',
    type: 'object',
    primaryKey: '_id',
    properties: {
      _id: { type: 'string', maxLength: 100 },
      name: { type: 'string' },
    },
    required: ['name'],
    indexes: [],
  };

  // Define Order collection schema
  // NOTE: `user` holds a users._id, so it declares `ref: 'users'` to document the
  // FK. Do NOT call doc.populate() — it is broken with the @basepurpose/rxdb-sqlite
  // adapter (returns docs with all fields emptied); resolvers rely on the findOne
  // fallback in formatters instead.
  // `items[].menuItem` intentionally has no ref (nested-array populate is unreliable
  // with this stack) — order resolvers resolve it via buildMenuItemMap() instead.
  // `menuItems.category` intentionally has no ref — it stores the category *name*,
  // not the category _id, so a ref could never resolve.
  const orderSchema = {
    title: 'order schema',
    version: 1,
    description: 'order collection',
    type: 'object',
    primaryKey: '_id',
    properties: {
      _id: { type: 'string', maxLength: 100 },
      user: { type: 'string', ref: 'users' },
      items: { type: 'array', items: { type: 'object' } },
      totalAmount: { type: 'number' },
      tableNumber: { type: 'number' },
      paymentMethod: { type: 'string' },
      status: { type: 'string' },
      createdAt: { type: 'string' },
    },
    required: ['status'],
    indexes: [],
  };

  // Define Reservation collection schema
  // NOTE: `user` declares `ref: 'users'` to document the FK (see order schema
  // note on why populate() must not be called).
  const reservationSchema = {
    title: 'reservation schema',
    version: 2,
    description: 'reservation collection',
    type: 'object',
    primaryKey: '_id',
    properties: {
      _id: { type: 'string', maxLength: 100 },
      user: { type: 'string', ref: 'users' },
      date: { type: 'string' },
      time: { type: 'string' },
      guests: { type: 'number' },
      tableNumber: { type: 'number' },
      specialRequests: { type: 'string' },
      clientName: { type: 'string' },
      clientPhone: { type: 'string' },
      clientEmail: { type: 'string' },
      status: { type: 'string' },
      createdAt: { type: 'string' },
    },
    required: ['date', 'time', 'guests'],
    indexes: [],
  };

  // Define RestaurantSettings collection schema
  const settingsSchema = {
    title: 'settings schema',
    version: 1,
    description: 'restaurant settings collection',
    type: 'object',
    primaryKey: '_id',
    properties: {
      _id: { type: 'string', maxLength: 100 },
      name: { type: 'string' },
      logo: { type: 'string' },
      address: { type: 'string' },
      phone: { type: 'string' },
      email: { type: 'string' },
      tableCount: { type: 'number' },
      updatedAt: { type: 'string' },
    },
    required: ['tableCount'],
    indexes: [],
  };

  // Activity log: append-only record of restaurant actions for the admin logs page.
  const activityLogSchema = {
    title: 'activityLog schema',
    version: 0,
    description: 'activity log collection',
    type: 'object',
    primaryKey: '_id',
    properties: {
      _id: { type: 'string', maxLength: 100 },
      actorId: { type: 'string' },
      actorName: { type: 'string' },
      actorRole: { type: 'string' },
      action: { type: 'string' },
      entity: { type: 'string' },
      entityId: { type: 'string' },
      summary: { type: 'string' },
      createdAt: { type: 'string' },
    },
    required: ['action', 'entity', 'createdAt'],
    indexes: ['createdAt', 'entity', 'action'],
  };

  // ---- AI assistant collections -------------------------------------------------
  // New collections only; existing schemas/versions above are untouched.
  // Embeddings are stored as JSON strings because the RxDB SQLite adapter has no
  // vector-search extension. Retrieval loads a bounded set and scores in process.
  const aiConversationSchema = {
    title: 'aiConversation schema',
    version: 0,
    description: 'virtual waitress conversation',
    type: 'object',
    primaryKey: '_id',
    properties: {
      _id: { type: 'string', maxLength: 100 },
      userId: { type: 'string' },
      title: { type: 'string' },
      status: { type: 'string' },
      createdAt: { type: 'string' },
      updatedAt: { type: 'string' },
    },
    required: ['userId', 'createdAt', 'updatedAt'],
    indexes: ['userId', 'updatedAt'],
  };

  const aiMessageSchema = {
    title: 'aiMessage schema',
    version: 0,
    description: 'virtual waitress message',
    type: 'object',
    primaryKey: '_id',
    properties: {
      _id: { type: 'string', maxLength: 100 },
      conversationId: { type: 'string' },
      role: { type: 'string' },
      content: { type: 'string' },
      toolName: { type: 'string' },
      toolPayload: { type: 'string' },
      createdAt: { type: 'string' },
    },
    required: ['conversationId', 'role', 'content', 'createdAt'],
    indexes: ['conversationId', 'createdAt'],
  };

  const aiKnowledgeDocumentSchema = {
    title: 'aiKnowledgeDocument schema',
    version: 0,
    description: 'approved customer-facing knowledge document',
    type: 'object',
    primaryKey: '_id',
    properties: {
      _id: { type: 'string', maxLength: 100 },
      title: { type: 'string' },
      sourceType: { type: 'string' },
      content: { type: 'string' },
      metadata: { type: 'string' },
      checksum: { type: 'string' },
      embeddingStatus: { type: 'string' },
      chunkCount: { type: 'number' },
      createdAt: { type: 'string' },
      updatedAt: { type: 'string' },
    },
    required: ['title', 'content', 'createdAt', 'updatedAt'],
    indexes: ['sourceType', 'updatedAt'],
  };

  const aiKnowledgeChunkSchema = {
    title: 'aiKnowledgeChunk schema',
    version: 0,
    description: 'knowledge chunk with serialized embedding',
    type: 'object',
    primaryKey: '_id',
    properties: {
      _id: { type: 'string', maxLength: 100 },
      documentId: { type: 'string' },
      chunkIndex: { type: 'number' },
      content: { type: 'string' },
      embedding: { type: 'string' },
      embeddingModel: { type: 'string' },
      createdAt: { type: 'string' },
    },
    required: ['documentId', 'chunkIndex', 'content', 'createdAt'],
    indexes: ['documentId'],
  };

  const aiDraftSchema = {
    title: 'aiDraft schema',
    version: 0,
    description: 'server-validated order/reservation draft awaiting explicit confirmation',
    type: 'object',
    primaryKey: '_id',
    properties: {
      _id: { type: 'string', maxLength: 100 },
      kind: { type: 'string' },
      userId: { type: 'string' },
      status: { type: 'string' },
      payload: { type: 'string' },
      confirmationHash: { type: 'string' },
      idempotencyKey: { type: 'string' },
      expiresAt: { type: 'string' },
      createdAt: { type: 'string' },
      updatedAt: { type: 'string' },
      completedAt: { type: 'string' },
      result: { type: 'string' },
    },
    required: ['kind', 'userId', 'status', 'payload', 'expiresAt', 'createdAt', 'updatedAt'],
    indexes: ['userId', 'status'],
  };

  // Identity migrations: v0 -> v1 only adds `ref` metadata (no stored data changes).
  // Convention: whenever a collection schema changes, bump its `version` and add a
  // migration strategy here — otherwise RxDB throws a schema-mismatch error on
  // startup for anyone with an existing SQLite file.
  const identityMigration = (doc: any) => doc;

  await db.addCollections({
    users: { schema: userSchema },
    menuItems: { schema: menuItemSchema, migrationStrategies: { 1: identityMigration } },
    categories: { schema: categorySchema },
    orders: { schema: orderSchema, migrationStrategies: { 1: identityMigration } },
    reservations: {
      schema: reservationSchema,
      migrationStrategies: { 0: identityMigration, 1: identityMigration, 2: identityMigration },
    },
    settings: { schema: settingsSchema, migrationStrategies: { 1: identityMigration } },
    activityLogs: { schema: activityLogSchema },
    aiConversations: { schema: aiConversationSchema },
    aiMessages: { schema: aiMessageSchema },
    aiKnowledgeDocuments: { schema: aiKnowledgeDocumentSchema },
    aiKnowledgeChunks: { schema: aiKnowledgeChunkSchema },
    aiDrafts: { schema: aiDraftSchema },
  });

  // MongoDB replication (RxDB replication-mongodb plugin). No-op unless
  // MONGODB_URI is set; never throws, never blocks on Mongo availability.
  const { startMongoReplication } = await import('./mongoReplication.js');
  await startMongoReplication(db);

  return db;
};
export const getDB = () => {
  if (!dbInstance) throw new Error('Database not initialized. Call getRxDB() first.');
  return dbInstance;
};
