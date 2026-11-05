// =============================================================================
// STUDENT MANAGEMENT SYSTEM
// File: server/routes/faculty.js
// Description: Faculty Members CRUD & Course Allocation Management
// =============================================================================

const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// GET /api/faculty - List all faculty members
router.get('/', async (req, res) => {
    try {
        const { dept_id } = req.query;

        let sql = `
            SELECT 
                f.faculty_id,
                f.name,
                f.email,
                f.dept_id,
                d.dept_name,
                COUNT(c.course_id) AS assigned_courses_count
            FROM faculty f
            JOIN departments d ON f.dept_id = d.dept_id
            LEFT JOIN courses c ON f.faculty_id = c.faculty_id
        `;

        const params = [];
        if (dept_id) {
            sql += ' WHERE f.dept_id = ?';
            params.push(parseInt(dept_id, 10));
        }

        sql += ' GROUP BY f.faculty_id, f.name, f.email, f.dept_id, d.dept_name ORDER BY f.faculty_id ASC';

        const [rows] = await pool.query(sql, params);
        return res.json({ success: true, data: rows });

    } catch (err) {
        console.error('[Faculty GET Error]', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve faculty list.',
            error: err.message
        });
    }
});

// GET /api/faculty/:id - Single faculty details
router.get('/:id', async (req, res) => {
    try {
        const facultyId = parseInt(req.params.id, 10);
        if (isNaN(facultyId)) {
            return res.status(400).json({ success: false, message: 'Invalid faculty ID.' });
        }

        const [faculty] = await pool.query(
            `SELECT f.*, d.dept_name 
             FROM faculty f 
             JOIN departments d ON f.dept_id = d.dept_id 
             WHERE f.faculty_id = ?`,
            [facultyId]
        );

        if (faculty.length === 0) {
            return res.status(404).json({ success: false, message: 'Faculty member not found.' });
        }

        const [courses] = await pool.query(
            'SELECT course_id, course_name, credits FROM courses WHERE faculty_id = ?',
            [facultyId]
        );

        return res.json({
            success: true,
            data: {
                ...faculty[0],
                courses
            }
        });

    } catch (err) {
        console.error('[Faculty Detail Error]', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve faculty details.',
            error: err.message
        });
    }
});

// POST /api/faculty - Register new faculty member
router.post('/', async (req, res) => {
    try {
        const { name, email, dept_id } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: 'Faculty name is required.' });
        }
        if (!email || !email.includes('@')) {
            return res.status(400).json({ success: false, message: 'Valid institutional email is required.' });
        }
        if (!dept_id) {
            return res.status(400).json({ success: false, message: 'Department is required.' });
        }

        // Email uniqueness
        const [existing] = await pool.query('SELECT faculty_id FROM faculty WHERE email = ?', [email.trim().toLowerCase()]);
        if (existing.length > 0) {
            return res.status(409).json({ success: false, message: 'Email is already registered with another faculty member.' });
        }

        const [result] = await pool.query(
            'INSERT INTO faculty (name, email, dept_id) VALUES (?, ?, ?)',
            [name.trim(), email.trim().toLowerCase(), parseInt(dept_id, 10)]
        );

        const [created] = await pool.query(
            'SELECT f.*, d.dept_name FROM faculty f JOIN departments d ON f.dept_id = d.dept_id WHERE f.faculty_id = ?',
            [result.insertId]
        );

        return res.status(201).json({
            success: true,
            message: 'Faculty member registered successfully.',
            data: created[0]
        });

    } catch (err) {
        console.error('[Faculty Create Error]', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to register faculty.',
            error: err.message
        });
    }
});

// PUT /api/faculty/:id - Update faculty details
router.put('/:id', async (req, res) => {
    try {
        const facultyId = parseInt(req.params.id, 10);
        const { name, email, dept_id } = req.body;

        if (isNaN(facultyId)) {
            return res.status(400).json({ success: false, message: 'Invalid faculty ID.' });
        }

        const [existing] = await pool.query('SELECT faculty_id FROM faculty WHERE faculty_id = ?', [facultyId]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Faculty member not found.' });
        }

        if (email) {
            const [check] = await pool.query(
                'SELECT faculty_id FROM faculty WHERE email = ? AND faculty_id != ?',
                [email.trim().toLowerCase(), facultyId]
            );
            if (check.length > 0) {
                return res.status(409).json({ success: false, message: 'Email already assigned to another faculty member.' });
            }
        }

        await pool.query(
            `UPDATE faculty 
             SET name = COALESCE(?, name),
                 email = COALESCE(?, email),
                 dept_id = COALESCE(?, dept_id)
             WHERE faculty_id = ?`,
            [
                name ? name.trim() : null,
                email ? email.trim().toLowerCase() : null,
                dept_id ? parseInt(dept_id, 10) : null,
                facultyId
            ]
        );

        const [updated] = await pool.query(
            'SELECT f.*, d.dept_name FROM faculty f JOIN departments d ON f.dept_id = d.dept_id WHERE f.faculty_id = ?',
            [facultyId]
        );

        return res.json({
            success: true,
            message: 'Faculty details updated successfully.',
            data: updated[0]
        });

    } catch (err) {
        console.error('[Faculty Update Error]', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to update faculty member.',
            error: err.message
        });
    }
});

// DELETE /api/faculty/:id - Remove faculty member
router.delete('/:id', async (req, res) => {
    try {
        const facultyId = parseInt(req.params.id, 10);
        if (isNaN(facultyId)) {
            return res.status(400).json({ success: false, message: 'Invalid faculty ID.' });
        }

        const [existing] = await pool.query('SELECT faculty_id, name FROM faculty WHERE faculty_id = ?', [facultyId]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Faculty member not found.' });
        }

        // ON DELETE SET NULL on courses.faculty_id ensures courses are disassociated safely
        await pool.query('DELETE FROM faculty WHERE faculty_id = ?', [facultyId]);

        return res.json({
            success: true,
            message: `Faculty member "${existing[0].name}" removed successfully.`
        });

    } catch (err) {
        console.error('[Faculty Delete Error]', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to delete faculty member.',
            error: err.message
        });
    }
});

module.exports = router;

