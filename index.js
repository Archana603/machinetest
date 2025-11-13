require('dotenv').config();
require('express-async-errors');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const timesheetRoutes = require('./routes/timesheets');
const leaveRoutes = require('./routes/leaves');
const payrollRoutes = require('./routes/payroll');
const hrRoutes = require('./routes/hr');
const reportsRoutes = require('./routes/reports');


const { errorHandler } = require('./middleware/errorHandler');

const app = express();
app.use(cors());
app.use(express.json());



// routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/timesheets', timesheetRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/hr', hrRoutes);
app.use('/api/reports',reportsRoutes);

// error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

async function start() {
  await mongoose.connect(process.env.MONGO_URI, { });
  console.log('MongoDB connected');
  app.listen(PORT, () => console.log(`Server running on ${PORT}`));
}

start().catch(err => {
  console.error(err);
  process.exit(1);
});
