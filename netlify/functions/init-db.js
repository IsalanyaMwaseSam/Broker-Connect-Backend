const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

exports.handler = async (event, context) => {
  try {
    const pool = new Pool({
      connectionString: process.env.NETLIFY_DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    console.log('Initializing PostgreSQL database...');

    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        role VARCHAR(20) CHECK (role IN ('client', 'broker', 'admin')) DEFAULT 'client',
        is_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create brokers table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS brokers (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(36) REFERENCES users(id),
        license_number VARCHAR(100),
        nin VARCHAR(20),
        verification_status VARCHAR(20) CHECK (verification_status IN ('pending', 'verified', 'rejected')) DEFAULT 'pending',
        rating DECIMAL(3,2) DEFAULT 0,
        total_reviews INT DEFAULT 0,
        commission DECIMAL(5,2) DEFAULT 5.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create properties table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS properties (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(15,2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'UGX',
        category VARCHAR(20) CHECK (category IN ('sale', 'rental')) NOT NULL,
        type VARCHAR(100) NOT NULL,
        bedrooms INT,
        bathrooms INT,
        area_sqft INT,
        size DECIMAL(10,2),
        location VARCHAR(255) NOT NULL,
        district VARCHAR(100),
        area VARCHAR(100),
        address VARCHAR(255),
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        amenities JSON,
        images JSON,
        status VARCHAR(20) CHECK (status IN ('available', 'pending', 'sold', 'rented')) DEFAULT 'available',
        broker_id VARCHAR(36) REFERENCES users(id),
        views INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Database tables created successfully!');
    
    // Insert default admin user
    const adminExists = await pool.query('SELECT id FROM users WHERE email = $1', ['admin@test.com']);
    if (adminExists.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      await pool.query(`
        INSERT INTO users (id, name, email, password_hash, role, is_verified) 
        VALUES ($1, $2, $3, $4, $5, $6)
      `, ['admin-001', 'Admin User', 'admin@test.com', hashedPassword, 'admin', true]);
      
      console.log('Default admin user created');
    }

    // Insert test client user
    const clientExists = await pool.query('SELECT id FROM users WHERE email = $1', ['client@test.com']);
    if (clientExists.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      await pool.query(`
        INSERT INTO users (id, name, email, password_hash, role, is_verified) 
        VALUES ($1, $2, $3, $4, $5, $6)
      `, ['client-001', 'Test Client', 'client@test.com', hashedPassword, 'client', true]);
      
      console.log('Default client user created');
    }

    await pool.end();

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Database initialized successfully!',
        tables: ['users', 'brokers', 'properties'],
        defaultUsers: ['admin@test.com', 'client@test.com']
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: error.message,
        stack: error.stack
      })
    };
  }
};