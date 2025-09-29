const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.NETLIFY_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function initializeDatabase() {
  try {
    console.log('Initializing PostgreSQL database...');

    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) CHECK (role IN ('client', 'broker', 'admin')) DEFAULT 'client',
        phone VARCHAR(20),
        verification_status VARCHAR(20) CHECK (verification_status IN ('pending', 'verified', 'rejected')) DEFAULT 'pending',
        license_number VARCHAR(100),
        nin VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
        location VARCHAR(255) NOT NULL,
        district VARCHAR(100),
        area VARCHAR(100),
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        amenities JSON,
        images JSON,
        status VARCHAR(20) CHECK (status IN ('available', 'pending', 'sold', 'rented')) DEFAULT 'available',
        broker_id INT REFERENCES users(id),
        views INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create bookings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        property_id INT REFERENCES properties(id),
        client_id INT REFERENCES users(id),
        broker_id INT REFERENCES users(id),
        booking_date TIMESTAMP NOT NULL,
        status VARCHAR(20) CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')) DEFAULT 'pending',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create messages table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        sender_id INT REFERENCES users(id),
        receiver_id INT REFERENCES users(id),
        property_id INT REFERENCES properties(id),
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create reviews table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        property_id INT REFERENCES properties(id),
        client_id INT REFERENCES users(id),
        broker_id INT REFERENCES users(id),
        rating INT CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Database initialized successfully!');
    
    // Insert default admin user
    const adminExists = await pool.query('SELECT id FROM users WHERE email = $1', ['admin@test.com']);
    if (adminExists.rows.length === 0) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      await pool.query(`
        INSERT INTO users (name, email, password, role, verification_status) 
        VALUES ($1, $2, $3, $4, $5)
      `, ['Admin User', 'admin@test.com', hashedPassword, 'admin', 'verified']);
      
      console.log('Default admin user created');
    }

  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    await pool.end();
  }
}

initializeDatabase();