import 'dotenv/config';
import app from './app.js';
import { connectDB } from './config/db.js';

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`🚀 NovaStyle API running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('\n❌ Failed to start the NovaStyle API.');
    console.error('   Reason:', err.message, '\n');
    console.error('   Most likely the database is not reachable. Checklist:');
    console.error('   1. Is MongoDB running?  (local service, Docker, or MongoDB Atlas)');
    console.error('   2. apps/backend/.env exists and MONGODB_URI is set correctly');
    console.error(`   3. Current MONGODB_URI: ${process.env.MONGODB_URI || '(not set)'}`);
    console.error('   Quick Docker option:  docker run -d -p 27017:27017 --name mongo mongo:7\n');
    process.exit(1);
  }
};

start();

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});
