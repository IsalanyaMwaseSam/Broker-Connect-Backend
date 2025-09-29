const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../database');
const { v4: uuidv4 } = require('uuid');

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

// Get all properties with filters
router.get('/', async (req, res) => {
  try {
    const { category, district, minPrice, maxPrice, rooms } = req.query;
    
    const userId = req.headers.authorization ? 
      jwt.verify(req.headers.authorization.split(' ')[1], process.env.JWT_SECRET).userId : null;
    
    let query = `
      SELECT p.*, u.name as broker_name, u.phone as broker_phone, u.email as broker_email,
             AVG(r.property_rating) as avg_property_rating,
             COUNT(r.property_rating) as property_review_count,
             AVG(br.broker_rating) as avg_broker_rating,
             COUNT(br.broker_rating) as broker_review_count
      FROM properties p 
      JOIN users u ON p.broker_id = u.id 
      LEFT JOIN reviews r ON p.id = r.property_id
      LEFT JOIN reviews br ON u.id = br.broker_id
      WHERE p.status = 'available'
    `;
    const params = [];

    if (userId) {
      query += ' AND p.id NOT IN (SELECT property_id FROM reviews WHERE client_id = ? AND property_taken = TRUE)';
      params.push(userId);
    }

    if (category) {
      query += ' AND p.category = ?';
      params.push(category);
    }
    if (district) {
      query += ' AND p.district = ?';
      params.push(district);
    }
    if (minPrice) {
      query += ' AND p.price >= ?';
      params.push(minPrice);
    }
    if (maxPrice) {
      query += ' AND p.price <= ?';
      params.push(maxPrice);
    }
    if (rooms) {
      query += ' AND p.rooms >= ?';
      params.push(rooms);
    }

    query += ' GROUP BY p.id ORDER BY p.created_at DESC';

    const [properties] = await pool.execute(query, params);

    const formattedProperties = properties.map(prop => ({
      id: prop.id,
      title: prop.title,
      description: prop.description,
      category: prop.category,
      price: parseFloat(prop.price),
      currency: prop.currency,
      location: {
        district: prop.district,
        area: prop.area,
        address: prop.address,
        coordinates: { lat: parseFloat(prop.latitude || 0), lng: parseFloat(prop.longitude || 0) }
      },
      features: {
        size: parseFloat(prop.size),
        rooms: prop.rooms,
        bathrooms: prop.bathrooms,
        amenities: JSON.parse(prop.amenities || '[]')
      },
      images: JSON.parse(prop.images || '[]'),
      videos: JSON.parse(prop.videos || '[]'),
      status: prop.status,
      brokerId: prop.broker_id,
      isVerified: prop.is_verified,
      views: prop.views,
      createdAt: new Date(prop.created_at),
      updatedAt: new Date(prop.updated_at),
      broker: {
        name: prop.broker_name,
        phone: prop.broker_phone,
        email: prop.broker_email,
        rating: prop.avg_broker_rating ? parseFloat(prop.avg_broker_rating).toFixed(1) : null,
        reviewCount: prop.broker_review_count || 0
      },
      rating: prop.avg_property_rating ? parseFloat(prop.avg_property_rating).toFixed(1) : null,
      reviewCount: prop.property_review_count || 0
    }));

    res.json(formattedProperties);
  } catch (error) {
    console.error('Properties fetch error:', error);
    // Return empty array if tables don't exist yet
    if (error.code === '42P01') {
      return res.json([]);
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new property
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      title, description, category, price, currency, district, area, address,
      size, rooms, bathrooms, amenities, images
    } = req.body;

    const propertyId = uuidv4();
    
    await pool.execute(`
      INSERT INTO properties (
        id, title, description, category, price, currency, district, area, address,
        size, rooms, bathrooms, amenities, images, broker_id, status, is_verified
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'available', true)
    `, [
      propertyId, title, description, category, price, currency, district, area, address,
      size, rooms || null, bathrooms || null, JSON.stringify(amenities || []), 
      JSON.stringify(images || []), req.user.userId
    ]);

    res.status(201).json({ 
      message: 'Property created successfully',
      propertyId 
    });
  } catch (error) {
    console.error('Property creation error:', error);
    
    let errorMessage = 'Server error';
    if (error.code === 'ER_BAD_FIELD_ERROR') {
      errorMessage = 'Database schema error. Please contact administrator.';
    } else if (error.code === 'ER_DUP_ENTRY') {
      errorMessage = 'Property already exists.';
    }
    
    res.status(500).json({ 
      message: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get single property by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [properties] = await pool.execute(`
      SELECT p.*, u.name as broker_name, u.phone as broker_phone, u.email as broker_email,
             b.rating as broker_rating, b.total_reviews as broker_reviews
      FROM properties p 
      JOIN users u ON p.broker_id = u.id 
      LEFT JOIN brokers b ON u.id = b.user_id 
      WHERE p.id = ?
    `, [id]);

    if (properties.length === 0) {
      return res.status(404).json({ message: 'Property not found' });
    }

    const prop = properties[0];
    const formattedProperty = {
      id: prop.id,
      title: prop.title,
      description: prop.description,
      category: prop.category,
      price: parseFloat(prop.price),
      currency: prop.currency,
      location: {
        district: prop.district,
        area: prop.area,
        address: prop.address,
        coordinates: { lat: parseFloat(prop.latitude || 0), lng: parseFloat(prop.longitude || 0) }
      },
      features: {
        size: parseFloat(prop.size),
        rooms: prop.rooms,
        bathrooms: prop.bathrooms,
        amenities: JSON.parse(prop.amenities || '[]')
      },
      images: JSON.parse(prop.images || '[]'),
      videos: JSON.parse(prop.videos || '[]'),
      status: prop.status,
      brokerId: prop.broker_id,
      isVerified: prop.is_verified,
      views: prop.views,
      createdAt: prop.created_at,
      updatedAt: prop.updated_at,
      broker: {
        name: prop.broker_name,
        phone: prop.broker_phone,
        email: prop.broker_email,
        rating: parseFloat(prop.broker_rating || 0),
        totalReviews: prop.broker_reviews || 0
      }
    };

    res.json(formattedProperty);
  } catch (error) {
    console.error('Error fetching property:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get broker's properties  
router.get('/broker/properties', authenticateToken, async (req, res) => {
  try {
    const [properties] = await pool.execute(`
      SELECT p.*, 
             COUNT(m.id) as message_count
      FROM properties p 
      LEFT JOIN messages m ON p.id = m.property_id
      WHERE p.broker_id = ? 
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `, [req.user.userId]);

    const formattedProperties = properties.map(prop => ({
      id: prop.id,
      title: prop.title,
      description: prop.description,
      category: prop.category,
      price: parseFloat(prop.price),
      currency: prop.currency,
      location: {
        district: prop.district,
        area: prop.area,
        address: prop.address,
        coordinates: { lat: parseFloat(prop.latitude || 0), lng: parseFloat(prop.longitude || 0) }
      },
      features: {
        size: parseFloat(prop.size),
        rooms: prop.rooms,
        bathrooms: prop.bathrooms,
        amenities: JSON.parse(prop.amenities || '[]')
      },
      images: JSON.parse(prop.images || '[]'),
      status: prop.status,
      brokerId: prop.broker_id,
      isVerified: prop.is_verified,
      views: prop.views || 0,
      messageCount: prop.message_count || 0,
      createdAt: new Date(prop.created_at),
      updatedAt: new Date(prop.updated_at)
    }));

    res.json(formattedProperties);
  } catch (error) {
    console.error('Error fetching broker properties:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Track property view
router.post('/:id/view', async (req, res) => {
  try {
    const { id } = req.params;
    
    await pool.execute(
      'UPDATE properties SET views = views + 1 WHERE id = ?',
      [id]
    );
    
    res.json({ message: 'View tracked' });
  } catch (error) {
    console.error('Error tracking view:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get client's taken properties
router.get('/client/taken', authenticateToken, async (req, res) => {
  try {
    const [properties] = await pool.execute(`
      SELECT p.*, u.name as broker_name, u.phone as broker_phone, u.email as broker_email,
             r.property_rating, r.property_comment, r.created_at as review_date
      FROM properties p 
      JOIN users u ON p.broker_id = u.id 
      JOIN reviews r ON p.id = r.property_id
      WHERE r.client_id = ? AND r.property_taken = TRUE
      ORDER BY r.created_at DESC
    `, [req.user.userId]);

    const formattedProperties = properties.map(prop => ({
      id: prop.id,
      title: prop.title,
      description: prop.description,
      category: prop.category,
      price: parseFloat(prop.price),
      currency: prop.currency,
      location: {
        district: prop.district,
        area: prop.area,
        address: prop.address
      },
      features: {
        size: parseFloat(prop.size),
        rooms: prop.rooms,
        bathrooms: prop.bathrooms,
        amenities: JSON.parse(prop.amenities || '[]')
      },
      images: JSON.parse(prop.images || '[]'),
      broker: {
        name: prop.broker_name,
        phone: prop.broker_phone,
        email: prop.broker_email
      },
      review: {
        rating: prop.property_rating,
        comment: prop.property_comment,
        date: prop.review_date
      }
    }));

    res.json(formattedProperties);
  } catch (error) {
    console.error('Error fetching taken properties:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;