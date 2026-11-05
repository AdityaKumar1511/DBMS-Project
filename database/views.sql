-- =============================================================================
-- STUDENT MANAGEMENT SYSTEM (DBMS PROJECT)
-- File: database/views.sql
-- Description: Relational SQL Views for Simplified Querying & Data Abstraction
-- Features:
--   1. student_report_card: Comprehensive academic report view combining
--      students, departments, enrollments, courses, and marks.
--   2. department_summary: Aggregated statistical view showing student counts,
--      course counts, faculty counts, and average marks per department.
-- =============================================================================

USE `student_management_db`;

DROP VIEW IF EXISTS `student_report_card`;
DROP VIEW IF EXISTS `department_summary`;

-- -----------------------------------------------------------------------------
-- View 1: student_report_card
-- Purpose: Denormalizes student information with course enrollments, credits,
--          scores, and calculated grades for transcripts and report card generation.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW `student_report_card` AS
SELECT 
    s.student_id,
    s.name AS student_name,
    s.email AS student_email,
    s.phone AS student_phone,
    d.dept_id,
    d.dept_name,
    s.admission_year,
    e.enrollment_id,
    e.semester,
    e.enrollment_date,
    c.course_id,
    c.course_name,
    c.credits,
    f.name AS instructor_name,
    COALESCE(m.internal, 0.00) AS internal_marks,
    COALESCE(m.external, 0.00) AS external_marks,
    COALESCE(m.total, 0.00) AS total_marks,
    COALESCE(m.grade, 'N/A') AS grade
FROM `students` s
JOIN `departments` d ON s.dept_id = d.dept_id
JOIN `enrollments` e ON s.student_id = e.student_id
JOIN `courses` c ON e.course_id = c.course_id
LEFT JOIN `faculty` f ON c.faculty_id = f.faculty_id
LEFT JOIN `marks` m ON e.enrollment_id = m.enrollment_id;

-- -----------------------------------------------------------------------------
-- View 2: department_summary
-- Purpose: Department-level analytics aggregating enrollment numbers, course
--          catalog size, faculty strength, and mean student academic performance.
-- Design Note: Subquery joins eliminate Cartesian product distortion on aggregations.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW `department_summary` AS
SELECT 
    d.dept_id,
    d.dept_name,
    d.hod,
    COALESCE(stu.total_students, 0) AS total_students,
    COALESCE(crs.total_courses, 0) AS total_courses,
    COALESCE(fac.total_faculty, 0) AS total_faculty,
    COALESCE(perf.average_marks, 0.00) AS average_marks
FROM `departments` d
LEFT JOIN (
    SELECT dept_id, COUNT(*) AS total_students
    FROM `students`
    GROUP BY dept_id
) stu ON d.dept_id = stu.dept_id
LEFT JOIN (
    SELECT dept_id, COUNT(*) AS total_courses
    FROM `courses`
    GROUP BY dept_id
) crs ON d.dept_id = crs.dept_id
LEFT JOIN (
    SELECT dept_id, COUNT(*) AS total_faculty
    FROM `faculty`
    GROUP BY dept_id
) fac ON d.dept_id = fac.dept_id
LEFT JOIN (
    SELECT s.dept_id, ROUND(AVG(m.total), 2) AS average_marks
    FROM `students` s
    JOIN `enrollments` e ON s.student_id = e.student_id
    JOIN `marks` m ON e.enrollment_id = m.enrollment_id
    GROUP BY s.dept_id
) perf ON d.dept_id = perf.dept_id;

