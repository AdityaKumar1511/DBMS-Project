// =============================================================================
// STUDENT MANAGEMENT SYSTEM
// File: server/routes/auth.js
// Description: Authentication endpoints (Login, Logout, Session Status)
// =============================================================================

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('../db');

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required.'
            });
        }

        // Parameterized query prevents SQL injection
        const [users] = await pool.query(
            'SELECT user_id, username, password_hash, role FROM users WHERE username = ? LIMIT 1',
            [username.trim()]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid username or password.'
            });
        }

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid username or password.'
            });
        }

        // Establish session
        req.session.user = {
            id: user.user_id,
            username: user.username,
            role: user.role
        };

        return res.json({
            success: true,
            message: 'Login successful.',
            data: {
                id: user.user_id,
                username: user.username,
                role: user.role
            }
        });

    } catch (err) {
        console.error('[Auth Error]', err);
        return res.status(500).json({
            success: false,
            message: 'Server error during authentication.',
            error: err.message
        });
    }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Logout failed.'
            });
        }
        res.clearCookie('sms.sid');
        return res.json({
            success: true,
            message: 'Logged out successfully.'
        });
    });
});

// GET /api/auth/status
router.get('/status', (req, res) => {
    if (req.session && req.session.user) {
        return res.json({
            success: true,
            authenticated: true,
            user: req.session.user
        });
    }
    return res.json({
        success: true,
        authenticated: false,
        user: null
    });
});

module.exports = router;

