const { Pool } = require('pg');

exports.handler = async (event, context) => {
  try {
    const pool = new Pool({
      connectionString: process.env.NETLIFY_DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    const result = await pool.query('SELECT NOW() as current_time');
    await pool.end();

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Database connection successful',
        time: result.rows[0].current_time,
        env: {
          hasDatabase: !!process.env.NETLIFY_DATABASE_URL,
          nodeEnv: process.env.NODE_ENV
        }
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: error.message,
        stack: error.stack
      })
    };
  }
};