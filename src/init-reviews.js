const pool = require('./database');

async function createReviewsTable() {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS reviews (
        id VARCHAR(36) PRIMARY KEY,
        booking_id VARCHAR(36) NOT NULL,
        client_id VARCHAR(36) NOT NULL,
        broker_id VARCHAR(36) NOT NULL,
        property_id VARCHAR(36) NOT NULL,
        broker_rating INT NOT NULL CHECK (broker_rating >= 1 AND broker_rating <= 5),
        broker_comment TEXT,
        property_rating INT NOT NULL CHECK (property_rating >= 1 AND property_rating <= 5),
        property_comment TEXT,
        property_taken BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (booking_id) REFERENCES bookings(id),
        FOREIGN KEY (client_id) REFERENCES users(id),
        FOREIGN KEY (broker_id) REFERENCES users(id),
        FOREIGN KEY (property_id) REFERENCES properties(id),
        UNIQUE KEY unique_booking_review (booking_id)
      )
    `);
    
    console.log('Reviews table created successfully!');
  } catch (error) {
    console.error('Error creating reviews table:', error);
  } finally {
    process.exit();
  }
}

createReviewsTable();