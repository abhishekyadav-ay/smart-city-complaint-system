const generateAdminId = () => {
  const suffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ADM-${suffix}`;
};

const generateUniqueAdminId = async () => {
  const Admin = require('../models/Admin');

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const adminId = generateAdminId();
    const exists = await Admin.findOne({ adminId }).select('_id');
    if (!exists) return adminId;
  }
  return `ADM-${Date.now().toString(36).toUpperCase()}`;
};

module.exports = { generateAdminId, generateUniqueAdminId };
