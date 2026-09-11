import { getRxDB } from './rxdb.js';

export const connectDB = async (): Promise<void> => {
  try {
    await getRxDB();
    console.log('RxDB Connected');
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    }
    process.exit(1);
  }
};

export default connectDB;
