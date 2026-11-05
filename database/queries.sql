-- =============================================================================
-- STUDENT MANAGEMENT SYSTEM (DBMS PROJECT)
-- File: database/queries.sql
-- Description: Advanced SQL Demonstration Queries for College DBMS Viva & Lab
-- Contains:
--   1. INNER JOIN and LEFT JOIN Demonstrations
--   2. Aggregate Queries with GROUP BY and HAVING Clause
--   3. Non-Correlated Subquery (Students Scoring Above Course Average)
--   4. Correlated Subquery (Students Beating Department/Course Means)
--   5. Top-N Toppers per Course
--   6. Attendance Defaulter List (< 75% Attendance)
--   7. Window Functions (RANK() / DENSE_RANK() Course-Wise Rankings)
--   8. Set Operations (UNION) and Existence Testing (EXISTS)
-- =============================================================================

USE `student_management_db`;

-- -----------------------------------------------------------------------------
-- QUERY 1: INNER JOIN
-- Concept: Relational Theta-Join / Equi-Join
-- Explanation: Returns matching records existing across both tables.
--              Here, it retrieves students along with their active course
--              enrollments and the assigned faculty member teaching that course.
-- -----------------------------------------------------------------------------
SELECT 
    s.student_id,
    s.name AS student_name,
    c.course_id,
    c.course_name,
    c.credits,
    f.name AS faculty_name,
    d.dept_name
FROM `students` s
INNER JOIN `enrollments` e ON s.student_id = e.student_id
INNER JOIN `courses` c ON e.course_id = c.course_id
INNER JOIN `faculty` f ON c.faculty_id = f.faculty_id
INNER JOIN `departments` d ON s.dept_id = d.dept_id
ORDER BY s.student_id, c.course_id;

-- -----------------------------------------------------------------------------
-- QUERY 2: LEFT OUTER JOIN
-- Concept: Outer Equi-Join (Preservation of Non-Matching Rows)
-- Explanation: Ensures all records from the left relation ('departments') are
--              retained even if no corresponding tuples exist in the right
--              relation ('students'). Unmatched right columns evaluate to NULL.
-- -----------------------------------------------------------------------------
SELECT 
    d.dept_id,
    d.dept_name,
    d.hod,
    s.student_id,
    s.name AS student_name,
    s.admission_year
FROM `departments` d
LEFT OUTER JOIN `students` s ON d.dept_id = s.dept_id
ORDER BY d.dept_id, s.name;

-- -----------------------------------------------------------------------------
-- QUERY 3: GROUP BY + HAVING Clause
-- Concept: Relation Grouping & Group-Level Filtering
-- Explanation: WHERE filters individual tuples BEFORE grouping; HAVING filters
--              aggregated groups AFTER group reduction.
-- Objective: Find departments that have more than 2 enrolled students AND
--            maintain an average student total score strictly above 70.00.
-- -----------------------------------------------------------------------------
SELECT 
    d.dept_id,
    d.dept_name,
    COUNT(DISTINCT s.student_id) AS total_enrolled_students,
    ROUND(AVG(m.total), 2) AS dept_average_score
FROM `departments` d
JOIN `students` s ON d.dept_id = s.dept_id
JOIN `enrollments` e ON s.student_id = e.student_id
JOIN `marks` m ON e.enrollment_id = m.enrollment_id
GROUP BY d.dept_id, d.dept_name
HAVING COUNT(DISTINCT s.student_id) >= 2 
   AND AVG(m.total) >= 70.00
ORDER BY dept_average_score DESC;

-- -----------------------------------------------------------------------------
-- QUERY 4: Non-Correlated Subquery (Scalar Subquery)
-- Concept: Independent Nested Query Evaluation
-- Explanation: The inner subquery evaluates once to compute the benchmark score
--              (average total marks in 'Database Management Systems'), and passes
--              that single scalar value to the outer query's WHERE filter.
-- Objective: Identify all students who scored strictly above the class average
--            in Course 1 (Database Management Systems).
-- -----------------------------------------------------------------------------
SELECT 
    s.student_id,
    s.name AS student_name,
    c.course_name,
    m.internal,
    m.external,
    m.total,
    m.grade
FROM `students` s
JOIN `enrollments` e ON s.student_id = e.student_id
JOIN `courses` c ON e.course_id = c.course_id
JOIN `marks` m ON e.enrollment_id = m.enrollment_id
WHERE e.course_id = 1
  AND m.total > (
      -- Scalar subquery computing course mean
      SELECT AVG(m_sub.total)
      FROM `marks` m_sub
      JOIN `enrollments` e_sub ON m_sub.enrollment_id = e_sub.enrollment_id
      WHERE e_sub.course_id = 1
  )
ORDER BY m.total DESC;

-- -----------------------------------------------------------------------------
-- QUERY 5: Correlated Subquery
-- Concept: Context-Dependent Subquery Execution
-- Explanation: The inner subquery references attributes (e_outer.course_id) from
--              the outer query. The database engine re-evaluates the inner
--              subquery for each row considered by the outer query.
-- Objective: List students who scored strictly higher than the average score
--            of whichever course they are enrolled in.
-- -----------------------------------------------------------------------------
SELECT 
    s.student_id,
    s.name AS student_name,
    c.course_name,
    m.total,
    m.grade,
    (
        SELECT ROUND(AVG(m_inner.total), 2)
        FROM `marks` m_inner
        JOIN `enrollments` e_inner ON m_inner.enrollment_id = e_inner.enrollment_id
        WHERE e_inner.course_id = e_outer.course_id
    ) AS course_average
FROM `students` s
JOIN `enrollments` e_outer ON s.student_id = e_outer.student_id
JOIN `courses` c ON e_outer.course_id = c.course_id
JOIN `marks` m ON e_outer.enrollment_id = m.enrollment_id
WHERE m.total > (
    -- Correlated subquery computing the specific course's mean
    SELECT AVG(m_inner.total)
    FROM `marks` m_inner
    JOIN `enrollments` e_inner ON m_inner.enrollment_id = e_inner.enrollment_id
    WHERE e_inner.course_id = e_outer.course_id
)
ORDER BY c.course_name, m.total DESC;

-- -----------------------------------------------------------------------------
-- QUERY 6: Attendance Defaulters List (< 75% Attendance Threshold)
-- Concept: Conditional Aggregation & Ratio Calculation
-- Explanation: Aggregates attendance logs, counts total lectures conducted,
--              calculates percentage using conditional SUM, and isolates students
--              below the statutory 75% threshold mandated for university exams.
-- -----------------------------------------------------------------------------
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
    'DEFAULTER - Detention Notice' AS academic_status
FROM `students` s
JOIN `departments` d ON s.dept_id = d.dept_id
JOIN `attendance` a ON s.student_id = a.student_id
JOIN `courses` c ON a.course_id = c.course_id
GROUP BY s.student_id, s.name, s.email, d.dept_name, c.course_id, c.course_name
HAVING attendance_percentage < 75.00
ORDER BY attendance_percentage ASC;

-- -----------------------------------------------------------------------------
-- QUERY 7: Window Function (RANK() and DENSE_RANK() for Course-Wise Rankings)
-- Concept: Analytical Window Functions with PARTITION BY and ORDER BY
-- Explanation: Evaluates row ranks over a window partition without collapsing rows
--              into a single group. RANK() leaves gaps after ties; DENSE_RANK()
--              assigns consecutive ranks.
-- Objective: Rank every student within their respective enrolled courses.
-- -----------------------------------------------------------------------------
SELECT 
    c.course_name,
    s.student_id,
    s.name AS student_name,
    m.total AS final_score,
    m.grade,
    RANK() OVER (
        PARTITION BY c.course_id 
        ORDER BY m.total DESC
    ) AS course_rank,
    DENSE_RANK() OVER (
        PARTITION BY c.course_id 
        ORDER BY m.total DESC
    ) AS dense_course_rank
FROM `courses` c
JOIN `enrollments` e ON c.course_id = e.course_id
JOIN `students` s ON e.student_id = s.student_id
JOIN `marks` m ON e.enrollment_id = m.enrollment_id
ORDER BY c.course_id, course_rank;

-- -----------------------------------------------------------------------------
-- QUERY 8: Top-N Toppers per Course (Common Table Expression / CTE + Window Filter)
-- Concept: CTE (WITH clause) combined with Window Function Filtering
-- Explanation: Standard WHERE clauses cannot filter directly on window functions
--              because window functions execute during the projection phase.
--              A CTE materializes the ranks so the outer query can filter Top-N (N=2).
-- -----------------------------------------------------------------------------
WITH CourseRankings AS (
    SELECT 
        c.course_id,
        c.course_name,
        s.student_id,
        s.name AS student_name,
        m.total AS score,
        m.grade,
        DENSE_RANK() OVER (
            PARTITION BY c.course_id 
            ORDER BY m.total DESC
        ) AS rank_position
    FROM `courses` c
    JOIN `enrollments` e ON c.course_id = e.course_id
    JOIN `students` s ON e.student_id = s.student_id
    JOIN `marks` m ON e.enrollment_id = m.enrollment_id
)
SELECT 
    course_name,
    rank_position,
    student_name,
    score,
    grade
FROM CourseRankings
WHERE rank_position <= 2
ORDER BY course_id, rank_position;

-- -----------------------------------------------------------------------------
-- QUERY 9: Subquery with EXISTS Operator (Semi-Join)
-- Concept: Existential Quantification & Query Optimization
-- Explanation: The EXISTS condition halts evaluation as soon as the first
--              matching record is found (short-circuit evaluation).
-- Objective: Find all faculty members who are actively assigned to at least
--            one course with current student enrollments.
-- -----------------------------------------------------------------------------
SELECT 
    f.faculty_id,
    f.name AS faculty_name,
    f.email,
    d.dept_name
FROM `faculty` f
JOIN `departments` d ON f.dept_id = d.dept_id
WHERE EXISTS (
    SELECT 1 
    FROM `courses` c
    JOIN `enrollments` e ON c.course_id = e.course_id
    WHERE c.faculty_id = f.faculty_id
)
ORDER BY f.faculty_id;

