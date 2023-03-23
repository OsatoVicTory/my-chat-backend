const mongoose = require('mongoose');

const GroupDeletedMessages = new mongoose.Schema({
    messageId: {
        type: String,
    },
    deletedBy: {
        type: String,
    }
}, {
    timestamps: true,
});

module.exports = mongoose.model('GroupDeletedMessages', GroupDeletedMessages);