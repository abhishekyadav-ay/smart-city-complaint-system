const mongoose = require('mongoose');

let connectAttempt = 0;

const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri || !uri.trim()) {
    connectAttempt += 1;
    const delayMs = Math.min(30000, 2000 * connectAttempt);
    console.error(
      `MONGO_URI is not set. Retrying MongoDB connection in ${delayMs / 1000}s (attempt ${connectAttempt}).`
    );
    setTimeout(() => {
      connectDB();
    }, delayMs);
    return;
  }

  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000
    });
    console.log('MongoDB Connected');
  } catch (err) {
    connectAttempt += 1;
    const delayMs = Math.min(30000, 2000 * connectAttempt);
    console.error(`MongoDB connection error: ${err.message}. Retrying in ${delayMs / 1000}s.`);
    setTimeout(() => {
      connectDB();
    }, delayMs);
  }
};

module.exports = connectDB;
