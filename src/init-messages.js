const pool = require('./database');

async function createMessagesTable() {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR(36) PRIMARY KEY,
        sender_id VARCHAR(36) NOT NULL,
        receiver_id VARCHAR(36) NOT NULL,
        property_id VARCHAR(36),
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sender_id) REFERENCES users(id),
        FOREIGN KEY (receiver_id) REFERENCES users(id),
        FOREIGN KEY (property_id) REFERENCES properties(id)
      )
    `);
    
    console.log('Messages table created successfully!');
  } catch (error) {
    console.error('Error creating messages table:', error);
  } finally {
    process.exit();
  }
}

createMessagesTable();