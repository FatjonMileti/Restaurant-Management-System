import { createRxDatabase, addRxPlugin } from 'rxdb';
import { RxDBSQLiteAdapter } from '@basepurpose/rxdb-sqlite';
import { RxDBValidatePlugin } from 'rxdb/plugins/validate';

addRxPlugin(RxDBValidatePlugin);
addRxPlugin(RxDBSQLiteAdapter);

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

  await dbInstance.addCollections({
    users: {
      schema: userSchema,
    },
  });

  return dbInstance;
};
