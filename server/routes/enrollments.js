// =============================================================================
// STUDENT MANAGEMENT SYSTEM
// File: server/routes/enrollments.js
// Description: Student Course Enrollments via Stored Procedure 'enroll_student'
// =============================================================================

const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// GET /api/enrollments - List enrollments with comprehensive join metadata
router.get('/', async (req, res) => {
    try {
        const { student_id, course_id, semester } = req.query;

        let sql = `
            SELECT 
                e.enrollment_id,
                e.student_id,
                s.name AS student_name,
                s.email AS student_email,
                d.dept_name,
                e.course_id,
                c.course_name,
                c.credits,
                f.name AS instructor_name,
                e.semester,
                e.enrollment_date,
                m.internal,
                m.external,
                m.total,
                m.grade
            FROM enrollments e
            JOIN students s ON e.student_id = s.student_id
            JOIN departments d ON s.dept_id = d.dept_id
            JOIN courses c ON e.course_id = c.course_id
            LEFT JOIN faculty f ON c.faculty_id = f.faculty_id
            LEFT JOIN marks m ON e.enrollment_id = m.enrollment_id
        `;

        const whereClauses = [];
        const params = [];

        if (student_id) {
            whereClauses.push('e.student_id = ?');
            params.push(parseInt(student_id, 10));
        }
        if (course_id) {
            whereClauses.push('e.course_id = ?');
            params.push(parseInt(course_id, 10));
        }
        if (semester) {
            whereClauses.push('e.semester = ?');
            params.push(parseInt(semester, 10));
        }

        if (whereClauses.length > 0) {
            sql += ` WHERE ${whereClauses.join(' AND ')}`;
        }

        sql += ' ORDER BY e.semester DESC, e.enrollment_id DESC';

        const [rows] = await pool.query(sql, params);
        return res.json({ success: true, data: rows });

    } catch (err) {
        console.error('[Enrollments GET Error]', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve enrollments.',
            error: err.message
        });
    }
});

// POST /api/enrollments - Enroll student calling MySQL Stored Procedure 'enroll_student'
router.post('/', async (req, res) => {
    try {
        const { student_id, course_id, semester } = req.body;

        if (!student_id || !course_id || !semester) {
            return res.status(400).json({
                success: false,
                message: 'Student ID, Course ID, and Semester are all required.'
            });
        }

        const studentId = parseInt(student_id, 10);
        const courseId = parseInt(course_id, 10);
        const sem = parseInt(semester, 10);

        if (isNaN(studentId) || isNaN(courseId) || isNaN(sem)) {
            return res.status(400).json({
                success: false,
                message: 'Student ID, Course ID, and Semester must be valid numbers.'
            });
        }

        // Call Stored Procedure: enroll_student(p_student_id, p_course_id, p_semester)
        // The procedure encapsulates input validation, duplicate checks, and transaction commit/rollback
        const [results] = await pool.query('CALL enroll_student(?, ?, ?)', [studentId, courseId, sem]);

        // In mysql2, stored procedure SELECT returns as the first item in the results array
        const procedureOutput = results[0] && results[0][0] ? results[0][0] : null;

        return res.status(201).json({
            success: true,
            message: 'Student successfully enrolled via stored procedure.',
            data: procedureOutput
        });

    } catch (err) {
        // Handle custom exceptions raised by SIGNAL in stored procedure
        const errorMsg = err.sqlMessage || err.message;
        console.error('[Enroll Student Procedure Error]', errorMsg);

        if (errorMsg.includes('Validation Error')) {
            return res.status(400).json({ success: false, message: errorMsg });
        }
        if (errorMsg.includes('Foreign Key Error')) {
            return res.status(404).json({ success: false, message: errorMsg });
        }
        if (errorMsg.includes('Conflict Error') || err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: 'Duplicate Enrollment: Student is already registered for this course in the specified semester.'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Database error executing enrollment procedure.',
            error: errorMsg
        });
    }
});

// DELETE /api/enrollments/:id - Cancel enrollment
router.delete('/:id', async (req, res) => {
    try {
        const enrollmentId = parseInt(req.params.id, 10);
        if (isNaN(enrollmentId)) {
            return res.status(400).json({ success: false, message: 'Invalid enrollment ID.' });
        }

        const [existing] = await pool.query('SELECT enrollment_id FROM enrollments WHERE enrollment_id = ?', [enrollmentId]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Enrollment not found.' });
        }

        await pool.query('DELETE FROM enrollments WHERE enrollment_id = ?', [enrollmentId]);

        return res.json({
            success: true,
            message: 'Enrollment and associated marks record removed successfully.'
        });

    } catch (err) {
        console.error('[Enrollment Delete Error]', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to cancel enrollment.',
            error: err.message
        });
    }
});

module.exports = router;

