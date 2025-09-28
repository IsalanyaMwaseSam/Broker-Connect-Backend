const pool = require('./database');

async function updateDatabase() {
  try {
    // Add area column to properties table
    await pool.execute(`
      ALTER TABLE properties ADD COLUMN area VARCHAR(100) AFTER district
    `);
    
    console.log('Database updated successfully! Added area column to properties table.');
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('Area column already exists.');
    } else {
      console.error('Database update failed:', error);
    }
  } finally {
    process.exit();
  }
}

updateDatabase();