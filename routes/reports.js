const express = require('express');
const router = express.Router();
const { authenticate, authorizeRoles } = require('../middleware/auth');

const Timesheet = require('../models/Timesheet');
const Payroll = require('../models/Payroll');
const Leave = require('../models/Leave');
const User = require('../models/User');

// ============================
// 📊 1. Attendance Report
// ============================
router.get('/attendance', authenticate, authorizeRoles('admin', 'hr', 'manager'), async (req, res) => {
  try {
    const timesheets = await Timesheet.find()
      .populate('user', 'name email role')
      .sort({ date: -1 });

    res.json({
      success: true,
      count: timesheets.length,
      timesheets,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch attendance report' });
  }
});

// ============================
// 💰 2. Payroll Summary Report
// ============================
router.get('/payroll', authenticate, authorizeRoles('admin', 'hr'), async (req, res) => {
  try {
    const payrolls = await Payroll.find()
      .populate('employee', 'name email role')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: payrolls.length,
      payrolls,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch payroll summary' });
  }
});

// ============================
// 🌴 3. Leave Report
// ============================
router.get('/leaves', authenticate, authorizeRoles('admin', 'hr', 'manager'), async (req, res) => {
  try {
    const leaves = await Leave.find()
      .populate('user', 'name email role')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: leaves.length,
      leaves,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch leave records' });
  }
});

// ============================
// 👩‍💼 4. Employee Summary Report
// ============================
router.get('/employees', authenticate, authorizeRoles('admin', 'hr'), async (req, res) => {
  try {
    const employees = await User.find({ role: 'employee' }).select('-password');

    res.json({
      success: true,
      count: employees.length,
      employees,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch employee report' });
  }
});

module.exports = router;
