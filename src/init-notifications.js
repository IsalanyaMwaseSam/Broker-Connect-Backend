const pool = require('./database');

async function createNotificationsTable() {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        type ENUM('message', 'booking', 'booking_update') NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        related_id VARCHAR(36),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    
    console.log('Notifications table created successfully!');
  } catch (error) {
    console.error('Error creating notifications table:', error);
  } finally {
    process.exit();
  }
}

createNotificationsTable();