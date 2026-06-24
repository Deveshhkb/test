import mongoose from 'mongoose';

/**
 * Connect to MongoDB. Falls back gracefully with a clear error message so the
 * developer knows the database is unreachable instead of getting a silent hang.
 */
const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('✖ MONGO_URI is not set. Copy .env.example to .env first.');
    process.exit(1);
  }

  try {
    mongoose.set('strictQuery', true);
    const conn = await mongoose.connect(uri);
    console.log(`✔ MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`✖ MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
