const mongoose = require('mongoose');

const Messages = new mongoose.Schema({
    senderId: {
        type: String,
    },
    senderRefId: {
        type: String,
    },
    receiverRefId: {
        type: String,
    },
    accountsInvolvedId: {
        type: String,
    },
    deletedFor: {
        type: String,
        default: ''
    },
    images: {
        type: Array,
    },
    message: {
        type: String,
    },
    isDelivered: {
        type: Boolean,
        default: false
    },
    isRead: {
        type: Boolean,
        default: false,
    },
    reactions: {
        type: Array,
        default: []
    },
}, {
    timestamps: true,
});

module.exports = mongoose.model('Messages', Messages);