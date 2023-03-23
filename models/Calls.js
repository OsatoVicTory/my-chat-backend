const mongoose = require('mongoose');

const Calls = new mongoose.Schema({
    callerRefId: {
        type: String,
        required: true,
    },
    toRefId: {
        type: String,
        required: true,
    },
    caller: {
        type: String,
    },
    receiver: {
        type: String,
    },
    callType: {
        type: String,
        required: true,
    },
    accepted: {
        type: Boolean,
        default: false
    },
    duration: {
        type: String,
    }
}, {
    timestamps: true,
});

module.exports = mongoose.model('Calls', Calls);