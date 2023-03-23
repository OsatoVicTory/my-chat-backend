const mongoose = require('mongoose');

const GroupMessages = new mongoose.Schema({
    senderRefId: {
        type: String,
    },
    groupRefId: {
        type: String,
    },
    images: {
        type: Array,
        default: [],
    },
    messageType: {
        type: String,
    },
    message: {
        type: String,
    },
    isReadBy: {
        type: Array,
        default: []
    },
    reactions: {
        type: Array,
        default: []
    },
}, {
    timestamps: true,
});

module.exports = mongoose.model('GroupMessages', GroupMessages);