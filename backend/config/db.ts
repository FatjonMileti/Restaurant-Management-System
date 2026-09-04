import { getRxDB } from './rxdb.js';

let dbInstance: any = null;

export const connectDB = async (): Promise<void> => {
  try {
    dbInstance = await getRxDB();
    console.log('RxDB Connected');
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    }
    process.exit(1);
  }
};

export const getDB = () => dbInstance;
export default connectDB;

