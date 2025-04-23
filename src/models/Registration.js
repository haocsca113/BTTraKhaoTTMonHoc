const mongoose = require('mongoose');

const RegistrationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  registeredAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Registration', RegistrationSchema);