const mongoose = require('mongoose');

const StandingSchema = new mongoose.Schema({
    leagueId: {
        type: Number,
        required: true
    },
    season: {
        type: Number,
        required: true
    },
    leagueName: {
        type: String,
        required: function() {
            return !this.noStandingsAvailable;
        }
    },
    standings: [{
        rank: Number,
        team: {
            id: Number,
            name: String,
            logo: String
        },
        points: Number,
        goalsDiff: Number,
        all: {
            played: Number,
            win: Number,
            draw: Number,
            lose: Number,
            goals: {
                for: Number,
                against: Number
            }
        }
    }],
    noStandingsAvailable: {
        type: Boolean,
        default: false
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    // New fields
    lastSuccessfulFetch: {
        type: Date
    },
    fetchErrors: [{
        timestamp: {
            type: Date,
            default: Date.now
        },
        error: {
            message: String,
            code: String,
            status: Number,
            apiErrors: Object,
            timestamp: String
        }
    }]
});

// Compound index for faster queries
StandingSchema.index({ leagueId: 1, season: 1 }, { unique: true });

module.exports = mongoose.model('Standing', StandingSchema);