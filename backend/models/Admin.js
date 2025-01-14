const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const adminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  }
}, {
  timestamps: true
});

// Hash password before saving
adminSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 8);
  }
  next();
});

// Generate auth token method
adminSchema.methods.generateAuthToken = function() {
  const token = jwt.sign(
    { _id: this._id.toString(), isAdmin: true },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  return token;
};

// Verify admin credentials
adminSchema.statics.findByCredentials = async (username, password) => {
  const admin = await Admin.findOne({ username });
  
  if (!admin) {
    throw new Error('Invalid login credentials');
  }
  
  const isMatch = await bcrypt.compare(password, admin.password);
  if (!isMatch) {
    throw new Error('Invalid login credentials');
  }
  
  return admin;
};

const Admin = mongoose.model('Admin', adminSchema);

module.exports = Admin;