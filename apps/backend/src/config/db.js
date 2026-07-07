import mongoose from 'mongoose';

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      'MONGODB_URI is not defined. Create apps/backend/.env (copy .env.example) and set MONGODB_URI.'
    );
  }

  mongoose.set('strictQuery', true);

  const conn = await mongoose.connect(uri, {
    autoIndex: process.env.NODE_ENV !== 'production',
    // Fail fast (8s) instead of hanging ~30s when the DB is unreachable.
    serverSelectionTimeoutMS: 8000,
  });

  console.log(`✅ MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  return conn;
};
