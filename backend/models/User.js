const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: function() { return !this.googleId; }
  },
  country: {
    type: String,
    required: true
  },
  googleId: {
    type: String,
    sparse: true
  }
});

module.exports = mongoose.model('User', UserSchema);