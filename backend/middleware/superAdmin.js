const superAdmin = (req, res, next) => {
  if (req.admin?.role !== 'super') {
    return res.status(403).json({ message: 'Super admin access required' });
  }
  next();
};

module.exports = superAdmin;
