const mongoose = require('mongoose');

let connectAttempt = 0;

const connectDB = async () => {
  const uri = process.env.MONGO_URI?.trim();
  if (!uri) {
    console.error('MONGO_URI is required. Please configure your MongoDB Atlas URI in environment variables.');
    process.exit(1);
  }

  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 10,
    });
    const safeUri = uri.replace(/(\/\/.*:)(.*)(@)/, '$1***$3');
    console.log(`MongoDB Connected to ${safeUri}`);
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
