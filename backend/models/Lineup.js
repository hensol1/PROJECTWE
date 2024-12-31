const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
    id: Number,
    name: String,
    number: Number,
    pos: String,
    grid: {
        x: Number,
        y: Number
    }
});

const lineupSchema = new mongoose.Schema({
    matchId: {
        type: String,
        required: true,
        index: true
    },
    team: {
        id: Number,
        name: String,
        logo: String,
        colors: {
            player: {
                primary: String,
                number: String,
                border: String
            },
            goalkeeper: {
                primary: String,
                number: String,
                border: String
            }
        }
    },
    formation: String,
    coach: {
        id: Number,
        name: String,
        photo: String
    },
    startXI: [playerSchema],
    substitutes: [playerSchema],
    noLineupsAvailable: {
        type: Boolean,
        default: false
    },
    lastChecked: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Compound index for efficient querying
lineupSchema.index({ matchId: 1, 'team.id': 1 });

module.exports = mongoose.model('Lineup', lineupSchema);