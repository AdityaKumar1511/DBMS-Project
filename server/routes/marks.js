// =============================================================================
// STUDENT MANAGEMENT SYSTEM
// File: server/routes/marks.js
// Description: Academic Marks Entry & Trigger-Computed Grade Evaluation
// =============================================================================

const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// GET /api/marks - Fetch all marks with student, course, and enrollment metadata
router.get('/', async (req, res) => {
    try {
        const { course_id, semester, student_id, grade } = req.query;

        let sql = `
            SELECT 
                m.enrollment_id,
                e.student_id,
                s.name AS student_name,
                s.email AS student_email,
                d.dept_name,
                e.course_id,
                c.course_name,
                c.credits,
                e.semester,
                m.internal,
                m.external,
                m.total,
                m.grade,
                m.updated_at
            FROM marks m
            JOIN enrollments e ON m.enrollment_id = e.enrollment_id
            JOIN students s ON e.student_id = s.student_id
            JOIN departments d ON s.dept_id = d.dept_id
            JOIN courses c ON e.course_id = c.course_id
        `;

        const whereClauses = [];
        const params = [];

        if (course_id) {
            whereClauses.push('e.course_id = ?');
            params.push(parseInt(course_id, 10));
        }
        if (semester) {
            whereClauses.push('e.semester = ?');
            params.push(parseInt(semester, 10));
        }
        if (student_id) {
            whereClauses.push('e.student_id = ?');
            params.push(parseInt(student_id, 10));
        }
        if (grade) {
            whereClauses.push('m.grade = ?');
            params.push(grade.trim());
        }

        if (whereClauses.length > 0) {
            sql += ` WHERE ${whereClauses.join(' AND ')}`;
        }

        sql += ' ORDER BY e.semester DESC, m.total DESC';

        const [rows] = await pool.query(sql, params);
        return res.json({ success: true, data: rows });

    } catch (err) {
        console.error('[Marks GET Error]', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve marks.',
            error: err.message
        });
    }
});

// POST /api/marks - Insert or Update marks for an enrollment
// Note: Database triggers `trg_marks_before_insert` and `trg_marks_before_update`
// automatically calculate `total` and derive the academic `grade`!
router.post('/', async (req, res) => {
    try {
        const { enrollment_id, internal, external } = req.body;

        if (enrollment_id === undefined || internal === undefined || external === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Enrollment ID, internal marks (0-40), and external marks (0-60) are required.'
            });
        }

        const enrollmentId = parseInt(enrollment_id, 10);
        const internalMarks = parseFloat(internal);
        const externalMarks = parseFloat(external);

        if (isNaN(enrollmentId)) {
            return res.status(400).json({ success: false, message: 'Invalid enrollment ID.' });
        }

        if (isNaN(internalMarks) || internalMarks < 0 || internalMarks > 40) {
            return res.status(400).json({
                success: false,
                message: 'Internal marks must be a numeric value between 0.00 and 40.00.'
            });
        }

        if (isNaN(externalMarks) || externalMarks < 0 || externalMarks > 60) {
            return res.status(400).json({
                success: false,
                message: 'External marks must be a numeric value between 0.00 and 60.00.'
            });
        }

        // Verify enrollment exists
        const [enrCheck] = await pool.query('SELECT enrollment_id FROM enrollments WHERE enrollment_id = ?', [enrollmentId]);
        if (enrCheck.length === 0) {
            return res.status(404).json({ success: false, message: 'Enrollment record not found.' });
        }

        // Upsert into marks table: trigger fires and sets NEW.total and NEW.grade
        await pool.query(
            `INSERT INTO marks (enrollment_id, internal, external)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE 
                internal = VALUES(internal),
                external = VALUES(external)`,
            [enrollmentId, internalMarks, externalMarks]
        );

        // Fetch the updated row to return the trigger-computed total and grade
        const [updatedRows] = await pool.query(
            `SELECT 
                m.enrollment_id,
                s.name AS student_name,
                c.course_name,
                m.internal,
                m.external,
                m.total,
                m.grade,
                m.updated_at
             FROM marks m
             JOIN enrollments e ON m.enrollment_id = e.enrollment_id
             JOIN students s ON e.student_id = s.student_id
             JOIN courses c ON e.course_id = c.course_id
             WHERE m.enrollment_id = ?`,
            [enrollmentId]
        );

        return res.json({
            success: true,
            message: 'Marks updated successfully. Total score and Grade computed automatically via database trigger.',
            data: updatedRows[0]
        });

    } catch (err) {
        console.error('[Marks Save Error]', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to record marks.',
            error: err.message
        });
    }
});

module.exports = router;

