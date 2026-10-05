const mongoose = require('mongoose');

let isConnecting = false;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1 || isConnecting) {
    return true;
  }
  isConnecting = true;
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[Database] MongoDB Connected successfully`);
    isConnecting = false;
    return true;
  } catch (error) {
    isConnecting = false;
    console.error(`[Database] MongoDB connection failed: ${error.message}`);
    console.warn(`[Database] TIP: Whitelist your current IP on MongoDB Atlas: https://cloud.mongodb.com -> Network Access -> Add IP (0.0.0.0/0 for anywhere)`);

    // Automatically retry connecting in the background
    if (!connectDB._retryTimer) {
      connectDB._retryTimer = setTimeout(async () => {
        connectDB._retryTimer = null;
        console.log(`[Database] Retrying MongoDB connection...`);
        await connectDB();
      }, 5000);
    }
    return false;
  }
};

module.exports = connectDB;
