// backend/config/db.js

const mysql = require('mysql2');
const dotenv = require('dotenv');

dotenv.config();

// Create MySQL connection
const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT, // important for Aiven
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  ssl: {
    rejectUnauthorized: false
  }
});

// Connect to database
connection.connect((err) => {
  if (err) {
    console.error('❌ Database connection failed:', err);
    return;
  }

  console.log('✅ Connected to Aiven MySQL database');
});

module.exports = connection;