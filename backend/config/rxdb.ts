import { createRxDatabase } from 'rxdb';

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
      items: { type: 'array', items: { type: 'string' } },
      table: { type: 'number' },
      status: { type: 'string' },
      createdAt: { type: 'string', format: 'date-time' },
    },
    required: ['items', 'table', 'status'],
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
      name: { type: 'string' },
      phone: { type: 'string' },
      date: { type: 'string', format: 'date-time' },
      table: { type: 'number' },
      status: { type: 'string' },
    },
    required: ['name', 'phone', 'date', 'table'],
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


