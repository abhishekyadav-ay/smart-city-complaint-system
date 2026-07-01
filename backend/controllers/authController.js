const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

const jwtSecret = process.env.JWT_SECRET;
const adminSecretKey = process.env.ADMIN_SECRET_KEY;

const signToken = (admin) =>
  jwt.sign(
    {
      id: admin._id,
      username: admin.username,
      adminId: admin.adminId,
      role: admin.role,
      name: admin.name,
    },
    jwtSecret,
    { expiresIn: '24h' }
  );

const findAdminForLogin = async (loginId) => {
  const normalized = String(loginId || '').trim().toLowerCase();
  const upper = String(loginId || '').trim().toUpperCase();

  return Admin.findOne({
    isActive: true,
    $or: [{ username: normalized }, { adminId: upper }],
  });
};

// POST /api/auth/login — username OR adminId + password
exports.login = async (req, res) => {
  try {
    const { username, password, adminId, loginId } = req.body;
    const identifier = loginId || adminId || username;

    if (!identifier || !password) {
      return res.status(400).json({ message: 'Admin ID (or username) and password are required' });
    }

    const admin = await findAdminForLogin(identifier);
    if (!admin) {
      return res.status(401).json({ message: 'Invalid Admin ID or password' });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid Admin ID or password' });
    }

    res.json({
      success: true,
      token: signToken(admin),
      admin: admin.toSafeJSON(),
      username: admin.username,
      message: 'Login successful',
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ message: 'Server error during login' });
  }
};

// POST /api/auth/register — bootstrap only (secret key)
exports.createAdmin = async (req, res) => {
  try {
    const { username, password, secretKey, name, email } = req.body;

    if (!adminSecretKey) {
      return res.status(500).json({ message: 'Admin registration is disabled until ADMIN_SECRET_KEY is configured' });
    }

    if (secretKey !== adminSecretKey) {
      return res.status(403).json({ message: 'Unauthorized to create admin' });
    }

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const existing = await Admin.findOne({ username: username.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ message: 'Admin with this username already exists' });
    }

    const admin = await Admin.create({
      username: username.toLowerCase().trim(),
      password,
      name: name || username,
      email: email || '',
      role: 'super',
    });

    res.status(201).json({
      success: true,
      message: 'Super admin account created successfully',
      admin: admin.toSafeJSON(),
    });
  } catch (err) {
    console.error('Create admin error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/auth/admins — super admin only
exports.listAdmins = async (req, res) => {
  try {
    const admins = await Admin.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      data: admins.map((admin) => admin.toSafeJSON()),
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load admins' });
  }
};

// POST /api/auth/admins — super admin creates staff admin
exports.createStaffAdmin = async (req, res) => {
  try {
    const { username, password, name, email } = req.body;

    if (!username || !password || !name) {
      return res.status(400).json({ message: 'Name, username, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const existing = await Admin.findOne({ username: username.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ message: 'Username already taken' });
    }

    const admin = await Admin.create({
      username: username.toLowerCase().trim(),
      password,
      name: name.trim(),
      email: (email || '').trim().toLowerCase(),
      role: 'admin',
    });

    res.status(201).json({
      success: true,
      message: 'Admin account created. Share Admin ID and password securely.',
      admin: admin.toSafeJSON(),
    });
  } catch (err) {
    console.error('Create staff admin error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/auth/admins/:id/password — super admin resets password
exports.resetAdminPassword = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const admin = await Admin.findById(req.params.id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    admin.password = password;
    await admin.save();

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update password' });
  }
};

// PATCH /api/auth/admins/:id/status — activate/deactivate
exports.toggleAdminStatus = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    if (String(admin._id) === String(req.admin.id)) {
      return res.status(400).json({ message: 'You cannot deactivate your own account' });
    }

    if (admin.role === 'super') {
      return res.status(400).json({ message: 'Super admin account cannot be deactivated' });
    }

    admin.isActive = req.body.isActive !== false;
    await admin.save();

    res.json({
      success: true,
      message: admin.isActive ? 'Admin activated' : 'Admin deactivated',
      admin: admin.toSafeJSON(),
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update admin status' });
  }
};

// GET /api/auth/verify
exports.verifyToken = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id).select('-password');
    if (!admin || !admin.isActive) {
      return res.status(401).json({ valid: false, message: 'Admin account inactive or not found' });
    }

    res.json({ valid: true, admin: admin.toSafeJSON() });
  } catch (err) {
    res.status(500).json({ message: 'Verification failed' });
  }
};
