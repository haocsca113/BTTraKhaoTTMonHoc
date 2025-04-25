const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
    name: {type: String, required: true},
    description: String,
    maxStudents: Number,
    // Thoi gian mo, dong mon hoc
    registrationStart: { type: Date, required: true },
    registrationEnd: { type: Date, required: true },
    schedule: [
        {
          day: { type: String, enum: ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'], required: true },
          startTime: { type: String, required: true }, // ví dụ '08:00'
          endTime: { type: String, required: true }    // ví dụ '10:00'
        }
    ]
});

module.exports = mongoose.model('Course', courseSchema);