const jwt = require('jsonwebtoken');
const Account = require('../models/Account');

// Protect routes
exports.protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Make sure token exists
  if (!token) {
    return res.status(401).json({ success: false, error: 'Not authorized to access this route' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = await Account.findById(decoded.id);

    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Not authorized to access this route' });
  }
};

// Optional authentication - sets req.user if token exists, but doesn't require it
exports.optionalAuth = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  // If token exists, verify it and set user
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await Account.findById(decoded.id);
    } catch (err) {
      // Token invalid, but we continue without user
      req.user = null;
    }
  } else {
    req.user = null;
  }

  next();
};

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    // 如果 roles 是数组的数组（当调用 authorize(['admin']) 时），需要扁平化
    const rolesArray = roles.flat();
    
    if (!req.user || !req.user.role) {
      return res.status(403).json({
        success: false,
        error: 'User role is not defined',
      });
    }
    
    if (!rolesArray.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `User role ${req.user.role} is not authorized to access this route`,
      });
    }
    next();
  };
};
