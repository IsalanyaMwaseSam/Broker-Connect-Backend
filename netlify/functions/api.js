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

// Error logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, req.body);
  next();
});

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
  res.json({ 
    message: 'CORS test endpoint working',
    env: {
      NODE_ENV: process.env.NODE_ENV,
      hasDatabase: !!process.env.NETLIFY_DATABASE_URL,
      hasJWT: !!process.env.JWT_SECRET
    }
  });
});

app.post('/api/test-login', async (req, res) => {
  try {
    res.header('Access-Control-Allow-Origin', '*');
    res.json({ 
      message: 'Test login endpoint working',
      body: req.body,
      env: process.env.NODE_ENV
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({ 
    message: 'Server error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
  });
});

module.exports.handler = serverless(app);