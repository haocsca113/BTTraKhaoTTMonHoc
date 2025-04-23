const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
    name: {type: String, required: true},
    description: String,
    maxStudents: Number
});

module.exports = mongoose.model('Course', courseSchema);