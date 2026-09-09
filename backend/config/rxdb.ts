import { createRxDatabase, addRxPlugin } from 'rxdb';
import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder';
import { RxDBUpdatePlugin } from 'rxdb/plugins/update';
import { RxDBCleanupPlugin } from 'rxdb/plugins/cleanup';
import { RxDBLeaderElectionPlugin } from 'rxdb/plugins/leader-election';

addRxPlugin(RxDBLeaderElectionPlugin);
addRxPlugin(RxDBCleanupPlugin);
addRxPlugin(RxDBQueryBuilderPlugin);
addRxPlugin(RxDBUpdatePlugin);

type Collections = {
  users: any;
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
  const orderSchema = {
    title: 'order schema',
    version: 0,
    description: 'order collection',
    type: 'object',
    primaryKey: '_id',
    properties: {
      _id: { type: 'string', maxLength: 100 },
      user: { type: 'string' },
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
  const reservationSchema = {
    title: 'reservation schema',
    version: 0,
    description: 'reservation collection',
    type: 'object',
    primaryKey: '_id',
    properties: {
      _id: { type: 'string', maxLength: 100 },
      user: { type: 'string' },
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

  await dbInstance.addCollections({
    users: { schema: userSchema },
    menuItems: { schema: menuItemSchema },
    categories: { schema: categorySchema },
    orders: { schema: orderSchema },
    reservations: { schema: reservationSchema },
    settings: { schema: settingsSchema },
  });
};
export const getDB = () => dbInstance;


