import { createRxDatabase, addRxPlugin } from 'rxdb';
import { RxDBSQLiteAdapter } from '@basepurpose/rxdb-sqlite';
// Validation plugin not required for this setup

if (process.env.NODE_ENV !== 'test') {
  addRxPlugin(RxDBSQLiteAdapter);
}


type Collections = {
  users: any; // RxCollection<UserDoc>
  // other collections will be added later
};

let dbInstance: any = null;

export const getRxDB = async (): Promise<any> => {
  if (dbInstance) return dbInstance;
  dbInstance = await createRxDatabase<{ collections: Collections }>({
    name: 'restaurant-db',
    storage: RxDBSQLiteAdapter,
    ignoreDuplicate: true,
  });

  // Define User collection schema
  const userSchema = {
    title: 'user schema',
    version: 0,
    description: 'user collection',
    type: 'object',
    properties: {
      _id: { type: 'string', primary: true },
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
    properties: {
      _id: { type: 'string', primary: true },
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
    properties: {
      _id: { type: 'string', primary: true },
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
    properties: {
      _id: { type: 'string', primary: true },
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
    properties: {
      _id: { type: 'string', primary: true },
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
    properties: {
      _id: { type: 'string', primary: true },
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


  return dbInstance;
};
