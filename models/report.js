
const mongoose = require('mongoose');

// Schema for the 'computed' reports  for storing pre-calculated monthly reports
const reportSchema = new mongoose.Schema({
    userid: { type: Number, required: true },
    year: { type: Number, required: true },
    month: { type: Number, required: true },
    // Storing the 'costs' array will hold the grouped costs as shown in the project example
    costs: { type: Array, required: true }
});

// Indexing for faster lookups
reportSchema.index({ userid: 1, year: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('Report', reportSchema);