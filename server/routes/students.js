// =============================================================================
// STUDENT MANAGEMENT SYSTEM
// File: server/routes/students.js
// Description: Student CRUD, Search & Filtering with Pagination
// =============================================================================

const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// GET /api/students - List students with search, filter, and pagination
router.get('/', async (req, res) => {
    try {
        const { search, dept_id, admission_year, semester, page = 1, limit = 10 } = req.query;

        const offset = (Math.max(1, parseInt(page, 10)) - 1) * Math.max(1, parseInt(limit, 10));
        const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));

        const whereClauses = [];
        const params = [];

        if (search && search.trim() !== '') {
            whereClauses.push('(s.name LIKE ? OR s.email LIKE ? OR s.phone LIKE ?)');
            const term = `%${search.trim()}%`;
            params.push(term, term, term);
        }

        if (dept_id) {
            whereClauses.push('s.dept_id = ?');
            params.push(parseInt(dept_id, 10));
        }

        if (admission_year) {
            whereClauses.push('s.admission_year = ?');
            params.push(parseInt(admission_year, 10));
        }

        let joinEnrollments = '';
        if (semester) {
            joinEnrollments = 'JOIN enrollments e ON s.student_id = e.student_id';
            whereClauses.push('e.semester = ?');
            params.push(parseInt(semester, 10));
        }

        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        // Count total matching records
        const countSql = `
            SELECT COUNT(DISTINCT s.student_id) as total
            FROM students s
            JOIN departments d ON s.dept_id = d.dept_id
            ${joinEnrollments}
            ${whereSql}
        `;
        const [countResult] = await pool.query(countSql, params);
        const total = countResult[0].total;

        // Fetch paginated rows with department metadata
        const dataSql = `
            SELECT DISTINCT
                s.student_id,
                s.name,
                s.email,
                s.phone,
                s.dob,
                s.gender,
                s.address,
                s.dept_id,
                d.dept_name,
                s.admission_year,
                s.created_at
            FROM students s
            JOIN departments d ON s.dept_id = d.dept_id
            ${joinEnrollments}
            ${whereSql}
            ORDER BY s.student_id DESC
            LIMIT ? OFFSET ?
        `;

        const queryParams = [...params, limitNum, offset];
        const [rows] = await pool.query(dataSql, queryParams);

        return res.json({
            success: true,
            data: rows,
            pagination: {
                total,
                page: parseInt(page, 10),
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum) || 1
            }
        });

    } catch (err) {
        console.error('[Students GET Error]', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve students.',
            error: err.message
        });
    }
});

// GET /api/students/:id - Fetch single student with academic history
router.get('/:id', async (req, res) => {
    try {
        const studentId = parseInt(req.params.id, 10);
        if (isNaN(studentId)) {
            return res.status(400).json({ success: false, message: 'Invalid student ID.' });
        }

        const [students] = await pool.query(
            `SELECT s.*, d.dept_name, d.hod 
             FROM students s 
             JOIN departments d ON s.dept_id = d.dept_id 
             WHERE s.student_id = ?`,
            [studentId]
        );

        if (students.length === 0) {
            return res.status(404).json({ success: false, message: 'Student not found.' });
        }

        // Fetch active enrollments
        const [enrollments] = await pool.query(
            `SELECT e.enrollment_id, e.semester, e.enrollment_date,
                    c.course_id, c.course_name, c.credits,
                    m.internal, m.external, m.total, m.grade
             FROM enrollments e
             JOIN courses c ON e.course_id = c.course_id
             LEFT JOIN marks m ON e.enrollment_id = m.enrollment_id
             WHERE e.student_id = ?
             ORDER BY e.semester ASC, c.course_name ASC`,
            [studentId]
        );

        return res.json({
            success: true,
            data: {
                ...students[0],
                enrollments
            }
        });

    } catch (err) {
        console.error('[Student Detail Error]', err);
        return res.status(500).json({
            success: false,
            message: 'Error fetching student details.',
            error: err.message
        });
    }
});

// POST /api/students - Create new student
router.post('/', async (req, res) => {
    try {
        const { name, email, phone, dob, gender, address, dept_id, admission_year } = req.body;

        // Input Validations
        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: 'Full name is required.' });
        }
        if (!email || !email.includes('@')) {
            return res.status(400).json({ success: false, message: 'Valid email address is required.' });
        }
        if (!dob) {
            return res.status(400).json({ success: false, message: 'Date of birth is required.' });
        }
        if (!gender || !['Male', 'Female', 'Other'].includes(gender)) {
            return res.status(400).json({ success: false, message: 'Gender must be Male, Female, or Other.' });
        }
        if (!dept_id) {
            return res.status(400).json({ success: false, message: 'Department selection is required.' });
        }
        if (!admission_year || admission_year < 1990 || admission_year > 2030) {
            return res.status(400).json({ success: false, message: 'Valid admission year is required.' });
        }

        // Check email uniqueness
        const [existing] = await pool.query('SELECT student_id FROM students WHERE email = ?', [email.trim()]);
        if (existing.length > 0) {
            return res.status(409).json({ success: false, message: 'Email already registered with another student.' });
        }

        const [result] = await pool.query(
            `INSERT INTO students (name, email, phone, dob, gender, address, dept_id, admission_year)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [name.trim(), email.trim().toLowerCase(), phone || null, dob, gender, address || null, parseInt(dept_id, 10), parseInt(admission_year, 10)]
        );

        const newId = result.insertId;
        const [created] = await pool.query(
            'SELECT s.*, d.dept_name FROM students s JOIN departments d ON s.dept_id = d.dept_id WHERE s.student_id = ?',
            [newId]
        );

        return res.status(201).json({
            success: true,
            message: 'Student registered successfully.',
            data: created[0]
        });

    } catch (err) {
        console.error('[Student Create Error]', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to create student.',
            error: err.message
        });
    }
});

// PUT /api/students/:id - Update student details
router.put('/:id', async (req, res) => {
    try {
        const studentId = parseInt(req.params.id, 10);
        const { name, email, phone, dob, gender, address, dept_id, admission_year } = req.body;

        if (isNaN(studentId)) {
            return res.status(400).json({ success: false, message: 'Invalid student ID.' });
        }

        // Check existence
        const [existing] = await pool.query('SELECT student_id FROM students WHERE student_id = ?', [studentId]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Student not found.' });
        }

        // Check email collision
        if (email) {
            const [emailCheck] = await pool.query(
                'SELECT student_id FROM students WHERE email = ? AND student_id != ?',
                [email.trim().toLowerCase(), studentId]
            );
            if (emailCheck.length > 0) {
                return res.status(409).json({ success: false, message: 'Email address is already in use by another student.' });
            }
        }

        await pool.query(
            `UPDATE students 
             SET name = COALESCE(?, name),
                 email = COALESCE(?, email),
                 phone = COALESCE(?, phone),
                 dob = COALESCE(?, dob),
                 gender = COALESCE(?, gender),
                 address = COALESCE(?, address),
                 dept_id = COALESCE(?, dept_id),
                 admission_year = COALESCE(?, admission_year)
             WHERE student_id = ?`,
            [
                name ? name.trim() : null,
                email ? email.trim().toLowerCase() : null,
                phone !== undefined ? phone : null,
                dob || null,
                gender || null,
                address !== undefined ? address : null,
                dept_id ? parseInt(dept_id, 10) : null,
                admission_year ? parseInt(admission_year, 10) : null,
                studentId
            ]
        );

        const [updated] = await pool.query(
            'SELECT s.*, d.dept_name FROM students s JOIN departments d ON s.dept_id = d.dept_id WHERE s.student_id = ?',
            [studentId]
        );

        return res.json({
            success: true,
            message: 'Student updated successfully.',
            data: updated[0]
        });

    } catch (err) {
        console.error('[Student Update Error]', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to update student.',
            error: err.message
        });
    }
});

// DELETE /api/students/:id - Delete student
router.delete('/:id', async (req, res) => {
    try {
        const studentId = parseInt(req.params.id, 10);
        if (isNaN(studentId)) {
            return res.status(400).json({ success: false, message: 'Invalid student ID.' });
        }

        const [existing] = await pool.query('SELECT student_id, name FROM students WHERE student_id = ?', [studentId]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Student not found.' });
        }

        // Deleting student cascades enrollments and attendance as per foreign key definition
        await pool.query('DELETE FROM students WHERE student_id = ?', [studentId]);

        return res.json({
            success: true,
            message: `Student "${existing[0].name}" (ID: ${studentId}) and associated academic records deleted successfully.`
        });

    } catch (err) {
        console.error('[Student Delete Error]', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to delete student.',
            error: err.message
        });
    }
});

module.exports = router;

