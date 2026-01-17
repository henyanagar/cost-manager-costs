const mongoose = require('mongoose');

// Schema for User as per project requirements
const userSchema = new mongoose.Schema({
    // The id property is a Number, distinct from MongoDB's _id
    id: {
        type: Number,
        required: true,
        unique: true
    },
    first_name: {
        type: String,
        required: true
    },
    last_name: {
        type: String,
        required: true
    },
    birthday: {
        type: Date,
        required: true
    }
}, { versionKey: false });

// Exporting the User model
module.exports = mongoose.model('User', userSchema, 'users');