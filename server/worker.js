const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const connectDB = require('./config/database');
const backgroundWorker = require('./services/backgroundWorker');

console.log('[Worker Service] Initializing standalone background worker...');

connectDB()
  .then(() => {
    backgroundWorker.start();
    console.log('[Worker Service] Connected to database. Polling for background tasks...');
  })
  .catch((err) => {
    console.error('[Worker Service] Database connection failed:', err.message);
    process.exit(1);
  });

// Graceful termination
process.on('SIGTERM', () => {
  console.log('[Worker Service] SIGTERM received. Gracefully stopping...');
  backgroundWorker.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[Worker Service] SIGINT received. Gracefully stopping...');
  backgroundWorker.stop();
  process.exit(0);
});
