const pool = require('./database');

async function initDatabase() {
  try {
    // Create users table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('client', 'broker', 'admin') NOT NULL,
        is_verified BOOLEAN DEFAULT FALSE,
        avatar VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Create brokers table (extends users)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS brokers (
        user_id VARCHAR(36) PRIMARY KEY,
        license_number VARCHAR(100) NOT NULL,
        nin VARCHAR(20) NOT NULL,
        verification_status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
        rating DECIMAL(3,2) DEFAULT 0.00,
        total_reviews INT DEFAULT 0,
        commission DECIMAL(5,2) DEFAULT 5.00,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create properties table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS properties (
        id VARCHAR(36) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category ENUM('land', 'rental', 'house', 'commercial') NOT NULL,
        price DECIMAL(15,2) NOT NULL,
        currency ENUM('UGX', 'USD') DEFAULT 'UGX',
        district VARCHAR(100) NOT NULL,
        area VARCHAR(100),
        address TEXT NOT NULL,
        latitude DECIMAL(10,8),
        longitude DECIMAL(11,8),
        size DECIMAL(10,2) NOT NULL,
        rooms INT,
        bathrooms INT,
        amenities JSON,
        images JSON,
        videos JSON,
        status ENUM('available', 'sold', 'rented', 'pending') DEFAULT 'available',
        broker_id VARCHAR(36) NOT NULL,
        is_verified BOOLEAN DEFAULT FALSE,
        views INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (broker_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Insert default users
    const bcrypt = require('bcryptjs');
    const { v4: uuidv4 } = require('uuid');
    
    const defaultPassword = await bcrypt.hash('password123', 10);
    
    // Insert broker user
    const brokerId = uuidv4();
    await pool.execute(`
      INSERT IGNORE INTO users (id, email, name, phone, password_hash, role, is_verified)
      VALUES (?, 'broker@test.com', 'John Broker', '+256700000001', ?, 'broker', TRUE)
    `, [brokerId, defaultPassword]);
    
    await pool.execute(`
      INSERT IGNORE INTO brokers (user_id, license_number, nin, verification_status, rating, total_reviews)
      VALUES (?, 'BL001', 'CM12345678901234', 'verified', 4.8, 45)
    `, [brokerId]);

    // Insert client user
    const clientId = uuidv4();
    await pool.execute(`
      INSERT IGNORE INTO users (id, email, name, phone, password_hash, role, is_verified)
      VALUES (?, 'client@test.com', 'Jane Client', '+256700000002', ?, 'client', TRUE)
    `, [clientId, defaultPassword]);

    // Insert admin user
    const adminId = uuidv4();
    await pool.execute(`
      INSERT IGNORE INTO users (id, email, name, phone, password_hash, role, is_verified)
      VALUES (?, 'admin@test.com', 'Admin User', '+256700000003', ?, 'admin', TRUE)
    `, [adminId, defaultPassword]);

    console.log('Database initialized successfully!');
    console.log('Default credentials:');
    console.log('Broker: broker@test.com / password123');
    console.log('Client: client@test.com / password123');
    console.log('Admin: admin@test.com / password123');
    
  } catch (error) {
    console.error('Database initialization failed:', error);
  } finally {
    process.exit();
  }
}

initDatabase();