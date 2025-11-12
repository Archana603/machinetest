const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.authenticate = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'defaultsecret');
    req.user = await User.findById(payload.userId).select('-password');
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

exports.authorizeRoles = (...roles) => (req, res, next) => {
  // Convert both the user's role and allowed roles to lowercase for comparison
  const userRole = req.user.role.toLowerCase();
  const allowedRoles = roles.map(role => role.toLowerCase());
  
  if (!allowedRoles.includes(userRole)) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  next();
}