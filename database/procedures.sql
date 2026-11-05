-- =============================================================================
-- STUDENT MANAGEMENT SYSTEM (DBMS PROJECT)
-- File: database/procedures.sql
-- Description: Stored Procedures with Input Validation & ACID Transactions
-- Features:
--   1. enroll_student: Prevents duplicate enrollments, verifies foreign keys,
--      executes atomic insert into enrollments and marks within a transaction.
--   2. get_attendance_percentage: Aggregates lecture attendance statistics,
--      calculates attendance percentage, and flags examination eligibility.
-- =============================================================================

USE `student_management_db`;

DROP PROCEDURE IF EXISTS `enroll_student`;
DROP PROCEDURE IF EXISTS `get_attendance_percentage`;

DELIMITER $$

-- -----------------------------------------------------------------------------
-- Procedure 1: enroll_student
-- Purpose: Safely enroll a student into a course for a given semester.
-- ACID Properties: Executes with START TRANSACTION and ROLLBACK on SQLEXCEPTION.
-- Error Handling: Validates existence of student and course; prevents duplicate
--                 enrollment using custom business logic check + unique constraint.
-- -----------------------------------------------------------------------------
CREATE PROCEDURE `enroll_student`(
    IN p_student_id INT,
    IN p_course_id INT,
    IN p_semester INT
)
proc_label: BEGIN
    DECLARE v_student_exists INT DEFAULT 0;
    DECLARE v_course_exists INT DEFAULT 0;
    DECLARE v_already_enrolled INT DEFAULT 0;
    DECLARE v_new_enrollment_id INT DEFAULT 0;

    -- Exception handler to rollback on any SQL error
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    -- 1. Input Validation: Check semester range (1 - 8)
    IF p_semester < 1 OR p_semester > 8 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Validation Error: Semester must be between 1 and 8.';
    END IF;

    -- 2. Verify Student Existence
    SELECT COUNT(*) INTO v_student_exists
    FROM `students`
    WHERE `student_id` = p_student_id;

    IF v_student_exists = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Foreign Key Error: Student ID does not exist.';
    END IF;

    -- 3. Verify Course Existence
    SELECT COUNT(*) INTO v_course_exists
    FROM `courses`
    WHERE `course_id` = p_course_id;

    IF v_course_exists = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Foreign Key Error: Course ID does not exist.';
    END IF;

    -- 4. Check for Duplicate Enrollment (Idempotency / Business Rule)
    SELECT COUNT(*) INTO v_already_enrolled
    FROM `enrollments`
    WHERE `student_id` = p_student_id
      AND `course_id` = p_course_id
      AND `semester` = p_semester;

    IF v_already_enrolled > 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Conflict Error: Student is already enrolled in this course for the specified semester.';
    END IF;

    -- 5. ACID Transactional Insertion
    START TRANSACTION;

        INSERT INTO `enrollments` (`student_id`, `course_id`, `semester`, `enrollment_date`)
        VALUES (p_student_id, p_course_id, p_semester, CURRENT_DATE);

        SET v_new_enrollment_id = LAST_INSERT_ID();

        -- Initialize corresponding marks record (triggers will calculate initial 0 and 'F')
        INSERT INTO `marks` (`enrollment_id`, `internal`, `external`)
        VALUES (v_new_enrollment_id, 0.00, 0.00);

    COMMIT;

    -- Return the newly created enrollment record with descriptive details
    SELECT 
        e.enrollment_id,
        e.student_id,
        s.name AS student_name,
        e.course_id,
        c.course_name,
        c.credits,
        e.semester,
        e.enrollment_date,
        'Enrollment successful' AS message
    FROM `enrollments` e
    JOIN `students` s ON e.student_id = s.student_id
    JOIN `courses` c ON e.course_id = c.course_id
    WHERE e.enrollment_id = v_new_enrollment_id;

END proc_label$$

-- -----------------------------------------------------------------------------
-- Procedure 2: get_attendance_percentage
-- Purpose: Compute cumulative attendance metrics for a specific student in a course.
-- Returns: Total sessions held, attended count, absent count, percentage, and
--          eligibility status (>= 75% required for examination eligibility).
-- -----------------------------------------------------------------------------
CREATE PROCEDURE `get_attendance_percentage`(
    IN p_student_id INT,
    IN p_course_id INT
)
BEGIN
    DECLARE v_student_name VARCHAR(100);
    DECLARE v_course_name VARCHAR(120);
    DECLARE v_total_classes INT DEFAULT 0;
    DECLARE v_attended_classes INT DEFAULT 0;
    DECLARE v_absent_classes INT DEFAULT 0;
    DECLARE v_percentage DECIMAL(5,2) DEFAULT 0.00;
    DECLARE v_remark VARCHAR(30) DEFAULT 'No Classes Recorded';

    -- Fetch Student Name
    SELECT `name` INTO v_student_name
    FROM `students`
    WHERE `student_id` = p_student_id;

    -- Fetch Course Name
    SELECT `course_name` INTO v_course_name
    FROM `courses`
    WHERE `course_id` = p_course_id;

    -- Calculate Totals
    SELECT 
        COUNT(*),
        SUM(CASE WHEN `status` = 'Present' THEN 1 ELSE 0 END),
        SUM(CASE WHEN `status` = 'Absent' THEN 1 ELSE 0 END)
    INTO 
        v_total_classes,
        v_attended_classes,
        v_absent_classes
    FROM `attendance`
    WHERE `student_id` = p_student_id
      AND `course_id` = p_course_id;

    IF v_total_classes > 0 THEN
        SET v_percentage = ROUND((v_attended_classes / v_total_classes) * 100, 2);
        IF v_percentage >= 75.00 THEN
            SET v_remark = 'Eligible (>= 75%)';
        ELSE
            SET v_remark = 'Defaulter (< 75%)';
        END IF;
    END IF;

    -- Output row result set
    SELECT 
        p_student_id AS student_id,
        COALESCE(v_student_name, 'Unknown') AS student_name,
        p_course_id AS course_id,
        COALESCE(v_course_name, 'Unknown') AS course_name,
        v_total_classes AS total_classes,
        COALESCE(v_attended_classes, 0) AS attended_classes,
        COALESCE(v_absent_classes, 0) AS absent_classes,
        v_percentage AS attendance_percentage,
        v_remark AS status_remark;

END$$

DELIMITER ;

