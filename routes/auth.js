const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Register User
router.post('/register', async (req, res) => {
  try {
    const { email, password, role } = req.body; // Only these 3 fields

    if (!email || !password || !role) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const newUser = await User.create({
      email,
      password,
      role,
    });

    const token = jwt.sign(
      { userId: newUser._id },
      process.env.JWT_SECRET || 'defaultsecret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
    );

    res.json({
      message: 'User registered successfully',
      token,
      user: {
        _id: newUser._id,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Missing fields' });
    
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });
    
    const match = await user.comparePassword(password);
    if (!match) return res.status(400).json({ message: 'Invalid credentials' });
    
    const token = jwt.sign(
      { userId: user._id }, 
      process.env.JWT_SECRET || 'defaultsecret', 
      { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
    );
    
    res.json({ 
      token, 
      user: { 
        _id: user._id, 
        email: user.email, 
        role: user.role, 
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;