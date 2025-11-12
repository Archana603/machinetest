require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function seed(){
  await mongoose.connect(process.env.MONGO_URI);
  await User.deleteMany({});
  const hr = await User.create({ name: 'HR Admin', email: 'hr@example.com', password: 'password', role: 'hr' });
  const manager = await User.create({ name: 'Manager One', email: 'manager@example.com', password: 'password', role: 'manager' });
  const emp = await User.create({ name: 'Alice Employee', email: 'alice@example.com', password: 'password', role: 'employee', hourlyRate: 20, manager: manager._id });
  console.log({ hr, manager, emp });
  process.exit(0);
}

seed();
