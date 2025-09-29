const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../database');

const router = express.Router();

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Get current user with latest data
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT u.*, b.license_number, b.nin, b.verification_status, b.rating, b.total_reviews, b.commission FROM users u LEFT JOIN brokers b ON u.id = b.user_id WHERE u.id = ?',
      [req.user.userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = users[0];
    const userData = {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      isVerified: Boolean(user.is_verified),
      createdAt: user.created_at,
      ...(user.role === 'broker' && {
        licenseNumber: user.license_number,
        nin: user.nin,
        verificationStatus: user.verification_status,
        rating: parseFloat(user.rating || 0),
        totalReviews: user.total_reviews || 0,
        commission: parseFloat(user.commission || 5)
      })
    };

    res.json(userData);
  } catch (error) {
    console.error('Error fetching current user:', error);
    // Return basic user info if tables don't exist yet
    if (error.code === '42P01') {
      return res.json({
        id: req.user.userId,
        role: req.user.role,
        email: 'user@example.com',
        name: 'User',
        isVerified: false
      });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;