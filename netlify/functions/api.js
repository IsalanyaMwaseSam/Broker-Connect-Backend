const express = require('express');
const cors = require('cors');
const serverless = require('serverless-http');

const authRoutes = require('../../src/routes/auth');
const propertyRoutes = require('../../src/routes/properties');
const adminRoutes = require('../../src/routes/admin');
const userRoutes = require('../../src/routes/user');

const app = express();

// Middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', require('../../src/routes/messages'));
app.use('/api/bookings', require('../../src/routes/bookings'));
app.use('/api/notifications', require('../../src/routes/notifications').router);
app.use('/api/reviews', require('../../src/routes/reviews'));

app.get('/api/health', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.json({ status: 'OK', message: 'BrokerConnect API is running' });
});

app.get('/api/test', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.json({ message: 'CORS test endpoint working' });
});

module.exports.handler = serverless(app);