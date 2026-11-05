// =============================================================================
// STUDENT MANAGEMENT SYSTEM
// File: server/routes/courses.js
// Description: Courses Catalog Management & Assignment CRUD
// =============================================================================

const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// GET /api/courses - List courses with department and instructor details
router.get('/', async (req, res) => {
    try {
        const { dept_id } = req.query;

        let sql = `
            SELECT 
                c.course_id,
                c.course_name,
                c.credits,
                c.dept_id,
                d.dept_name,
                c.faculty_id,
                f.name AS faculty_name,
                COUNT(DISTINCT e.enrollment_id) AS enrolled_students_count
            FROM courses c
            JOIN departments d ON c.dept_id = d.dept_id
            LEFT JOIN faculty f ON c.faculty_id = f.faculty_id
            LEFT JOIN enrollments e ON c.course_id = e.course_id
        `;

        const params = [];
        if (dept_id) {
            sql += ' WHERE c.dept_id = ?';
            params.push(parseInt(dept_id, 10));
        }

        sql += ' GROUP BY c.course_id, c.course_name, c.credits, c.dept_id, d.dept_name, c.faculty_id, f.name ORDER BY c.course_id ASC';

        const [rows] = await pool.query(sql, params);
        return res.json({ success: true, data: rows });

    } catch (err) {
        console.error('[Courses GET Error]', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve courses.',
            error: err.message
        });
    }
});

// GET /api/courses/:id - Single course with enrolled students
router.get('/:id', async (req, res) => {
    try {
        const courseId = parseInt(req.params.id, 10);
        if (isNaN(courseId)) {
            return res.status(400).json({ success: false, message: 'Invalid course ID.' });
        }

        const [courses] = await pool.query(
            `SELECT c.*, d.dept_name, f.name AS faculty_name 
             FROM courses c 
             JOIN departments d ON c.dept_id = d.dept_id 
             LEFT JOIN faculty f ON c.faculty_id = f.faculty_id 
             WHERE c.course_id = ?`,
            [courseId]
        );

        if (courses.length === 0) {
            return res.status(404).json({ success: false, message: 'Course not found.' });
        }

        const [enrolledStudents] = await pool.query(
            `SELECT s.student_id, s.name, s.email, e.semester, m.total, m.grade
             FROM enrollments e
             JOIN students s ON e.student_id = s.student_id
             LEFT JOIN marks m ON e.enrollment_id = m.enrollment_id
             WHERE e.course_id = ?
             ORDER BY s.name ASC`,
            [courseId]
        );

        return res.json({
            success: true,
            data: {
                ...courses[0],
                enrolledStudents
            }
        });

    } catch (err) {
        console.error('[Course Detail Error]', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve course details.',
            error: err.message
        });
    }
});

// POST /api/courses - Create course
router.post('/', async (req, res) => {
    try {
        const { course_name, credits, dept_id, faculty_id } = req.body;

        if (!course_name || !course_name.trim()) {
            return res.status(400).json({ success: false, message: 'Course name is required.' });
        }

        const creditNum = parseInt(credits, 10);
        if (isNaN(creditNum) || creditNum < 1 || creditNum > 6) {
            return res.status(400).json({ success: false, message: 'Credits must be an integer between 1 and 6.' });
        }

        if (!dept_id) {
            return res.status(400).json({ success: false, message: 'Department is required.' });
        }

        const [deptCheck] = await pool.query('SELECT dept_id FROM departments WHERE dept_id = ?', [parseInt(dept_id, 10)]);
        if (deptCheck.length === 0) {
            return res.status(400).json({ success: false, message: 'Invalid department ID.' });
        }

        let assignedFacultyId = null;
        if (faculty_id) {
            const [facCheck] = await pool.query('SELECT faculty_id FROM faculty WHERE faculty_id = ?', [parseInt(faculty_id, 10)]);
            if (facCheck.length > 0) {
                assignedFacultyId = parseInt(faculty_id, 10);
            }
        }

        const [result] = await pool.query(
            'INSERT INTO courses (course_name, credits, dept_id, faculty_id) VALUES (?, ?, ?, ?)',
            [course_name.trim(), creditNum, parseInt(dept_id, 10), assignedFacultyId]
        );

        const [created] = await pool.query(
            `SELECT c.*, d.dept_name, f.name AS faculty_name 
             FROM courses c 
             JOIN departments d ON c.dept_id = d.dept_id 
             LEFT JOIN faculty f ON c.faculty_id = f.faculty_id 
             WHERE c.course_id = ?`,
            [result.insertId]
        );

        return res.status(201).json({
            success: true,
            message: 'Course created successfully.',
            data: created[0]
        });

    } catch (err) {
        console.error('[Course Create Error]', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to create course.',
            error: err.message
        });
    }
});

// PUT /api/courses/:id - Update course
router.put('/:id', async (req, res) => {
    try {
        const courseId = parseInt(req.params.id, 10);
        const { course_name, credits, dept_id, faculty_id } = req.body;

        if (isNaN(courseId)) {
            return res.status(400).json({ success: false, message: 'Invalid course ID.' });
        }

        const [existing] = await pool.query('SELECT course_id FROM courses WHERE course_id = ?', [courseId]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Course not found.' });
        }

        let creditNum = null;
        if (credits !== undefined) {
            creditNum = parseInt(credits, 10);
            if (isNaN(creditNum) || creditNum < 1 || creditNum > 6) {
                return res.status(400).json({ success: false, message: 'Credits must be between 1 and 6.' });
            }
        }

        await pool.query(
            `UPDATE courses 
             SET course_name = COALESCE(?, course_name),
                 credits = COALESCE(?, credits),
                 dept_id = COALESCE(?, dept_id),
                 faculty_id = ?
             WHERE course_id = ?`,
            [
                course_name ? course_name.trim() : null,
                creditNum,
                dept_id ? parseInt(dept_id, 10) : null,
                faculty_id ? parseInt(faculty_id, 10) : null,
                courseId
            ]
        );

        const [updated] = await pool.query(
            `SELECT c.*, d.dept_name, f.name AS faculty_name 
             FROM courses c 
             JOIN departments d ON c.dept_id = d.dept_id 
             LEFT JOIN faculty f ON c.faculty_id = f.faculty_id 
             WHERE c.course_id = ?`,
            [courseId]
        );

        return res.json({
            success: true,
            message: 'Course updated successfully.',
            data: updated[0]
        });

    } catch (err) {
        console.error('[Course Update Error]', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to update course.',
            error: err.message
        });
    }
});

// DELETE /api/courses/:id - Delete course
router.delete('/:id', async (req, res) => {
    try {
        const courseId = parseInt(req.params.id, 10);
        if (isNaN(courseId)) {
            return res.status(400).json({ success: false, message: 'Invalid course ID.' });
        }

        const [existing] = await pool.query('SELECT course_id, course_name FROM courses WHERE course_id = ?', [courseId]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Course not found.' });
        }

        await pool.query('DELETE FROM courses WHERE course_id = ?', [courseId]);

        return res.json({
            success: true,
            message: `Course "${existing[0].course_name}" deleted successfully.`
        });

    } catch (err) {
        if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED') {
            return res.status(409).json({
                success: false,
                message: 'Foreign Key Violation: Cannot delete this course because students are actively enrolled in it or attendance logs exist. Remove enrollments first.'
            });
        }
        console.error('[Course Delete Error]', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to delete course.',
            error: err.message
        });
    }
});

module.exports = router;

