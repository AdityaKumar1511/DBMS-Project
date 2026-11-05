// =============================================================================
// STUDENT MANAGEMENT SYSTEM
// File: server/db.js
// Description: MySQL Connection Pool configured with mysql2/promise
// =============================================================================

const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

// Create connection pool for optimal resource reuse and thread management
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'student_management_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    dateStrings: true // Return dates as YYYY-MM-DD strings for clean frontend rendering
});

// Test connection on module load
pool.getConnection()
    .then(connection => {
        console.log(`[Database] Connected successfully to MySQL database "${process.env.DB_NAME || 'student_management_db'}" on ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306}`);
        connection.release();
    })
    .catch(err => {
        console.error('[Database] Initial connection pool error:', err.message);
        console.error('[Database] Tip: Ensure MySQL server is running and .env credentials are correct. Run "npm run setup:db" to initialize tables.');
    });

module.exports = pool;

