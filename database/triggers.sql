-- =============================================================================
-- STUDENT MANAGEMENT SYSTEM (DBMS PROJECT)
-- File: database/triggers.sql
-- Description: Automated Business Logic Enforced via Database Triggers
-- Feature: BEFORE INSERT and BEFORE UPDATE triggers on `marks` table to compute
--          `total` score and assign letter `grade` automatically.
--
-- Grade Scale:
--   O  (Outstanding) : Total >= 90
--   A+ (Excellent)   : Total >= 80
--   A  (Very Good)   : Total >= 70
--   B  (Good)        : Total >= 60
--   C  (Average)     : Total >= 50
--   P  (Pass)        : Total >= 40
--   F  (Fail)        : Total < 40
-- =============================================================================

USE `student_management_db`;

DROP TRIGGER IF EXISTS `trg_marks_before_insert`;
DROP TRIGGER IF EXISTS `trg_marks_before_update`;

DELIMITER $$

-- -----------------------------------------------------------------------------
-- Trigger 1: trg_marks_before_insert
-- Fires: Immediately before a new marks record is persisted.
-- Computes NEW.total and derives NEW.grade based on university evaluation schema.
-- -----------------------------------------------------------------------------
CREATE TRIGGER `trg_marks_before_insert`
BEFORE INSERT ON `marks`
FOR EACH ROW
BEGIN
    -- Calculate composite score from continuous internal and external exams
    SET NEW.total = ROUND(COALESCE(NEW.internal, 0) + COALESCE(NEW.external, 0), 2);

    -- Derive academic grade based on 7-tier grading scale
    IF NEW.total >= 90.00 THEN
        SET NEW.grade = 'O';
    ELSEIF NEW.total >= 80.00 THEN
        SET NEW.grade = 'A+';
    ELSEIF NEW.total >= 70.00 THEN
        SET NEW.grade = 'A';
    ELSEIF NEW.total >= 60.00 THEN
        SET NEW.grade = 'B';
    ELSEIF NEW.total >= 50.00 THEN
        SET NEW.grade = 'C';
    ELSEIF NEW.total >= 40.00 THEN
        SET NEW.grade = 'P';
    ELSE
        SET NEW.grade = 'F';
    END IF;
END$$

-- -----------------------------------------------------------------------------
-- Trigger 2: trg_marks_before_update
-- Fires: Whenever an existing marks record is modified.
-- Re-calculates NEW.total and synchronizes NEW.grade.
-- -----------------------------------------------------------------------------
CREATE TRIGGER `trg_marks_before_update`
BEFORE UPDATE ON `marks`
FOR EACH ROW
BEGIN
    SET NEW.total = ROUND(COALESCE(NEW.internal, 0) + COALESCE(NEW.external, 0), 2);

    IF NEW.total >= 90.00 THEN
        SET NEW.grade = 'O';
    ELSEIF NEW.total >= 80.00 THEN
        SET NEW.grade = 'A+';
    ELSEIF NEW.total >= 70.00 THEN
        SET NEW.grade = 'A';
    ELSEIF NEW.total >= 60.00 THEN
        SET NEW.grade = 'B';
    ELSEIF NEW.total >= 50.00 THEN
        SET NEW.grade = 'C';
    ELSEIF NEW.total >= 40.00 THEN
        SET NEW.grade = 'P';
    ELSE
        SET NEW.grade = 'F';
    END IF;
END$$

DELIMITER ;

