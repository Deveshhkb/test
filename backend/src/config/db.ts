import mongoose from 'mongoose';
import { env } from './env';

export const connectDB = async (): Promise<void> => {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongoUri);
  console.log(`[db] connected → ${mongoose.connection.name}`);
};

export const disconnectDB = async (): Promise<void> => {
  await mongoose.disconnect();
};
