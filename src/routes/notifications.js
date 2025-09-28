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

// Create notification
const createNotification = async (userId, type, title, message, relatedId = null) => {
  try {
    const notificationId = uuidv4();
    await pool.execute(`
      INSERT INTO notifications (id, user_id, type, title, message, related_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [notificationId, userId, type, title, message, relatedId]);
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

// Get user notifications
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [notifications] = await pool.execute(`
      SELECT * FROM notifications 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT 20
    `, [req.user.userId]);

    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark notification as read
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    await pool.execute(
      'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.userId]
    );
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error updating notification:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get unread count
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const [result] = await pool.execute(`
      SELECT COUNT(*) as count FROM notifications 
      WHERE user_id = ? AND is_read = FALSE
    `, [req.user.userId]);

    res.json({ count: result[0].count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = { router, createNotification };