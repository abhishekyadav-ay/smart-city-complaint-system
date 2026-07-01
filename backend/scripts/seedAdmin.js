/**
 * Run once to create the first super admin:
 * npm run seed-admin
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const { generateUniqueAdminId } = require('../utils/generateAdminId');

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const username = (process.env.DEFAULT_ADMIN_USER || 'superadmin').toLowerCase();
    const password = process.env.DEFAULT_ADMIN_PASS || 'SuperAdmin@2024';
    const name = process.env.DEFAULT_ADMIN_NAME || 'Super Administrator';
    const email = (process.env.ADMIN_EMAIL || '').toLowerCase();

    let admin = await Admin.findOne({ username });

    if (admin) {
      let updated = false;
      if (!admin.adminId) {
        admin.adminId = await generateUniqueAdminId();
        updated = true;
      }
      if (admin.role !== 'super') {
        admin.role = 'super';
        updated = true;
      }
      if (!admin.name) {
        admin.name = name;
        updated = true;
      }
      if (updated) {
        await admin.save();
      }
      console.log('✅ Super admin already exists');
      console.log(`   Admin ID : ${admin.adminId}`);
      console.log(`   Username : ${admin.username}`);
      console.log(`   Password : (unchanged — use existing password)`);
    } else {
      admin = await Admin.create({
        username,
        password,
        name,
        email,
        role: 'super',
      });
      console.log('✅ Super admin created');
      console.log(`   Admin ID : ${admin.adminId}`);
      console.log(`   Username : ${admin.username}`);
      console.log(`   Password : ${password}`);
    }

    console.log('\nLogin with Admin ID OR username + your password.');
    console.log('Super admin can create more admins from Admin Portal → Manage Admins.');

    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err.message);
    process.exit(1);
  }
}

seed();
