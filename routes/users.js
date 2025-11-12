const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticate, authorizeRoles } = require('../middleware/auth');

// get current
router.get('/me', authenticate, (req, res) => {
  res.json(req.user);
});

// get all users (hr/manager only)
router.get('/', authenticate, authorizeRoles('hr','manager'), async (req, res) => {
  const users = await User.find();
  res.json(users);
});

// create user (hr only)
router.post('/', authenticate, authorizeRoles('hr'), async (req,res) => {
  const { name, email, password, role, hourlyRate, manager } = req.body;
  const exists = await User.findOne({ email });
  if(exists) return res.status(400).json({ message: 'Email exists' });
  const user = await User.create({ name, email, password, role, hourlyRate, manager });
  res.json(user);
});

// update user (hr only)
router.put('/:id', authenticate, authorizeRoles('hr'), async (req,res) => {
  const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(user);
});

module.exports = router;
