const mysql = require('mysql2/promise');
const { Pool } = require('pg');
require('dotenv').config();

let pool;

if (process.env.NETLIFY_DATABASE_URL) {
  // PostgreSQL for production (Neon)
  pool = new Pool({
    connectionString: process.env.NETLIFY_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  // Wrapper to make PostgreSQL work with existing MySQL queries
  pool.execute = async (query, params) => {
    const client = await pool.connect();
    try {
      // Convert MySQL ? placeholders to PostgreSQL $1, $2, etc.
      let pgQuery = query;
      let paramIndex = 1;
      while (pgQuery.includes('?')) {
        pgQuery = pgQuery.replace('?', `$${paramIndex}`);
        paramIndex++;
      }
      const result = await client.query(pgQuery, params);
      return [result.rows];
    } finally {
      client.release();
    }
  };
} else {
  // MySQL for local development
  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '@Sammies1999',
    database: process.env.DB_NAME || 'brokers',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
}

module.exports = pool;