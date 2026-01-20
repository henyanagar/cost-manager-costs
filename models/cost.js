// Schema for costs collection
// Stores cost items with category validation
const mongoose = require('mongoose');

const costSchema = new mongoose.Schema({
    description: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true,
        enum: ['food', 'health', 'housing', 'sports', 'education']
    },
    userid: {
        type: Number,
        required: true
    },
    sum: {
        type: Number,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    versionKey: false,
    collection: 'costs'
});

// Index for faster queries by userid
costSchema.index({ userid: 1 });

module.exports = mongoose.model('Cost', costSchema);