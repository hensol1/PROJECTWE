// backend/scripts/updateProductionVotes.js
require('dotenv').config();
const mongoose = require('mongoose');
const Match = require('../models/Match');
const Vote = require('../models/Vote');
const User = require('../models/User');

// Update the URI to explicitly specify the 'test' database
const PRODUCTION_URI = 'mongodb+srv://weknowbetteradmin:dMMZV14rCKTYLJXG@cluster0.sbr1j.mongodb.net/test';

async function updateVoteResults() {
    try {
        console.log('Connecting to production database (test)...');
        mongoose.set('strictQuery', false);
        await mongoose.connect(PRODUCTION_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Connected to MongoDB database:', mongoose.connection.db.databaseName);

        // First, let's see what matches we have
        const allMatches = await Match.find({});
        console.log('\nProduction Database overview:');
        console.log(`Total matches in database: ${allMatches.length}`);
        
        const matchStatusCounts = allMatches.reduce((acc, match) => {
            acc[match.status] = (acc[match.status] || 0) + 1;
            return acc;
        }, {});
        console.log('Matches by status:', matchStatusCounts);

        // Get finished matches with scores
        const finishedMatches = await Match.find({
            status: 'FINISHED',
            'score.fullTime.home': { $exists: true },
            'score.fullTime.away': { $exists: true }
        });

        console.log(`\nFound ${finishedMatches.length} finished matches with scores`);

        let totalVotesUpdated = 0;
        let totalUsersUpdated = new Set();

        for (const match of finishedMatches) {
            console.log(`\nProcessing match: ${match.homeTeam.name} vs ${match.awayTeam.name}`);
            console.log(`Date: ${match.utcDate}`);
            console.log(`Score: ${match.score.fullTime.home}-${match.score.fullTime.away}`);
            console.log(`Processed status: ${match.processed}`);

            // Get all votes for this match
            const votes = await Vote.find({ matchId: match.id });
            console.log(`Found ${votes.length} votes for match`);

            if (votes.length === 0) {
                console.log('No votes found, skipping match');
                continue;
            }

            // Determine actual result
            const actualResult = 
                match.score.fullTime.home > match.score.fullTime.away ? 'HOME_TEAM' :
                match.score.fullTime.away > match.score.fullTime.home ? 'AWAY_TEAM' : 'DRAW';

            console.log(`Actual result: ${actualResult}`);

            // Update each vote
            for (const vote of votes) {
                const votePrediction = 
                    vote.vote === 'home' ? 'HOME_TEAM' :
                    vote.vote === 'away' ? 'AWAY_TEAM' : 'DRAW';

                const previousIsCorrect = vote.isCorrect;
                vote.isCorrect = votePrediction === actualResult;
                
                if (previousIsCorrect !== vote.isCorrect) {
                    console.log(`Updating vote ${vote._id} from ${previousIsCorrect} to ${vote.isCorrect}`);
                    await vote.save();
                    totalVotesUpdated++;
                    totalUsersUpdated.add(vote.userId.toString());
                }
            }

            // Mark match as processed
            if (!match.processed) {
                match.processed = true;
                await match.save();
                console.log('Marked match as processed');
            }
        }

        // Update all affected users' stats
        console.log('\nUpdating user statistics...');
        for (const userId of totalUsersUpdated) {
            const userVotes = await Vote.find({ 
                userId,
                isCorrect: { $ne: null }
            });

            const correctVotes = userVotes.filter(v => v.isCorrect).length;
            const finishedVotes = userVotes.length;

            const user = await User.findByIdAndUpdate(
                userId,
                {
                    $set: {
                        correctVotes,
                        finishedVotes,
                        accuracy: finishedVotes > 0 ? (correctVotes / finishedVotes * 100) : 0
                    }
                },
                { new: true }
            );

            if (user) {
                console.log(`Updated stats for user ${user.username}: ${correctVotes}/${finishedVotes} correct`);
            } else {
                console.log(`Warning: User ${userId} not found`);
            }
        }

        console.log('\nSummary:');
        console.log(`Total matches processed: ${finishedMatches.length}`);
        console.log(`Total votes updated: ${totalVotesUpdated}`);
        console.log(`Total users affected: ${totalUsersUpdated.size}`);

        await mongoose.connection.close();
        console.log('Database connection closed');
        process.exit(0);
    } catch (error) {
        console.error('Error updating vote results:', error);
        if (mongoose.connection) {
            await mongoose.connection.close();
        }
        process.exit(1);
    }
}

updateVoteResults();