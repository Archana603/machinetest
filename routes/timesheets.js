const express = require('express');
const router = express.Router();
const Timesheet = require('../models/Timesheet');
const User = require('../models/User');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const moment = require('moment');

// clock in
router.post('/clockin', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const today = moment().format('YYYY-MM-DD');
    let ts = await Timesheet.findOne({ user: userId, date: today });
    if(ts && ts.clockIn) return res.status(400).json({ message: 'Already clocked in' });
    if(!ts) ts = new Timesheet({ user: userId, date: today });
    ts.clockIn = new Date();
    await ts.save();
    
    // Populate user data in response
    await ts.populate('user', 'name email');
    res.json({
      message: 'Clocked in successfully',
      timesheet: ts
    });
  } catch (error) {
    console.error('Clock in error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// clock out
router.post('/clockout', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const today = moment().format('YYYY-MM-DD');
    const ts = await Timesheet.findOne({ user: userId, date: today });
    if(!ts || !ts.clockIn) return res.status(400).json({ message: 'No clock in found for today' });
    if(ts.clockOut) return res.status(400).json({ message: 'Already clocked out' });
    ts.clockOut = new Date();
    // compute hours
    const diffMs = new Date(ts.clockOut) - new Date(ts.clockIn);
    ts.durationHours = Math.round((diffMs / (1000*60*60)) * 100) / 100;
    await ts.save();
    
    // Populate user data in response
    await ts.populate('user', 'name email');
    res.json({
      message: 'Clocked out successfully',
      timesheet: ts
    });
  } catch (error) {
    console.error('Clock out error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// get own timesheets - FIXED VERSION
router.get('/me', authenticate, async (req, res) => {
  try {
    console.log('Fetching timesheets for user:', req.user._id); // Debug log
    
    const list = await Timesheet.find({ user: req.user._id })
      .populate('user', 'name email') // Populate user details
      .populate('approver', 'name email') // Populate approver details
      .sort({ date: -1 });
    
    console.log('Found timesheets:', list.length); // Debug log
    console.log('Timesheets data:', list); // Debug log
    
    // Always return proper JSON structure
    res.json({
      success: true,
      count: list.length,
      timesheets: list
    });
    
  } catch (error) {
    console.error('Get timesheets error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: error.message 
    });
  }
});

// manager/hr: view pending timesheets of team
// manager/hr: view ALL pending timesheets (approved: false) - No team restriction
router.get('/pending', authenticate, authorizeRoles('Manager', 'HR', 'manager', 'hr'), async (req, res) => {
  try {
    const userRole = req.user.role;
    
    console.log(`Fetching ALL pending timesheets for ${userRole}:`, req.user._id);

    // Get ALL timesheets where approved is false, regardless of team
    const pendingTimesheets = await Timesheet.find({ 
      approved: false  // Only timesheets that are not approved
    })
    .populate('user', 'name email role manager')
    .populate('approver', 'name email')
    .sort({ createdAt: -1 }); // Sort by newest first
    
    console.log(`Found ${pendingTimesheets.length} pending timesheets (approved: false) in system`);

    // Format the response
    const response = {
      success: true,
      role: userRole,
      count: pendingTimesheets.length,
      timesheets: pendingTimesheets.map(ts => ({
        _id: ts._id,
        date: ts.date,
        clockIn: ts.clockIn,
        clockOut: ts.clockOut,
        durationHours: ts.durationHours,
        approved: ts.approved, // This should be false for all
        status: ts.approved ? 'approved' : 'pending', // Human readable status
        notes: ts.notes || '',
        user: ts.user ? {
          _id: ts.user._id,
          name: ts.user.name,
          email: ts.user.email,
          role: ts.user.role,
          manager: ts.user.manager
        } : null,
        approver: ts.approver ? {
          _id: ts.approver._id,
          name: ts.approver.name,
          email: ts.approver.email
        } : null,
        createdAt: ts.createdAt,
        updatedAt: ts.updatedAt
      }))
    };

    console.log(`Sending ${pendingTimesheets.length} pending timesheets (approved: false)`);
    res.json(response);

  } catch (error) {
    console.error('Pending timesheets error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching pending timesheets',
      error: error.message 
    });
  }
});
// Approve timesheet
router.post('/:id/approve', authenticate, authorizeRoles('manager', 'hr'), async (req, res) => {
  try {
    const ts = await Timesheet.findById(req.params.id).populate('user');
    if (!ts) {
      return res.status(404).json({ success: false, message: 'Timesheet not found' });
    }

    // If manager, verify the timesheet belongs to their team
    if (req.user.role === 'manager') {
      const employees = await User.find({ manager: req.user._id }).select('_id');
      const employeeIds = employees.map(e => e._id.toString());
      if (!employeeIds.includes(ts.user._id.toString())) {
        return res.status(403).json({ success: false, message: 'Not authorized to approve this timesheet' });
      }
    }

    ts.approved = true;
    ts.status = "approved";
    ts.approver = req.user._id;
    await ts.save();

    res.json({
      success: true,
      message: "Timesheet approved successfully",
      timesheet: ts
    });
  } catch (error) {
    console.error('Approve timesheet error:', error);
    res.status(500).json({ success: false, message: 'Server error while approving timesheet' });
  }
});


// Reject timesheet
router.post('/:id/reject', authenticate, authorizeRoles('manager', 'hr'), async (req, res) => {
  try {
    const ts = await Timesheet.findById(req.params.id).populate('user');
    if (!ts) {
      return res.status(404).json({ success: false, message: 'Timesheet not found' });
    }

    // If manager, verify the timesheet belongs to their team
    if (req.user.role === 'manager') {
      const employees = await User.find({ manager: req.user._id }).select('_id');
      const employeeIds = employees.map(e => e._id.toString());
      if (!employeeIds.includes(ts.user._id.toString())) {
        return res.status(403).json({ success: false, message: 'Not authorized to reject this timesheet' });
      }
    }

    ts.approved = false;
    ts.status = "rejected";
    ts.approver = req.user._id;
    ts.notes = req.body.notes || 'Rejected by manager';
    await ts.save();

    res.json({
      success: true,
      message: "Timesheet rejected successfully",
      timesheet: ts
    });
  } catch (error) {
    console.error('Reject timesheet error:', error);
    res.status(500).json({ success: false, message: 'Server error while rejecting timesheet' });
  }
});




module.exports = router;