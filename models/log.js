const mongoose = require('mongoose');

// Schema for the logs collection
const logSchema = new mongoose.Schema({
    // Method (GET, POST), Endpoint accessed, and the Message/Action
    action: String,
    method: String,
    endpoint: String,
    params: Object,
    timestamp: {
        type: Date,
        default: Date.now
    }
}, { versionKey: false });

module.exports = mongoose.model('Log', logSchema, 'logs');