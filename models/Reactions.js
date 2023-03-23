const mongoose = require('mongoose');

const Reactions = new mongoose.Schema({
    messageId: {
        type: String,
    },
    userId: {
        type: String,
    },
    userRefId: {
        type:String,
    },
    emoji: {
        type: String,
    },
});

module.exports = mongoose.model('Reactions', Reactions);