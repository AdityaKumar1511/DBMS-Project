// =============================================================================
// STUDENT MANAGEMENT SYSTEM
// File: server/routes/reports.js
// Description: Report Generation Endpoints Powered by Relational Views
// =============================================================================

const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// GET /api/reports/report-card/:student_id
// Reads directly from the SQL View `student_report_card`
router.get('/report-card/:student_id', async (req, res) => {
    try {
        const studentId = parseInt(req.params.student_id, 10);
        if (isNaN(studentId)) {
            return res.status(400).json({ success: false, message: 'Invalid student ID parameter.' });
        }

        // Query SQL View
        const [rows] = await pool.query(
            'SELECT * FROM student_report_card WHERE student_id = ? ORDER BY semester ASC, course_name ASC',
            [studentId]
        );

        if (rows.length === 0) {
            // Check if student exists but has no enrollments yet
            const [studentCheck] = await pool.query(
                'SELECT s.*, d.dept_name FROM students s JOIN departments d ON s.dept_id = d.dept_id WHERE s.student_id = ?',
                [studentId]
            );
            if (studentCheck.length === 0) {
                return res.status(404).json({ success: false, message: 'Student record does not exist.' });
            }
            return res.json({
                success: true,
                data: {
                    student: studentCheck[0],
                    courses: [],
                    summary: {
                        totalCredits: 0,
                        totalCourses: 0,
                        averageMarks: 0.00,
                        cgpa: 0.00,
                        passedCourses: 0,
                        status: 'No Enrollments'
                    }
                }
            });
        }

        const studentProfile = {
            student_id: rows[0].student_id,
            student_name: rows[0].student_name,
            student_email: rows[0].student_email,
            student_phone: rows[0].student_phone,
            dept_id: rows[0].dept_id,
            dept_name: rows[0].dept_name,
            admission_year: rows[0].admission_year
        };

        // Grade Point Mapping for GPA Calculation (10-point UGC scale)
        const gradePoints = {
            'O': 10.0,
            'A+': 9.0,
            'A': 8.0,
            'B': 7.0,
            'C': 6.0,
            'P': 5.0,
            'F': 0.0
        };

        let totalCredits = 0;
        let weightedScore = 0;
        let totalMarks = 0;
        let passedCourses = 0;

        const courses = rows.map(r => {
            const credits = r.credits || 0;
            const points = gradePoints[r.grade] !== undefined ? gradePoints[r.grade] : 0.0;
            totalCredits += credits;
            weightedScore += (credits * points);
            totalMarks += parseFloat(r.total_marks || 0);
            if (r.grade !== 'F' && r.grade !== 'N/A') {
                passedCourses++;
            }

            return {
                enrollment_id: r.enrollment_id,
                semester: r.semester,
                course_id: r.course_id,
                course_name: r.course_name,
                credits: r.credits,
                instructor_name: r.instructor_name || 'Staff',
                internal_marks: parseFloat(r.internal_marks),
                external_marks: parseFloat(r.external_marks),
                total_marks: parseFloat(r.total_marks),
                grade: r.grade,
                grade_point: points
            };
        });

        const cgpa = totalCredits > 0 ? (weightedScore / totalCredits).toFixed(2) : '0.00';
        const averageMarks = courses.length > 0 ? (totalMarks / courses.length).toFixed(2) : '0.00';

        return res.json({
            success: true,
            data: {
                student: studentProfile,
                courses,
                summary: {
                    totalCredits,
                    totalCourses: courses.length,
                    passedCourses,
                    failedCourses: courses.length - passedCourses,
                    averageMarks: parseFloat(averageMarks),
                    cgpa: parseFloat(cgpa),
                    standing: parseFloat(cgpa) >= 8.5 ? 'First Class with Distinction' :
                             parseFloat(cgpa) >= 6.5 ? 'First Class' :
                             parseFloat(cgpa) >= 5.0 ? 'Second Class' : 'Remedial / Warning'
                }
            }
        });

    } catch (err) {
        console.error('[Report Card View Error]', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to generate report card from database view.',
            error: err.message
        });
    }
});

module.exports = router;

