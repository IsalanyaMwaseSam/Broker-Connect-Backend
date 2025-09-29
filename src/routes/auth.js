const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../database');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  try {
    console.log('Login attempt for:', req.body.email);
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    const [users] = await pool.execute(
      'SELECT u.*, b.license_number, b.nin, b.verification_status, b.rating, b.total_reviews, b.commission FROM users u LEFT JOIN brokers b ON u.id = b.user_id WHERE u.email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = users[0];
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

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

    res.json({ user: userData, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password, role, licenseNumber, nin } = req.body;

    const [existingUsers] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    await pool.execute(
      'INSERT INTO users (id, email, name, phone, password_hash, role, is_verified) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, email, name, phone, hashedPassword, role, role === 'client']
    );

    if (role === 'broker') {
      await pool.execute(
        'INSERT INTO brokers (user_id, license_number, nin) VALUES (?, ?, ?)',
        [userId, licenseNumber, nin]
      );
    }

    const token = jwt.sign({ userId, role }, process.env.JWT_SECRET, { expiresIn: '7d' });

    const userData = {
      id: userId,
      email,
      name,
      phone,
      role,
      isVerified: role === 'client',
      createdAt: new Date(),
      ...(role === 'broker' && {
        licenseNumber,
        nin,
        verificationStatus: 'pending',
        rating: 0,
        totalReviews: 0,
        commission: 5
      })
    };

    res.status(201).json({ user: userData, token });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;