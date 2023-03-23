const mongoose = require('mongoose');

const Status = new mongoose.Schema({
    posterRefId: {
        type: String,
    },
    posterId: {
        type: String,
    },
    statusType: {
        type: String,
    },
    statusValue: {
        type: Object,
    },
    background: {
        type: String,
    },
    caption: {
        type: String,
    },
    viewers: {
        type: Array,
        default: [],
    },
}, {
    timestamps: true,
});

module.exports = mongoose.model('Status', Status);