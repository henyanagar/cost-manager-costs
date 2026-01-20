// Schema for computed design pattern
// Stores pre-calculated monthly reports for past months
const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    userid: {
        type: Number,
        required: true
    },
    year: {
        type: Number,
        required: true
    },
    month: {
        type: Number,
        required: true
    },
    costs: {
        type: Array,
        required: true
    }
}, {
    versionKey: false,
    collection: 'reports'
});

// Compound index for efficient lookups
reportSchema.index({ userid: 1, year: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('Report', reportSchema);