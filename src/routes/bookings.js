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

// Create booking
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { brokerId, propertyId, visitDate, visitTime, clientName, clientPhone, message } = req.body;
    const bookingId = uuidv4();

    await pool.execute(`
      INSERT INTO bookings (id, client_id, broker_id, property_id, visit_date, visit_time, client_name, client_phone, message)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [bookingId, req.user.userId, brokerId, propertyId, visitDate, visitTime, clientName, clientPhone, message]);

    // Create notification for broker
    const { createNotification } = require('./notifications');
    const [propertyInfo] = await pool.execute('SELECT title FROM properties WHERE id = ?', [propertyId]);
    
    await createNotification(
      brokerId,
      'booking',
      'New Property Visit Request',
      `${clientName} wants to visit ${propertyInfo[0].title} on ${visitDate} at ${visitTime}`,
      bookingId
    );

    res.status(201).json({ message: 'Booking created successfully' });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get client's bookings
router.get('/client', authenticateToken, async (req, res) => {
  try {
    const [bookings] = await pool.execute(`
      SELECT b.*, p.title as property_title, p.district, p.area, u.name as broker_name, u.phone as broker_phone
      FROM bookings b
      JOIN properties p ON b.property_id = p.id
      JOIN users u ON b.broker_id = u.id
      WHERE b.client_id = ?
      ORDER BY b.visit_date DESC, b.visit_time DESC
    `, [req.user.userId]);

    res.json(bookings);
  } catch (error) {
    console.error('Error fetching client bookings:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get broker's bookings
router.get('/broker', authenticateToken, async (req, res) => {
  try {
    const [bookings] = await pool.execute(`
      SELECT b.*, p.title as property_title, p.district, p.area
      FROM bookings b
      JOIN properties p ON b.property_id = p.id
      WHERE b.broker_id = ?
      ORDER BY b.visit_date DESC, b.visit_time DESC
    `, [req.user.userId]);

    res.json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update booking status
router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    await pool.execute(
      'UPDATE bookings SET status = ? WHERE id = ? AND broker_id = ?',
      [status, id, req.user.userId]
    );

    // Notify client of status change
    const { createNotification } = require('./notifications');
    const [booking] = await pool.execute('SELECT * FROM bookings WHERE id = ?', [id]);
    const [property] = await pool.execute('SELECT title FROM properties WHERE id = ?', [booking[0].property_id]);
    
    let notificationMessage = `Your visit request for ${property[0].title} has been ${status}`;
    if (status === 'confirmed' && booking[0].status === 'counter_pending') {
      notificationMessage = `Your proposed time for ${property[0].title} has been accepted by the broker`;
    }
    
    await createNotification(
      booking[0].client_id,
      'booking_update',
      'Booking Status Updated',
      notificationMessage,
      id
    );

    res.json({ message: 'Booking status updated' });
  } catch (error) {
    console.error('Error updating booking:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reschedule booking
router.put('/:id/reschedule', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { visitDate, visitTime, message } = req.body;

    await pool.execute(
      'UPDATE bookings SET visit_date = ?, visit_time = ?, status = "reschedule_pending", message = ? WHERE id = ? AND broker_id = ?',
      [visitDate, visitTime, message, id, req.user.userId]
    );

    // Notify client of reschedule
    const { createNotification } = require('./notifications');
    const [booking] = await pool.execute('SELECT * FROM bookings WHERE id = ?', [id]);
    const [property] = await pool.execute('SELECT title FROM properties WHERE id = ?', [booking[0].property_id]);
    
    await createNotification(
      booking[0].client_id,
      'booking_update',
      'Visit Rescheduled - Confirmation Needed',
      `Your visit for ${property[0].title} has been rescheduled to ${visitDate} at ${visitTime}. Please confirm or propose a new time.`,
      id
    );

    res.json({ message: 'Reschedule proposal sent to client' });
  } catch (error) {
    console.error('Error rescheduling booking:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Client responds to reschedule
router.put('/:id/reschedule-response', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { action, visitDate, visitTime, message } = req.body; // action: 'accept' or 'counter'

    if (action === 'accept') {
      await pool.execute(
        'UPDATE bookings SET status = "confirmed" WHERE id = ? AND client_id = ?',
        [id, req.user.userId]
      );
      
      // Notify broker of acceptance
      const { createNotification } = require('./notifications');
      const [booking] = await pool.execute('SELECT * FROM bookings WHERE id = ?', [id]);
      const [property] = await pool.execute('SELECT title FROM properties WHERE id = ?', [booking[0].property_id]);
      
      await createNotification(
        booking[0].broker_id,
        'booking_update',
        'Reschedule Accepted',
        `${booking[0].client_name} accepted the new time for ${property[0].title}`,
        id
      );
      
      res.json({ message: 'Reschedule accepted' });
    } else if (action === 'counter') {
      await pool.execute(
        'UPDATE bookings SET visit_date = ?, visit_time = ?, status = "counter_pending", message = ? WHERE id = ? AND client_id = ?',
        [visitDate, visitTime, message, id, req.user.userId]
      );
      
      // Notify broker of counter-proposal
      const { createNotification } = require('./notifications');
      const [booking] = await pool.execute('SELECT * FROM bookings WHERE id = ?', [id]);
      const [property] = await pool.execute('SELECT title FROM properties WHERE id = ?', [booking[0].property_id]);
      
      await createNotification(
        booking[0].broker_id,
        'booking_update',
        'New Time Proposed',
        `${booking[0].client_name} proposed a new time for ${property[0].title}: ${visitDate} at ${visitTime}`,
        id
      );
      
      res.json({ message: 'Counter-proposal sent to broker' });
    }
  } catch (error) {
    console.error('Error responding to reschedule:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;