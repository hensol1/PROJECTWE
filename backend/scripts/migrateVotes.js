// backend/scripts/migrateVotes.js
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const User = require('../models/User');
const Match = require('../models/Match');
const Vote = require('../models/Vote');
const { recalculateUserStats } = require('../utils/userStats');

// Load environment variables
const envPath = path.resolve(__dirname, '../.env');
console.log('Current directory:', __dirname);
console.log('Looking for .env file at:', envPath);
dotenv.config({ path: envPath });

mongoose.set('strictQuery', false);

async function findUserVotes() {
    try {
        // Try different approaches to find votes
        const usersWithVotesRaw = await mongoose.connection.db
            .collection('users')
            .find({ votes: { $exists: true } })
            .toArray();

        console.log(`Found ${usersWithVotesRaw.length} users with votes using raw query`);
        return usersWithVotesRaw;
    } catch (error) {
        console.error('Error finding votes:', error);
        return [];
    }
}

async function migrateVotes() {
    try {
        const connectionString = process.env.MONGODB_URI || 'mongodb://localhost:27017/test';
        console.log('Using connection string:', connectionString);

        await mongoose.connect(connectionString, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Connected to MongoDB');

        // Get users with votes using raw MongoDB query
        const usersWithVotes = await findUserVotes();
        console.log(`Found ${usersWithVotes.length} users with votes to migrate`);

        let totalVotes = 0;
        let migratedVotes = 0;

        for (const rawUser of usersWithVotes) {
            console.log('Processing user:', {
                username: rawUser.username,
                userId: rawUser._id,
                votesCount: Array.isArray(rawUser.votes) ? rawUser.votes.length : 'N/A'
            });

            if (!Array.isArray(rawUser.votes)) {
                console.log(`Skipping user ${rawUser.username} - votes is not an array`);
                continue;
            }

            for (const vote of rawUser.votes) {
                console.log('Processing vote:', {
                    matchId: vote.matchId,
                    vote: vote.vote
                });

                totalVotes++;
                
                try {
                    const match = await Match.findOne({ id: vote.matchId });
                    if (!match) {
                        console.log(`Match ${vote.matchId} not found, skipping vote`);
                        continue;
                    }

                    const newVote = await Vote.findOneAndUpdate(
                        { 
                            userId: rawUser._id, 
                            matchId: vote.matchId 
                        },
                        {
                            vote: vote.vote,
                            isCorrect: vote.isCorrect,
                            createdAt: vote.createdAt || new Date(),
                            competition: match.competition ? {
                                id: match.competition.id,
                                name: match.competition.name
                            } : null
                        },
                        { 
                            upsert: true,
                            new: true
                        }
                    );

                    console.log(`Successfully migrated vote:`, {
                        userId: rawUser._id,
                        matchId: vote.matchId,
                        newVoteId: newVote._id
                    });

                    migratedVotes++;
                } catch (error) {
                    console.error(`Error migrating vote for match ${vote.matchId}:`, error);
                }
            }

            try {
                await recalculateUserStats(rawUser._id);
                console.log(`Recalculated stats for user ${rawUser.username}`);
            } catch (error) {
                console.error(`Error recalculating stats for user ${rawUser.username}:`, error);
            }
        }

        console.log('\nMigration Summary:');
        console.log(`Total votes found: ${totalVotes}`);
        console.log(`Successfully migrated: ${migratedVotes}`);
        console.log(`Failed migrations: ${totalVotes - migratedVotes}`);

        await mongoose.connection.close();
        console.log('Database connection closed');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.close();
        }
        process.exit(1);
    }
}

migrateVotes();