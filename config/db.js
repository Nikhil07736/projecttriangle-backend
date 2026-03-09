// backend/config/db.js

const mysql = require('mysql2');
const dotenv = require('dotenv');
dotenv.config();

// Create a MySQL connection
const connection = mysql.createConnection({
  host: process.env.DB_HOST,      // e.g., 'localhost'
  user: process.env.DB_USER,      // e.g., 'root'
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,  // e.g., 'freelance_platform'
});

// Connect to the MySQL database
connection.connect((err) => {
  if (err) {
    console.error('❌ Database connection failed:', err.stack);
    return;
  }
  console.log('✅ Connected to MySQL database.');
});

// Export the connection
module.exports = connection;