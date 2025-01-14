require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../models/Admin');

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const admin = new Admin({
      username: 'admin',  // Change this
      password: '300483997',  // Change this
      email: 'f.data.app@gmail.com'  // Change this
    });

    await admin.save();
    console.log('Admin created successfully');
    
    mongoose.connection.close();
  } catch (error) {
    console.error('Error creating admin:', error);
    mongoose.connection.close();
  }
};

createAdmin();