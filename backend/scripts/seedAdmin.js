/**
 * Run this once to create the default admin account:
 * node scripts/seedAdmin.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Admin = require('../models/Admin');

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const username = process.env.DEFAULT_ADMIN_USER || 'admin';
    const password = process.env.DEFAULT_ADMIN_PASS || 'admin123';

    const existing = await Admin.findOne({ username });
    if (existing) {
      console.log(`✅ Admin "${username}" already exists`);
    } else {
      await Admin.create({ username, password });
      console.log(`✅ Admin created — Username: ${username} | Password: ${password}`);
    }

    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err.message);
    process.exit(1);
  }
}

seed();
