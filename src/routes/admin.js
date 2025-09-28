const express = require('express');
const pool = require('../database');

const router = express.Router();

// Get pending brokers for verification
router.get('/brokers/pending', async (req, res) => {
  try {
    const [brokers] = await pool.execute(`
      SELECT u.*, b.license_number, b.nin, b.verification_status, b.rating, b.total_reviews, b.commission
      FROM users u 
      JOIN brokers b ON u.id = b.user_id 
      WHERE u.role = 'broker'
      ORDER BY u.created_at DESC
    `);

    const formattedBrokers = brokers.map(broker => ({
      id: broker.id,
      email: broker.email,
      name: broker.name,
      phone: broker.phone,
      role: broker.role,
      isVerified: broker.is_verified,
      createdAt: new Date(broker.created_at),
      licenseNumber: broker.license_number,
      nin: broker.nin,
      verificationStatus: broker.verification_status,
      rating: parseFloat(broker.rating),
      totalReviews: broker.total_reviews,
      commission: parseFloat(broker.commission)
    }));

    res.json(formattedBrokers);
  } catch (error) {
    console.error('Error fetching brokers:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update broker verification status
router.put('/brokers/:id/verify', async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'approve' or 'reject'

    const verificationStatus = action === 'approve' ? 'verified' : 'rejected';
    const isVerified = action === 'approve';

    await pool.execute(
      'UPDATE brokers SET verification_status = ? WHERE user_id = ?',
      [verificationStatus, id]
    );

    await pool.execute(
      'UPDATE users SET is_verified = ? WHERE id = ?',
      [isVerified, id]
    );

    res.json({ message: `Broker ${action}d successfully` });
  } catch (error) {
    console.error('Error updating broker verification:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all users for management
router.get('/users', async (req, res) => {
  try {
    const [users] = await pool.execute(`
      SELECT u.*, b.license_number, b.verification_status
      FROM users u 
      LEFT JOIN brokers b ON u.id = b.user_id 
      ORDER BY u.created_at DESC
    `);

    const formattedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      isVerified: user.is_verified,
      createdAt: new Date(user.created_at),
      ...(user.role === 'broker' && {
        licenseNumber: user.license_number,
        verificationStatus: user.verification_status
      })
    }));

    res.json(formattedUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;