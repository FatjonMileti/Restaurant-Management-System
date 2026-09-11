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
};

let dbInstance: any = null;

export const getRxDB = async (): Promise<any> => {
  if (dbInstance) return dbInstance;

  const { getRxStorageSQLite } = await import('@basepurpose/rxdb-sqlite');
  const { getNodeAdapter } = await import('@basepurpose/rxdb-sqlite/node');

  dbInstance = await createRxDatabase<{ collections: Collections }>({
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
    version: 0,
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
    version: 1,
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
      status: { type: 'string' },
      createdAt: { type: 'string' },
    },
    required: ['date', 'time', 'guests'],
    indexes: [],
  };

  // Define RestaurantSettings collection schema
  const settingsSchema = {
    title: 'settings schema',
    version: 0,
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
    },
    required: ['tableCount'],
    indexes: [],
  };

  // Identity migrations: v0 -> v1 only adds `ref` metadata (no stored data changes).
  // Convention: whenever a collection schema changes, bump its `version` and add a
  // migration strategy here — otherwise RxDB throws a schema-mismatch error on
  // startup for anyone with an existing SQLite file.
  const identityMigration = (doc: any) => doc;

  await dbInstance.addCollections({
    users: { schema: userSchema },
    menuItems: { schema: menuItemSchema },
    categories: { schema: categorySchema },
    orders: { schema: orderSchema, migrationStrategies: { 1: identityMigration } },
    reservations: { schema: reservationSchema, migrationStrategies: { 1: identityMigration } },
    settings: { schema: settingsSchema },
  });

  return dbInstance;
};
export const getDB = () => {
  if (!dbInstance) throw new Error('Database not initialized. Call getRxDB() first.');
  return dbInstance;
};
