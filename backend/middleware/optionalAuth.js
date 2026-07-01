const jwt = require('jsonwebtoken');

const optionalAuth = (req, res, next) => {
  const authHeader = req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.replace('Bearer ', '').trim();
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return next();
  }

  try {
    req.admin = jwt.verify(token, secret);
  } catch {
    // Invalid token on optional route — treat as public request.
  }
  next();
};

module.exports = optionalAuth;
