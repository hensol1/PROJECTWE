// backend/models/Event.js
const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    matchId: {
        type: String,
        required: true,
        index: true
    },
    time: {
        elapsed: Number,
        extra: Number
    },
    team: {
        id: Number,
        name: String,
        logo: String
    },
    player: {
        id: Number,
        name: String
    },
    assist: {
        id: Number,
        name: String
    },
    type: String,
    detail: String,
    comments: String
}, {
    timestamps: true
});

const Event = mongoose.model('Event', eventSchema);

module.exports = Event;