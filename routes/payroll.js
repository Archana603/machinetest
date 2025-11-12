const express = require('express');
const router = express.Router();
const Payroll = require('../models/Payroll');
const Timesheet = require('../models/Timesheet');
const User = require('../models/User');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const moment = require('moment');

// HR: generate payroll for a period (simple calculation using approved timesheets)
router.post('/generate', authenticate, authorizeRoles('hr'), async (req, res) => {
  try {
    const { periodStart, periodEnd } = req.body; // YYYY-MM-DD
    if(!periodStart || !periodEnd) return res.status(400).json({ message: 'Missing dates' });

    // find all employees
    const employees = await User.find({ role: 'employee' });
    const payrolls = [];

    for(const emp of employees){
      // fetch approved timesheets between periodStart and periodEnd
      const timesheets = await Timesheet.find({
        user: emp._id,
        approved: true,
        date: { $gte: periodStart, $lte: periodEnd }
      });

      const totalHours = timesheets.reduce((s, t) => s + (t.durationHours || 0), 0);
      const grossPay = Math.round(totalHours * (emp.hourlyRate || 0) * 100) / 100;
      const deductions = 0; // extendable
      const netPay = grossPay - deductions;
      const p = await Payroll.create({
        periodStart, 
        periodEnd, 
        employee: emp._id, 
        totalHours, 
        grossPay, 
        deductions, 
        netPay
      });
      
      await p.populate('employee', 'name email hourlyRate');
      payrolls.push(p);
    }

    res.json({ generated: payrolls.length, payrolls });
  } catch (error) {
    console.error('Generate payroll error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// HR/Manager: get payrolls
router.get('/', authenticate, authorizeRoles('hr', 'manager'), async (req, res) => {
  try {
    // If HR, get all payrolls
    if (req.user.role === 'hr') {
      const list = await Payroll.find()
        .populate('employee', 'name email hourlyRate')
        .sort({ createdAt: -1 });
      return res.json(list);
    }
    
    // If manager, get payrolls of their team only
    const managerId = req.user._id;
    const employees = await User.find({ manager: managerId }).select('_id');
    const employeeIds = employees.map(e => e._id);
    
    const list = await Payroll.find({ employee: { $in: employeeIds } })
      .populate('employee', 'name email hourlyRate')
      .sort({ createdAt: -1 });
    
    res.json(list);
  } catch (error) {
    console.error('Get payrolls error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get payroll by ID
router.get('/:id', authenticate, authorizeRoles('hr', 'manager'), async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id)
      .populate('employee', 'name email hourlyRate');
    
    if (!payroll) return res.status(404).json({ message: 'Payroll not found' });
    
    // If manager, verify payroll belongs to their team
    if (req.user.role === 'manager') {
      const employees = await User.find({ manager: req.user._id }).select('_id');
      const employeeIds = employees.map(e => e._id);
      if (!employeeIds.includes(payroll.employee._id.toString())) {
        return res.status(403).json({ message: 'Not authorized to view this payroll' });
      }
    }
    
    res.json(payroll);
  } catch (error) {
    console.error('Get payroll error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;