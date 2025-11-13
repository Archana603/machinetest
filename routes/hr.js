const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { authenticate, authorizeRoles } = require('../middleware/auth');

router.get('/employees', authenticate, authorizeRoles('hr'), async (req, res) => {
  try {
    // Use case-insensitive regex to match "Employee" or "employee"
    const employees = await User.find({ role: { $regex: /^employee$/i } }).select('-password');

    res.status(200).json({
      success: true,
      count: employees.length,
      employees,
    });
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ message: 'Server error while fetching employees' });
  }
});
// ➕ Add Employee (Accessible by HR only)
router.post('/employees', authenticate, authorizeRoles('hr'), async (req, res) => {
  try {
    const { email, name, wage } = req.body; // removed role from request

    // ✅ Validate request data
    if (!email || !name || !wage) {
      return res.status(400).json({ message: 'Email, name, and wage are required' });
    }

    // ✅ Check for existing user
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // ✅ Default password for new employee
    const defaultPassword = 'password123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    // ✅ Create new Employee with default role
    const newUser = new User({
      email,
      name,
      role: 'Employee', // 👈 Set default role here
      wage,
      password: hashedPassword,
    });

    await newUser.save();

    res.status(201).json({
      success: true,
      message: 'Employee added successfully',
      employee: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        wage: newUser.wage,
      },
    });
  } catch (error) {
    console.error('Error adding employee:', error);
    res.status(500).json({ message: 'Server error while adding employee' });
  }
});

module.exports = router;
