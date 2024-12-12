const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

// This endpoint will get user's rankings
router.get('/rankings', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Log the full user object (excluding sensitive data) for debugging
        console.log('Current user data:', {
            id: user._id,
            country: user.country,
            city: user.city,
            totalVotes: user.totalVotes,
            finishedVotes: user.finishedVotes,
            correctVotes: user.correctVotes,
            wilsonScore: user.wilsonScore
        });

        // Get all users with stats
        const allUsers = await User.find({
            finishedVotes: { $gt: 0 }
        }).select('_id country city totalVotes finishedVotes correctVotes wilsonScore');

        console.log('Found users:', allUsers.length);

        // Sort users by wilsonScore
        const sortedUsers = allUsers.sort((a, b) => b.wilsonScore - a.wilsonScore);

        // Calculate global rank
        const globalRank = sortedUsers.findIndex(u => u._id.toString() === userId) + 1;

        // Get country users
        let countryRank = null;
        if (user.country) {
            const countryUsers = sortedUsers.filter(u => 
                u.country && u.country.toLowerCase() === user.country.toLowerCase()
            );
            countryRank = countryUsers.findIndex(u => u._id.toString() === userId) + 1;
            
            console.log('Country stats:', {
                country: user.country,
                usersFound: countryUsers.length,
                users: countryUsers.map(u => ({
                    id: u._id,
                    country: u.country,
                    wilsonScore: u.wilsonScore,
                    correctVotes: u.correctVotes,
                    finishedVotes: u.finishedVotes
                }))
            });
        }

        // Get city users
        let cityRank = null;
        if (user.city) {
            const cityUsers = sortedUsers.filter(u => 
                u.city && u.city.toLowerCase() === user.city.toLowerCase()
            );
            cityRank = cityUsers.findIndex(u => u._id.toString() === userId) + 1;

            console.log('City stats:', {
                city: user.city,
                usersFound: cityUsers.length,
                users: cityUsers.map(u => ({
                    id: u._id,
                    city: u.city,
                    wilsonScore: u.wilsonScore,
                    correctVotes: u.correctVotes,
                    finishedVotes: u.finishedVotes
                }))
            });
        }

        const rankings = {
            global: globalRank > 0 ? globalRank : null,
            country: countryRank > 0 ? countryRank : null,
            city: cityRank > 0 ? cityRank : null
        };

        console.log('Final rankings:', rankings);
        res.json(rankings);

    } catch (error) {
        console.error('Rankings error:', error);
        res.status(500).json({ message: 'Error getting rankings' });
    }
});

module.exports = router;