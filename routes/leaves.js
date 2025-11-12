const express = require('express');
const router = express.Router();
const Leave = require('../models/Leave');
const User = require('../models/User');
const { authenticate, authorizeRoles } = require('../middleware/auth');

// request leave (employee)
router.post('/', authenticate, async (req, res) => {
  try {
    const { startDate, endDate, type, reason } = req.body;
    if (!startDate || !endDate || !type) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    const leave = await Leave.create({ 
      user: req.user._id, 
      startDate, 
      endDate, 
      type, 
      reason 
    });
    
    // Populate user details in response
    await leave.populate('user', 'name email');
    res.json(leave);
  } catch (error) {
    console.error('Leave request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// get my leaves
router.get('/me', authenticate, async (req, res) => {
  try {
    const list = await Leave.find({ user: req.user._id })
      .populate('user', 'name email')
      .populate('approver', 'name email')
      .sort({ createdAt: -1 });
    res.json(list);
  } catch (error) {
    console.error('Get leaves error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// manager/hr: view team leaves (pending)
router.get('/pending', authenticate, authorizeRoles('manager', 'hr'), async (req, res) => {
  try {
    // If HR, get all pending leaves
    if (req.user.role === 'hr') {
      const pending = await Leave.find({ status: 'pending' })
        .populate('user', 'name email role manager')
        .populate('approver', 'name email')
        .sort({ createdAt: -1 });
      return res.json(pending);
    }
    
    // If manager, get leaves of their team only
    const managerId = req.user._id;
    const employees = await User.find({ manager: managerId }).select('_id name email');
    const ids = employees.map(e => e._id);
    const pending = await Leave.find({ 
      user: { $in: ids }, 
      status: 'pending' 
    })
    .populate('user', 'name email')
    .populate('approver', 'name email')
    .sort({ createdAt: -1 });
    
    res.json(pending);
  } catch (error) {
    console.error('Pending leaves error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// get all leaves for manager/hr
router.get('/all', authenticate, authorizeRoles('manager', 'hr'), async (req, res) => {
  try {
    // If HR, get all leaves
    if (req.user.role === 'hr') {
      const leaves = await Leave.find()
        .populate('user', 'name email role manager')
        .populate('approver', 'name email')
        .sort({ createdAt: -1 });
      return res.json(leaves);
    }
    
    // If manager, get leaves of their team only
    const managerId = req.user._id;
    const employees = await User.find({ manager: managerId }).select('_id name email');
    const ids = employees.map(e => e._id);
    const leaves = await Leave.find({ user: { $in: ids } })
      .populate('user', 'name email')
      .populate('approver', 'name email')
      .sort({ createdAt: -1 });
    
    res.json(leaves);
  } catch (error) {
    console.error('Get all leaves error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// approve leave
router.post('/:id/approve', authenticate, authorizeRoles('manager', 'hr'), async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);
    if(!leave) return res.status(404).json({ message: 'Leave not found' });
    
    // If manager, verify the leave belongs to their team
    if (req.user.role === 'manager') {
      const employees = await User.find({ manager: req.user._id }).select('_id');
      const employeeIds = employees.map(e => e._id);
      if (!employeeIds.includes(leave.user.toString())) {
        return res.status(403).json({ message: 'Not authorized to approve this leave' });
      }
    }
    
    leave.status = 'approved';
    leave.approver = req.user._id;
    await leave.save();
    
    await leave.populate('user', 'name email');
    await leave.populate('approver', 'name email');
    res.json(leave);
  } catch (error) {
    console.error('Approve leave error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// reject leave
router.post('/:id/reject', authenticate, authorizeRoles('manager', 'hr'), async (req,res) => {
  try {
    const leave = await Leave.findById(req.params.id);
    if(!leave) return res.status(404).json({ message: 'Leave not found' });
    
    // If manager, verify the leave belongs to their team
    if (req.user.role === 'manager') {
      const employees = await User.find({ manager: req.user._id }).select('_id');
      const employeeIds = employees.map(e => e._id);
      if (!employeeIds.includes(leave.user.toString())) {
        return res.status(403).json({ message: 'Not authorized to reject this leave' });
      }
    }
    
    leave.status = 'rejected';
    leave.approver = req.user._id;
    await leave.save();
    
    await leave.populate('user', 'name email');
    await leave.populate('approver', 'name email');
    res.json(leave);
  } catch (error) {
    console.error('Reject leave error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;