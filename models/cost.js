const mongoose = require('mongoose');

// Schema for individual cost items
const costSchema = new mongoose.Schema({
    description: { type: String, required: true },
    category: {
        type: String,
        required: true,
        // Must be one of: food, health, housing, sports, education
        enum: ['food', 'health', 'housing', 'sports', 'education']
    },
    userid: { type: Number, required: true },
    sum: { type: Number, required: true },// Mongoose uses Number for Double values
    // Adding date property to support the monthly report and Computed Pattern
    createdAt: { type: Date, default: Date.now } // Uses current time if not provided
});
costSchema.index({ userid: 1});
module.exports = mongoose.model('Cost', costSchema);
