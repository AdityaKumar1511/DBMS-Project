// =============================================================================
// STUDENT MANAGEMENT SYSTEM
// File: server/routes/departments.js
// Description: Academic Departments CRUD & Department Aggregations
// =============================================================================

const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// GET /api/departments - List all departments with entity counts
router.get('/', async (req, res) => {
    try {
        const query = `
            SELECT 
                d.dept_id,
                d.dept_name,
                d.hod,
                d.created_at,
                COUNT(DISTINCT s.student_id) AS student_count,
                COUNT(DISTINCT c.course_id) AS course_count,
                COUNT(DISTINCT f.faculty_id) AS faculty_count
            FROM departments d
            LEFT JOIN students s ON d.dept_id = s.dept_id
            LEFT JOIN courses c ON d.dept_id = c.dept_id
            LEFT JOIN faculty f ON d.dept_id = f.dept_id
            GROUP BY d.dept_id, d.dept_name, d.hod, d.created_at
            ORDER BY d.dept_id ASC
        `;
        const [rows] = await pool.query(query);
        return res.json({ success: true, data: rows });
    } catch (err) {
        console.error('[Departments GET Error]', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve departments.',
            error: err.message
        });
    }
});

// GET /api/departments/:id - Get single department details
router.get('/:id', async (req, res) => {
    try {
        const deptId = parseInt(req.params.id, 10);
        if (isNaN(deptId)) {
            return res.status(400).json({ success: false, message: 'Invalid department ID.' });
        }

        const [depts] = await pool.query('SELECT * FROM departments WHERE dept_id = ?', [deptId]);
        if (depts.length === 0) {
            return res.status(404).json({ success: false, message: 'Department not found.' });
        }

        const [courses] = await pool.query('SELECT * FROM courses WHERE dept_id = ?', [deptId]);
        const [faculty] = await pool.query('SELECT * FROM faculty WHERE dept_id = ?', [deptId]);

        return res.json({
            success: true,
            data: {
                ...depts[0],
                courses,
                faculty
            }
        });
    } catch (err) {
        console.error('[Department Detail Error]', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve department details.',
            error: err.message
        });
    }
});

// POST /api/departments - Create department
router.post('/', async (req, res) => {
    try {
        const { dept_name, hod } = req.body;

        if (!dept_name || !dept_name.trim()) {
            return res.status(400).json({ success: false, message: 'Department name is required.' });
        }
        if (!hod || !hod.trim()) {
            return res.status(400).json({ success: false, message: 'Head of Department (HOD) name is required.' });
        }

        // Check unique department name
        const [existing] = await pool.query('SELECT dept_id FROM departments WHERE dept_name = ?', [dept_name.trim()]);
        if (existing.length > 0) {
            return res.status(409).json({ success: false, message: 'Department with this name already exists.' });
        }

        const [result] = await pool.query(
            'INSERT INTO departments (dept_name, hod) VALUES (?, ?)',
            [dept_name.trim(), hod.trim()]
        );

        const [created] = await pool.query('SELECT * FROM departments WHERE dept_id = ?', [result.insertId]);

        return res.status(201).json({
            success: true,
            message: 'Department created successfully.',
            data: created[0]
        });

    } catch (err) {
        console.error('[Department Create Error]', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to create department.',
            error: err.message
        });
    }
});

// PUT /api/departments/:id - Update department
router.put('/:id', async (req, res) => {
    try {
        const deptId = parseInt(req.params.id, 10);
        const { dept_name, hod } = req.body;

        if (isNaN(deptId)) {
            return res.status(400).json({ success: false, message: 'Invalid department ID.' });
        }

        const [existing] = await pool.query('SELECT dept_id FROM departments WHERE dept_id = ?', [deptId]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Department not found.' });
        }

        if (dept_name) {
            const [nameCheck] = await pool.query(
                'SELECT dept_id FROM departments WHERE dept_name = ? AND dept_id != ?',
                [dept_name.trim(), deptId]
            );
            if (nameCheck.length > 0) {
                return res.status(409).json({ success: false, message: 'Another department already uses this name.' });
            }
        }

        await pool.query(
            'UPDATE departments SET dept_name = COALESCE(?, dept_name), hod = COALESCE(?, hod) WHERE dept_id = ?',
            [dept_name ? dept_name.trim() : null, hod ? hod.trim() : null, deptId]
        );

        const [updated] = await pool.query('SELECT * FROM departments WHERE dept_id = ?', [deptId]);

        return res.json({
            success: true,
            message: 'Department updated successfully.',
            data: updated[0]
        });

    } catch (err) {
        console.error('[Department Update Error]', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to update department.',
            error: err.message
        });
    }
});

// DELETE /api/departments/:id - Delete department (Protected by Foreign Key RESTRICT)
router.delete('/:id', async (req, res) => {
    try {
        const deptId = parseInt(req.params.id, 10);
        if (isNaN(deptId)) {
            return res.status(400).json({ success: false, message: 'Invalid department ID.' });
        }

        const [existing] = await pool.query('SELECT dept_id, dept_name FROM departments WHERE dept_id = ?', [deptId]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Department not found.' });
        }

        // Attempt deletion; MySQL will throw ER_ROW_IS_REFERENCED_2 if students/courses/faculty reference it
        await pool.query('DELETE FROM departments WHERE dept_id = ?', [deptId]);

        return res.json({
            success: true,
            message: `Department "${existing[0].dept_name}" deleted successfully.`
        });

    } catch (err) {
        if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED') {
            return res.status(409).json({
                success: false,
                message: 'Integrity Constraint Violation: Cannot delete department because active students, courses, or faculty members are currently associated with it. Please reassign them first.'
            });
        }
        console.error('[Department Delete Error]', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to delete department.',
            error: err.message
        });
    }
});

module.exports = router;

