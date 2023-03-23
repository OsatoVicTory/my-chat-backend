const mongoose = require('mongoose');

const Groupchats = new mongoose.Schema({
    participants: {
        type: Array,
        default: [],
    },
    groupRefId: {
        type: String,
    },
    img: {
        type: String,
    },
    name: {
        type: String,
    },
    description: {
        type: String,
    },
    locked: {
        type: Boolean,
        default: false
    },
    about: {
        type: String,
        //value should be => Created by {Creator} on {dateCreated}
    }
}, {
    timestamps: true,
});

module.exports = mongoose.model('Groupchats', Groupchats);