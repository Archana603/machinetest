const mongoose = require('mongoose');

const payrollSchema = new mongoose.Schema({
  periodStart: { type: String, required: true }, // YYYY-MM-DD
  periodEnd: { type: String, required: true },
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  totalHours: { type: Number, required: true },
  grossPay: { type: Number, required: true },
  deductions: { type: Number, default: 0 },
  netPay: { type: Number, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Payroll', payrollSchema);
