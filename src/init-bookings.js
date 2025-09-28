const pool = require('./database');

async function createBookingsTable() {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS bookings (
        id VARCHAR(36) PRIMARY KEY,
        client_id VARCHAR(36) NOT NULL,
        broker_id VARCHAR(36) NOT NULL,
        property_id VARCHAR(36) NOT NULL,
        visit_date DATE NOT NULL,
        visit_time TIME NOT NULL,
        client_name VARCHAR(255) NOT NULL,
        client_phone VARCHAR(20) NOT NULL,
        message TEXT,
        status ENUM('pending', 'confirmed', 'cancelled', 'completed', 'reschedule_pending', 'counter_pending') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES users(id),
        FOREIGN KEY (broker_id) REFERENCES users(id),
        FOREIGN KEY (property_id) REFERENCES properties(id)
      )
    `);
    
    console.log('Bookings table created successfully!');
  } catch (error) {
    console.error('Error creating bookings table:', error);
  } finally {
    process.exit();
  }
}

createBookingsTable();