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

// Send message
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { receiverId, propertyId, message } = req.body;
    const messageId = uuidv4();

    await pool.execute(`
      INSERT INTO messages (id, sender_id, receiver_id, property_id, message)
      VALUES (?, ?, ?, ?, ?)
    `, [messageId, req.user.userId, receiverId, propertyId, message]);

    // Create notification for receiver
    const { createNotification } = require('./notifications');
    const [senderInfo] = await pool.execute('SELECT name FROM users WHERE id = ?', [req.user.userId]);
    const [propertyInfo] = await pool.execute('SELECT title FROM properties WHERE id = ?', [propertyId]);
    
    await createNotification(
      receiverId,
      'message',
      'New Message',
      `${senderInfo[0].name} sent you a message about ${propertyInfo[0].title}`,
      messageId
    );

    res.status(201).json({ message: 'Message sent successfully' });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get unread message count for broker
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const [result] = await pool.execute(`
      SELECT COUNT(*) as unread_count
      FROM messages 
      WHERE receiver_id = ? AND is_read = FALSE
    `, [req.user.userId]);

    res.json({ unreadCount: result[0].unread_count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get conversations for user
router.get('/conversations', authenticateToken, async (req, res) => {
  try {
    const [conversations] = await pool.execute(`
      SELECT DISTINCT 
        CASE 
          WHEN m.sender_id = ? THEN m.receiver_id 
          ELSE m.sender_id 
        END as other_user_id,
        u.name as other_user_name,
        p.title as property_title,
        p.id as property_id,
        MAX(m.created_at) as last_message_time,
        (SELECT message FROM messages m2 
         WHERE (m2.sender_id = ? AND m2.receiver_id = other_user_id) 
            OR (m2.receiver_id = ? AND m2.sender_id = other_user_id)
         ORDER BY m2.created_at DESC LIMIT 1) as last_message
      FROM messages m
      JOIN users u ON u.id = CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END
      LEFT JOIN properties p ON m.property_id = p.id
      WHERE m.sender_id = ? OR m.receiver_id = ?
      GROUP BY other_user_id, property_id
      ORDER BY last_message_time DESC
    `, [req.user.userId, req.user.userId, req.user.userId, req.user.userId, req.user.userId, req.user.userId]);

    res.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get messages between two users
router.get('/:otherUserId', authenticateToken, async (req, res) => {
  try {
    const { otherUserId } = req.params;
    const { propertyId } = req.query;
    
    let query = `
      SELECT m.*, u.name as sender_name
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE ((m.sender_id = ? AND m.receiver_id = ?) 
         OR (m.sender_id = ? AND m.receiver_id = ?))
    `;
    let params = [req.user.userId, otherUserId, otherUserId, req.user.userId];
    
    if (propertyId) {
      query += ` AND m.property_id = ?`;
      params.push(propertyId);
    }
    
    query += ` ORDER BY m.created_at ASC`;
    
    const [messages] = await pool.execute(query, params);

    // Mark messages as read
    let markReadQuery = `
      UPDATE messages SET is_read = TRUE 
      WHERE sender_id = ? AND receiver_id = ? AND is_read = FALSE
    `;
    let markReadParams = [otherUserId, req.user.userId];
    
    if (propertyId) {
      markReadQuery += ` AND property_id = ?`;
      markReadParams.push(propertyId);
    }
    
    await pool.execute(markReadQuery, markReadParams);

    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get chats for a specific property
router.get('/property/:propertyId/chats', authenticateToken, async (req, res) => {
  try {
    const { propertyId } = req.params;
    
    const [chats] = await pool.execute(`
      SELECT 
        u.id as client_id,
        u.name as client_name,
        MAX(m.created_at) as last_message_time,
        (SELECT message FROM messages m2 
         WHERE m2.property_id = ? AND m2.sender_id = u.id 
         ORDER BY m2.created_at DESC LIMIT 1) as last_message,
        COUNT(CASE WHEN m.is_read = FALSE AND m.sender_id = u.id THEN 1 END) as unread_count
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.property_id = ? AND m.receiver_id = ?
      GROUP BY u.id
      ORDER BY last_message_time DESC
    `, [propertyId, propertyId, req.user.userId]);

    res.json(chats);
  } catch (error) {
    console.error('Error fetching property chats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;