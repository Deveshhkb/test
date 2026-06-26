import mongoose from 'mongoose';

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not defined in the environment.');
  }

  mongoose.set('strictQuery', true);

  const conn = await mongoose.connect(uri, {
    autoIndex: process.env.NODE_ENV !== 'production',
  });

  console.log(`✅ MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  return conn;
};
