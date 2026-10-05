const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') }); // Load from root
const app = require('./app');
const connectDB = require('./config/database');
const backgroundWorker = require('./services/backgroundWorker');

const mongoose = require('mongoose');

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  const connected = await connectDB();
  if (connected && process.env.DISABLE_IN_PROCESS_WORKER !== 'true') {
    backgroundWorker.start();
  }

  mongoose.connection.on('connected', () => {
    if (process.env.DISABLE_IN_PROCESS_WORKER !== 'true' && !backgroundWorker.running) {
      backgroundWorker.start();
    }
  });
});
