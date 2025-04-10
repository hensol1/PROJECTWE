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
    // Use mongoose.Schema.Types.Mixed to allow flexible standings structure
    // This will support both single tables and multiple tables (arrays of arrays)
    standings: {
        type: mongoose.Schema.Types.Mixed,
        required: function() {
            return !this.noStandingsAvailable;
        },
        validate: {
            validator: function(v) {
                // Validate that standings is an array (either of team objects or sub-arrays)
                return Array.isArray(v);
            },
            message: 'Standings must be an array'
        }
    },
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