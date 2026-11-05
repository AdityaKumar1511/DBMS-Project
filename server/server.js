// =============================================================================
// STUDENT MANAGEMENT SYSTEM
// File: server/server.js
// Description: Express Application Entry Point & Middleware Configuration
// =============================================================================

const path = require('path');
const express = require('express');
const session = require('express-session');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'dbms_project_session_secret_key_2026';

// Middleware: Request Body Parsing
app.use(express.json());

// Middleware: Express Session Authentication
app.use(session({
    name: 'sms.sid',
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false, // Set to true if deployed behind HTTPS
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'lax'
    }
}));

// Static Asset Serving (Frontend HTML/CSS/JS)
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/students', require('./routes/students'));
app.use('/api/departments', require('./routes/departments'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/faculty', require('./routes/faculty'));
app.use('/api/enrollments', require('./routes/enrollments'));
app.use('/api/marks', require('./routes/marks'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/reports', require('./routes/reports'));

// Root Redirection
app.get('/', (req, res) => {
    if (req.session && req.session.user) {
        return res.redirect('/dashboard.html');
    }
    return res.redirect('/login.html');
});

// 404 Handler for Unknown API Endpoints
app.all('/api/*', (req, res) => {
    return res.status(404).json({
        success: false,
        message: `API endpoint "${req.method} ${req.path}" not found.`
    });
});

// Global Error Handling Middleware
app.use((err, req, res, next) => {
    console.error('[Unhandled Server Error]', err.stack || err.message);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'An unexpected internal server error occurred.'
    });
});

// Start Express Server
app.listen(PORT, () => {
    console.log('====================================================');
    console.log(`  Student Management System running on http://localhost:${PORT}`);
    console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('====================================================');
});

module.exports = app;

