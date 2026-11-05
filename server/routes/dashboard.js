// =============================================================================
// STUDENT MANAGEMENT SYSTEM
// File: server/routes/dashboard.js
// Description: Dashboard counts, department summary view, and top students
// =============================================================================

const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', async (req, res) => {
    try {
        const [[studentCount]] = await pool.query('SELECT COUNT(*) AS total FROM students');
        const [[courseCount]] = await pool.query('SELECT COUNT(*) AS total FROM courses');
        const [[deptCount]] = await pool.query('SELECT COUNT(*) AS total FROM departments');
        const [[facultyCount]] = await pool.query('SELECT COUNT(*) AS total FROM faculty');
        const [[marksAverage]] = await pool.query('SELECT ROUND(COALESCE(AVG(total), 0), 2) AS average FROM marks WHERE total > 0');

        // Read from the SQL view created in database/views.sql.
        const [departmentSummary] = await pool.query(
            'SELECT * FROM department_summary ORDER BY dept_id ASC'
        );

        const [topStudents] = await pool.query(`
            SELECT
                s.student_id,
                s.name,
                s.email,
                d.dept_name,
                COUNT(e.enrollment_id) AS courses_enrolled,
                ROUND(AVG(m.total), 2) AS average_score
            FROM students s
            JOIN departments d ON s.dept_id = d.dept_id
            JOIN enrollments e ON s.student_id = e.student_id
            JOIN marks m ON e.enrollment_id = m.enrollment_id
            GROUP BY s.student_id, s.name, s.email, d.dept_name
            ORDER BY average_score DESC
            LIMIT 5
        `);

        const [defaulters] = await pool.query(`
            SELECT COUNT(*) AS total_defaulters FROM (
                SELECT s.student_id
                FROM students s
                JOIN attendance a ON s.student_id = a.student_id
                GROUP BY s.student_id, a.course_id
                HAVING (SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) / COUNT(a.attendance_id)) * 100 < 75.00
            ) AS def_sub
        `);

        return res.json({
            success: true,
            data: {
                counts: {
                    students: studentCount.total,
                    courses: courseCount.total,
                    departments: deptCount.total,
                    faculty: facultyCount.total,
                    averageMarks: marksAverage.average || 0,
                    defaultersCount: defaulters[0] ? defaulters[0].total_defaulters : 0
                },
                departmentSummary,
                topStudents
            }
        });
    } catch (err) {
        console.error('[Dashboard Error]', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to load dashboard data.',
            error: err.message
        });
    }
});

module.exports = router;
