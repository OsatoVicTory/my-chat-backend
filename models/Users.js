const mongoose = require('mongoose');

const Users = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
    },
    lastName: {
        type: String,
        required: true,
    },
    userName: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        immutable: true,
        unique: true
    },
    phoneNumber: {
        type: Number,
    },
    createdWithProvider: {
        type: String,
        default: "",
    },
    refId: {
        type: String,
    },
    userColor: {
        type: String,
    },
    password: {
        type: String,
        required: true,
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    img: {
        type: String,
        default: "",
    },
    about: {
        type: String,
    },
    lastLogin: {
        type: Date,
    },
    userGroups: {
        type: Array,
        default: [],
    },
    contacts: {
        type: Array,
        default: [],
    },
    whoSeesMyStatus: {
        type: Array,
        default: [],
    },
    clearedCallLogs: {
        type: Number,
        default: 0,
    },
    statusLastChecked: {
        type: Number,
        default: 0,
    },
    callsLastChecked: {
        type: Number,
        default: 0,
    },
}, {
    timestamps: true,
});

module.exports = mongoose.model('Users', Users);