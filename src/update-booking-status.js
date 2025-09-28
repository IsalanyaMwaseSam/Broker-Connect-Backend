const pool = require('./database');

async function updateBookingStatus() {
  try {
    // Add new status values to existing bookings table
    await pool.execute(`
      ALTER TABLE bookings 
      MODIFY COLUMN status ENUM('pending', 'confirmed', 'cancelled', 'completed', 'reschedule_pending', 'counter_pending') DEFAULT 'pending'
    `);
    
    console.log('Booking status enum updated successfully!');
  } catch (error) {
    console.error('Error updating booking status:', error);
  } finally {
    process.exit();
  }
}

updateBookingStatus();