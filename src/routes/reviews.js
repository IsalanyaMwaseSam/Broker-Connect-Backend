const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../database');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

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

// Submit review
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { 
      bookingId, 
      brokerId, 
      propertyId, 
      brokerRating, 
      brokerComment, 
      propertyRating, 
      propertyComment, 
      propertyTaken 
    } = req.body;
    
    const reviewId = uuidv4();

    await pool.execute(`
      INSERT INTO reviews (
        id, booking_id, client_id, broker_id, property_id, 
        broker_rating, broker_comment, property_rating, property_comment, property_taken
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      reviewId, bookingId, req.user.userId, brokerId, propertyId,
      brokerRating, brokerComment, propertyRating, propertyComment, propertyTaken
    ]);

    res.status(201).json({ message: 'Review submitted successfully' });
  } catch (error) {
    console.error('Error submitting review:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Check if booking has review
router.get('/booking/:bookingId', authenticateToken, async (req, res) => {
  try {
    const { bookingId } = req.params;
    
    const [reviews] = await pool.execute(
      'SELECT * FROM reviews WHERE booking_id = ? AND client_id = ?',
      [bookingId, req.user.userId]
    );

    res.json({ hasReview: reviews.length > 0, review: reviews[0] || null });
  } catch (error) {
    console.error('Error checking review:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;