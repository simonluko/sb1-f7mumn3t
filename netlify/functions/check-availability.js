const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const path = require('path');
const fs = require('fs');

// Ensure the database directory exists
const dbDir = path.join(__dirname, '../../.netlify/data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize database
const initializeDatabase = async () => {
  const db = await open({
    filename: path.join(dbDir, 'bookings.db'),
    driver: sqlite3.Database
  });

  // Create bookings table if it doesn't exist
  await db.exec(`
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      firstName TEXT NOT NULL,
      lastName TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      services TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      location TEXT NOT NULL,
      message TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  console.log('Database initialized');
  return db;
};

exports.handler = async (event, context) => {
  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ success: false, message: 'Method not allowed' })
    };
  }

  try {
    // Get date from query parameters
    const { date } = event.queryStringParameters || {};
    
    if (!date) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, message: 'Date parameter is required' })
      };
    }
    
    // Initialize database
    const db = await initializeDatabase();
    
    // Query database for bookings on the specified date
    const bookings = await db.all(
      'SELECT time FROM bookings WHERE date = ?',
      [date]
    );
    
    // Extract booked times
    const bookedTimes = bookings.map(booking => booking.time);
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        bookedTimes 
      })
    };
  } catch (error) {
    console.error('Error checking availability:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        success: false, 
        message: 'Failed to check availability. Please try again.' 
      })
    };
  }
};