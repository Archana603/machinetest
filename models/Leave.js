const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startDate: { type: String, required: true }, // YYYY-MM-DD
  endDate: { type: String, required: true },
  type: { type: String, enum: ['sick','vacation','other'], default: 'other' },
  reason: { type: String },
  status: { type: String, enum: ['pending','approved','rejected'], default: 'pending' },
  approver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Leave', leaveSchema);
