// Read-only schema for checking if user exists
// Costs service can READ from users collection but never WRITE
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    id: {
        type: Number,
        required: true,
        unique: true
    },
    first_name: String,
    last_name: String,
    birthday: Date
}, {
    versionKey: false,
    collection: 'users'
});

module.exports = mongoose.model('User', userSchema);