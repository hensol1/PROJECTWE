const jwt = require('jsonwebtoken');

const optionalAuth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    console.log('No token provided, continuing as unauthenticated user');
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.userId };
    console.log('User set on request:', req.user);
  } catch (err) {
    console.error('Error decoding token:', err);
  }

  next();
};

module.exports = optionalAuth;