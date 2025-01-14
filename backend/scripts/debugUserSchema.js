// backend/scripts/debugUserSchema.js
const mongoose = require('mongoose');
const User = require('../models/User');

// Print the User schema
console.log('User Schema:', User.schema.obj);

// Find and print the first user with votes
async function debugFirstUser() {
    try {
        await mongoose.connect('mongodb://localhost:27017/test');
        const user = await User.findOne({ 'votes.0': { $exists: true } });
        if (user) {
            console.log('Sample User:', {
                id: user._id,
                username: user.username,
                votesType: typeof user.votes,
                isArray: Array.isArray(user.votes),
                votesLength: user.votes ? user.votes.length : 0,
                votes: user.votes
            });
        } else {
            console.log('No users with votes found');
        }
        await mongoose.connection.close();
    } catch (error) {
        console.error('Error:', error);
    }
}

debugFirstUser();