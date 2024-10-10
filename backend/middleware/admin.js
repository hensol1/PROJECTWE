const User = require('../models/User');

module.exports = async function(req, res, next) {
  console.log('Admin middleware called');
  console.log('User from auth middleware:', req.user);

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      console.log('User not found in database');
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('User isAdmin status:', user.isAdmin);

    if (!user.isAdmin) {
      console.log('User is not an admin');
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    next();
  } catch (error) {
    console.error('Error in admin middleware:', error);
    res.status(500).json({ message: 'Server error in admin middleware' });
  }
};