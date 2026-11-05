-- =============================================================================
-- STUDENT MANAGEMENT SYSTEM (DBMS PROJECT)
-- File: database/schema.sql
-- Description: Database schema creation, tables, constraints, foreign keys & indexes
-- Designed in Third Normal Form (3NF)
-- =============================================================================

CREATE DATABASE IF NOT EXISTS `student_management_db`
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE `student_management_db`;

-- Drop existing tables in reverse dependency order
DROP TABLE IF EXISTS `attendance`;
DROP TABLE IF EXISTS `marks`;
DROP TABLE IF EXISTS `enrollments`;
DROP TABLE IF EXISTS `courses`;
DROP TABLE IF EXISTS `faculty`;
DROP TABLE IF EXISTS `students`;
DROP TABLE IF EXISTS `departments`;
DROP TABLE IF EXISTS `users`;

-- -----------------------------------------------------------------------------
-- 1. Table: departments
-- Entity: Academic Departments
-- Normalization: 3NF (dept_name is unique candidate key, hod depends directly on dept_id)
-- -----------------------------------------------------------------------------
CREATE TABLE `departments` (
    `dept_id` INT AUTO_INCREMENT PRIMARY KEY,
    `dept_name` VARCHAR(100) NOT NULL UNIQUE,
    `hod` VARCHAR(100) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 2. Table: students
-- Entity: Enrolled College Students
-- Normalization: 3NF (dept_id is FK referencing departments, no transitive dependencies)
-- -----------------------------------------------------------------------------
CREATE TABLE `students` (
    `student_id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(120) NOT NULL UNIQUE,
    `phone` VARCHAR(20) DEFAULT NULL,
    `dob` DATE NOT NULL,
    `gender` ENUM('Male', 'Female', 'Other') NOT NULL,
    `address` TEXT DEFAULT NULL,
    `dept_id` INT NOT NULL,
    `admission_year` INT NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_students_department`
        FOREIGN KEY (`dept_id`) REFERENCES `departments` (`dept_id`)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Indexes for students search & filtering performance
CREATE INDEX `idx_students_dept` ON `students` (`dept_id`);
CREATE INDEX `idx_students_name` ON `students` (`name`);
CREATE INDEX `idx_students_admission_year` ON `students` (`admission_year`);

-- -----------------------------------------------------------------------------
-- 3. Table: faculty
-- Entity: Teaching Staff / Professors
-- Normalization: 3NF (dept_id references department)
-- -----------------------------------------------------------------------------
CREATE TABLE `faculty` (
    `faculty_id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(120) NOT NULL UNIQUE,
    `dept_id` INT NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_faculty_department`
        FOREIGN KEY (`dept_id`) REFERENCES `departments` (`dept_id`)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE INDEX `idx_faculty_dept` ON `faculty` (`dept_id`);

-- -----------------------------------------------------------------------------
-- 4. Table: courses
-- Entity: Curriculum Courses offered by Departments
-- Normalization: 3NF (credits check 1-6, faculty assigned optionally or mandatory)
-- -----------------------------------------------------------------------------
CREATE TABLE `courses` (
    `course_id` INT AUTO_INCREMENT PRIMARY KEY,
    `course_name` VARCHAR(120) NOT NULL,
    `credits` INT NOT NULL CHECK (`credits` BETWEEN 1 AND 6),
    `dept_id` INT NOT NULL,
    `faculty_id` INT DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_courses_department`
        FOREIGN KEY (`dept_id`) REFERENCES `departments` (`dept_id`)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT `fk_courses_faculty`
        FOREIGN KEY (`faculty_id`) REFERENCES `faculty` (`faculty_id`)
        ON UPDATE CASCADE
        ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE INDEX `idx_courses_dept` ON `courses` (`dept_id`);
CREATE INDEX `idx_courses_faculty` ON `courses` (`faculty_id`);

-- -----------------------------------------------------------------------------
-- 5. Table: enrollments
-- Entity: Student course registration per semester
-- Normalization: 3NF (Composite candidate key student_id + course_id + semester)
-- -----------------------------------------------------------------------------
CREATE TABLE `enrollments` (
    `enrollment_id` INT AUTO_INCREMENT PRIMARY KEY,
    `student_id` INT NOT NULL,
    `course_id` INT NOT NULL,
    `semester` INT NOT NULL CHECK (`semester` BETWEEN 1 AND 8),
    `enrollment_date` DATE DEFAULT (CURRENT_DATE),
    CONSTRAINT `uq_student_course_semester`
        UNIQUE (`student_id`, `course_id`, `semester`),
    CONSTRAINT `fk_enrollments_student`
        FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT `fk_enrollments_course`
        FOREIGN KEY (`course_id`) REFERENCES `courses` (`course_id`)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE INDEX `idx_enrollments_student` ON `enrollments` (`student_id`);
CREATE INDEX `idx_enrollments_course` ON `enrollments` (`course_id`);
CREATE INDEX `idx_enrollments_semester` ON `enrollments` (`semester`);

-- -----------------------------------------------------------------------------
-- 6. Table: marks
-- Entity: Academic Performance / Scores per Enrollment
-- Normalization: 3NF (PK is enrollment_id, internal max 40, external max 60)
-- Note: total and grade are maintained by database triggers
-- -----------------------------------------------------------------------------
CREATE TABLE `marks` (
    `enrollment_id` INT PRIMARY KEY,
    `internal` DECIMAL(5,2) NOT NULL DEFAULT 0.00 CHECK (`internal` BETWEEN 0 AND 40),
    `external` DECIMAL(5,2) NOT NULL DEFAULT 0.00 CHECK (`external` BETWEEN 0 AND 60),
    `total` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    `grade` VARCHAR(5) NOT NULL DEFAULT 'F',
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_marks_enrollment`
        FOREIGN KEY (`enrollment_id`) REFERENCES `enrollments` (`enrollment_id`)
        ON UPDATE CASCADE
        ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX `idx_marks_grade` ON `marks` (`grade`);

-- -----------------------------------------------------------------------------
-- 7. Table: attendance
-- Entity: Daily Student Course Attendance Log
-- Normalization: 3NF (UNIQUE per student, course, date)
-- -----------------------------------------------------------------------------
CREATE TABLE `attendance` (
    `attendance_id` INT AUTO_INCREMENT PRIMARY KEY,
    `student_id` INT NOT NULL,
    `course_id` INT NOT NULL,
    `date` DATE NOT NULL,
    `status` ENUM('Present', 'Absent') NOT NULL DEFAULT 'Present',
    CONSTRAINT `uq_student_course_date`
        UNIQUE (`student_id`, `course_id`, `date`),
    CONSTRAINT `fk_attendance_student`
        FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT `fk_attendance_course`
        FOREIGN KEY (`course_id`) REFERENCES `courses` (`course_id`)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE INDEX `idx_attendance_student_course` ON `attendance` (`student_id`, `course_id`);
CREATE INDEX `idx_attendance_date` ON `attendance` (`date`);

-- -----------------------------------------------------------------------------
-- 8. Table: users
-- Entity: System Authentication & RBAC
-- Normalization: 3NF
-- -----------------------------------------------------------------------------
CREATE TABLE `users` (
    `user_id` INT AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(50) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `role` ENUM('admin', 'faculty') NOT NULL DEFAULT 'admin',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

