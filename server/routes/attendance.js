// =============================================================================
// STUDENT MANAGEMENT SYSTEM
// File: server/routes/attendance.js
// Description: Lecture Attendance Tracking & Stored Procedure 'get_attendance_percentage'
// =============================================================================

const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// GET /api/attendance - List attendance logs with filters
router.get('/', async (req, res) => {
    try {
        const { course_id, student_id, date } = req.query;

        let sql = `
            SELECT 
                a.attendance_id,
                a.student_id,
                s.name AS student_name,
                s.email AS student_email,
                d.dept_name,
                a.course_id,
                c.course_name,
                a.date,
                a.status
            FROM attendance a
            JOIN students s ON a.student_id = s.student_id
            JOIN departments d ON s.dept_id = d.dept_id
            JOIN courses c ON a.course_id = c.course_id
        `;

        const whereClauses = [];
        const params = [];

        if (course_id) {
            whereClauses.push('a.course_id = ?');
            params.push(parseInt(course_id, 10));
        }
        if (student_id) {
            whereClauses.push('a.student_id = ?');
            params.push(parseInt(student_id, 10));
        }
        if (date) {
            whereClauses.push('a.date = ?');
            params.push(date.trim());
        }

        if (whereClauses.length > 0) {
            sql += ` WHERE ${whereClauses.join(' AND ')}`;
        }

        sql += ' ORDER BY a.date DESC, a.attendance_id DESC';

        const [rows] = await pool.query(sql, params);
        return res.json({ success: true, data: rows });

    } catch (err) {
        console.error('[Attendance GET Error]', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve attendance logs.',
            error: err.message
        });
    }
});

// GET /api/attendance/percentage - Call Stored Procedure 'get_attendance_percentage'
router.get('/percentage', async (req, res) => {
    try {
        const { student_id, course_id } = req.query;

        if (!student_id || !course_id) {
            return res.status(400).json({
                success: false,
                message: 'Both student_id and course_id parameters are required.'
            });
        }

        const studentId = parseInt(student_id, 10);
        const courseId = parseInt(course_id, 10);

        if (isNaN(studentId) || isNaN(courseId)) {
            return res.status(400).json({
                success: false,
                message: 'student_id and course_id must be valid integers.'
            });
        }

        // Call Stored Procedure: CALL get_attendance_percentage(p_student_id, p_course_id)
        const [results] = await pool.query('CALL get_attendance_percentage(?, ?)', [studentId, courseId]);
        const data = results[0] && results[0][0] ? results[0][0] : null;

        return res.json({
            success: true,
            data
        });

    } catch (err) {
        console.error('[Attendance Percentage Procedure Error]', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to compute attendance percentage via stored procedure.',
            error: err.message
        });
    }
});

// GET /api/attendance/defaulters - List students with overall or course attendance < 75%
router.get('/defaulters', async (req, res) => {
    try {
        const { course_id } = req.query;

        let sql = `
            SELECT 
                s.student_id,
                s.name AS student_name,
                s.email,
                d.dept_name,
                c.course_id,
                c.course_name,
                COUNT(a.attendance_id) AS total_lectures,
                SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) AS attended_lectures,
                SUM(CASE WHEN a.status = 'Absent' THEN 1 ELSE 0 END) AS missed_lectures,
                ROUND((SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) / COUNT(a.attendance_id)) * 100, 2) AS attendance_percentage,
                'DEFAULTER' AS remark
            FROM students s
            JOIN departments d ON s.dept_id = d.dept_id
            JOIN attendance a ON s.student_id = a.student_id
            JOIN courses c ON a.course_id = c.course_id
        `;

        const params = [];
        if (course_id) {
            sql += ' WHERE a.course_id = ?';
            params.push(parseInt(course_id, 10));
        }

        sql += `
            GROUP BY s.student_id, s.name, s.email, d.dept_name, c.course_id, c.course_name
            HAVING attendance_percentage < 75.00
            ORDER BY attendance_percentage ASC
        `;

        const [rows] = await pool.query(sql, params);
        return res.json({ success: true, data: rows });

    } catch (err) {
        console.error('[Defaulters GET Error]', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve attendance defaulters list.',
            error: err.message
        });
    }
});

// POST /api/attendance - Mark individual attendance record
router.post('/', async (req, res) => {
    try {
        const { student_id, course_id, date, status } = req.body;

        if (!student_id || !course_id || !date || !status) {
            return res.status(400).json({
                success: false,
                message: 'Student ID, Course ID, Date, and Status (Present/Absent) are required.'
            });
        }

        if (!['Present', 'Absent'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Status must be either "Present" or "Absent".'
            });
        }

        const studentId = parseInt(student_id, 10);
        const courseId = parseInt(course_id, 10);

        // Upsert individual attendance
        await pool.query(
            `INSERT INTO attendance (student_id, course_id, date, status)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE status = VALUES(status)`,
            [studentId, courseId, date, status]
        );

        return res.json({
            success: true,
            message: `Attendance marked as ${status} for Student #${studentId}.`
        });

    } catch (err) {
        console.error('[Attendance Mark Error]', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to record attendance.',
            error: err.message
        });
    }
});

// POST /api/attendance/bulk - Record attendance for multiple students for a course session
router.post('/bulk', async (req, res) => {
    try {
        const { course_id, date, attendance_records } = req.body;

        if (!course_id || !date || !Array.isArray(attendance_records) || attendance_records.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Course ID, Date, and a non-empty array of attendance_records are required.'
            });
        }

        const courseId = parseInt(course_id, 10);

        // Construct bulk insert values
        const values = [];
        for (const item of attendance_records) {
            const sid = parseInt(item.student_id, 10);
            const status = item.status === 'Absent' ? 'Absent' : 'Present';
            values.push([sid, courseId, date, status]);
        }

        const sql = `
            INSERT INTO attendance (student_id, course_id, date, status)
            VALUES ?
            ON DUPLICATE KEY UPDATE status = VALUES(status)
        `;

        await pool.query(sql, [values]);

        return res.json({
            success: true,
            message: `Successfully recorded attendance for ${attendance_records.length} students on ${date}.`
        });

    } catch (err) {
        console.error('[Bulk Attendance Error]', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to process bulk attendance submission.',
            error: err.message
        });
    }
});

module.exports = router;

