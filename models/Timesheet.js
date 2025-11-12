const mongoose = require('mongoose');

const timesheetSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  clockIn: { type: Date },
  clockOut: { type: Date },
  durationHours: { type: Number, default: 0 },
  approved: { type: Boolean, default: false },
  approver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Timesheet', timesheetSchema);
