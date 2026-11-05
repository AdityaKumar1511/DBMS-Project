-- =============================================================================
-- STUDENT MANAGEMENT SYSTEM (DBMS PROJECT)
-- File: database/seed.sql
-- Description: Realistic Seed Dataset for College DBMS Course Demonstration
-- Includes:
--   - 5 Academic Departments
--   - 6 Distinguished Faculty Members
--   - 12 Curriculum Courses with credits 1-6
--   - 18 Diverse Students across departments and admission years
--   - 38 Semester Course Enrollments
--   - 38 Marks entries (Total and Grade auto-computed by DB Triggers)
--   - 100+ Attendance records (Normal attendees and Defaulters)
--   - 1 Default Admin User (username: admin, password: admin123)
-- =============================================================================

USE `student_management_db`;

-- Temporarily disable foreign key checks during clean re-seed
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE `attendance`;
TRUNCATE TABLE `marks`;
TRUNCATE TABLE `enrollments`;
TRUNCATE TABLE `courses`;
TRUNCATE TABLE `faculty`;
TRUNCATE TABLE `students`;
TRUNCATE TABLE `departments`;
TRUNCATE TABLE `users`;
SET FOREIGN_KEY_CHECKS = 1;

-- -----------------------------------------------------------------------------
-- 1. Seed Departments (5 Departments)
-- -----------------------------------------------------------------------------
INSERT INTO `departments` (`dept_id`, `dept_name`, `hod`) VALUES
(1, 'Computer Science & Engineering', 'Dr. Alan Turing'),
(2, 'Information Technology', 'Dr. Ada Lovelace'),
(3, 'Electronics & Communication', 'Dr. Claude Shannon'),
(4, 'Mechanical Engineering', 'Dr. Nikola Tesla'),
(5, 'Electrical & Electronics', 'Dr. Michael Faraday');

-- -----------------------------------------------------------------------------
-- 2. Seed Faculty (6 Faculty Members)
-- -----------------------------------------------------------------------------
INSERT INTO `faculty` (`faculty_id`, `name`, `email`, `dept_id`) VALUES
(1, 'Prof. John von Neumann', 'j.vonneumann@college.edu', 1),
(2, 'Prof. Grace Hopper', 'g.hopper@college.edu', 1),
(3, 'Prof. Tim Berners-Lee', 't.bernerslee@college.edu', 2),
(4, 'Prof. Heinrich Hertz', 'h.hertz@college.edu', 3),
(5, 'Prof. James Watt', 'j.watt@college.edu', 4),
(6, 'Prof. Thomas Edison', 't.edison@college.edu', 5);

-- -----------------------------------------------------------------------------
-- 3. Seed Courses (12 Courses across departments)
-- -----------------------------------------------------------------------------
INSERT INTO `courses` (`course_id`, `course_name`, `credits`, `dept_id`, `faculty_id`) VALUES
(1, 'Database Management Systems', 4, 1, 1),
(2, 'Data Structures & Algorithms', 4, 1, 2),
(3, 'Operating Systems', 4, 1, 1),
(4, 'Web Technologies & Architecture', 3, 2, 3),
(5, 'Computer Networks', 3, 2, 3),
(6, 'Cloud Computing', 3, 2, 3),
(7, 'Digital Signal Processing', 4, 3, 4),
(8, 'VLSI Circuit Design', 3, 3, 4),
(9, 'Thermodynamics & Heat Transfer', 4, 4, 5),
(10, 'Fluid Mechanics', 3, 4, 5),
(11, 'Power Systems Engineering', 4, 5, 6),
(12, 'Control Systems Theory', 3, 5, 6);

-- -----------------------------------------------------------------------------
-- 4. Seed Students (18 Students)
-- -----------------------------------------------------------------------------
INSERT INTO `students` (`student_id`, `name`, `email`, `phone`, `dob`, `gender`, `address`, `dept_id`, `admission_year`) VALUES
(1, 'Aarav Sharma', 'aarav.sharma@student.edu', '+91 9876543210', '2004-03-15', 'Male', '42 MG Road, Bengaluru, KA', 1, 2022),
(2, 'Ananya Iyer', 'ananya.iyer@student.edu', '+91 9876543211', '2004-07-22', 'Female', '12 Anna Salai, Chennai, TN', 1, 2022),
(3, 'Rohan Verma', 'rohan.verma@student.edu', '+91 9876543212', '2003-11-05', 'Male', '88 Park Street, Kolkata, WB', 1, 2022),
(4, 'Sneha Patel', 'sneha.patel@student.edu', '+91 9876543213', '2004-01-30', 'Female', '104 SG Highway, Ahmedabad, GJ', 1, 2023),
(5, 'Vikram Malhotra', 'vikram.m@student.edu', '+91 9876543214', '2003-09-18', 'Male', '5 Connaught Place, New Delhi, DL', 2, 2022),
(6, 'Diya Kulkarni', 'diya.k@student.edu', '+91 9876543215', '2004-05-12', 'Female', '23 FC Road, Pune, MH', 2, 2022),
(7, 'Arjun Reddy', 'arjun.reddy@student.edu', '+91 9876543216', '2004-08-25', 'Male', '77 Jubilee Hills, Hyderabad, TS', 2, 2023),
(8, 'Meera Nambiar', 'meera.n@student.edu', '+91 9876543217', '2004-12-04', 'Female', '19 Marine Drive, Kochi, KL', 3, 2022),
(9, 'Kabir Mehta', 'kabir.mehta@student.edu', '+91 9876543218', '2003-04-19', 'Male', '14 Bandra West, Mumbai, MH', 3, 2022),
(10, 'Ishita Roy', 'ishita.roy@student.edu', '+91 9876543219', '2004-06-14', 'Female', '31 Salt Lake, Kolkata, WB', 3, 2023),
(11, 'Devendra Singh', 'devendra.s@student.edu', '+91 9876543220', '2003-02-28', 'Male', '62 Civil Lines, Jaipur, RJ', 4, 2022),
(12, 'Pooja Hegde', 'pooja.hegde@student.edu', '+91 9876543221', '2004-10-10', 'Female', '9 Residency Road, Bengaluru, KA', 4, 2022),
(13, 'Siddharth Nair', 'siddharth.n@student.edu', '+91 9876543222', '2004-04-02', 'Male', '51 Kowdiar, Thiruvananthapuram, KL', 4, 2023),
(14, 'Kavya Pillai', 'kavya.pillai@student.edu', '+91 9876543223', '2003-08-14', 'Female', '18 Gandhi Nagar, Vellore, TN', 5, 2022),
(15, 'Aditya Joshi', 'aditya.joshi@student.edu', '+91 9876543224', '2004-02-17', 'Male', '34 Deccan Gymkhana, Pune, MH', 5, 2022),
(16, 'Riya Sen', 'riya.sen@student.edu', '+91 9876543225', '2005-01-11', 'Female', '7 Alipore Road, Kolkata, WB', 1, 2024),
(17, 'Manish Gupta', 'manish.g@student.edu', '+91 9876543226', '2003-12-21', 'Male', '45 Gomti Nagar, Lucknow, UP', 2, 2022),
(18, 'Tanvi Deshmukh', 'tanvi.d@student.edu', '+91 9876543227', '2004-09-09', 'Female', '8 Shivaji Nagar, Nagpur, MH', 3, 2023);

-- -----------------------------------------------------------------------------
-- 5. Seed Enrollments (38 Enrollments)
-- -----------------------------------------------------------------------------
INSERT INTO `enrollments` (`enrollment_id`, `student_id`, `course_id`, `semester`, `enrollment_date`) VALUES
-- CSE Batch (Semester 4)
(1, 1, 1, 4, '2024-01-10'),
(2, 1, 2, 4, '2024-01-10'),
(3, 1, 3, 4, '2024-01-10'),
(4, 2, 1, 4, '2024-01-10'),
(5, 2, 2, 4, '2024-01-10'),
(6, 2, 3, 4, '2024-01-10'),
(7, 3, 1, 4, '2024-01-11'),
(8, 3, 2, 4, '2024-01-11'),
(9, 3, 3, 4, '2024-01-11'),
-- CSE Batch (Semester 2)
(10, 4, 1, 2, '2024-01-12'),
(11, 4, 2, 2, '2024-01-12'),
-- IT Batch (Semester 4)
(12, 5, 4, 4, '2024-01-10'),
(13, 5, 5, 4, '2024-01-10'),
(14, 5, 6, 4, '2024-01-10'),
(15, 6, 4, 4, '2024-01-10'),
(16, 6, 5, 4, '2024-01-10'),
(17, 6, 6, 4, '2024-01-10'),
(18, 17, 4, 4, '2024-01-11'),
(19, 17, 5, 4, '2024-01-11'),
-- IT Batch (Semester 2)
(20, 7, 4, 2, '2024-01-12'),
-- ECE Batch (Semester 4)
(21, 8, 7, 4, '2024-01-10'),
(22, 8, 8, 4, '2024-01-10'),
(23, 9, 7, 4, '2024-01-10'),
(24, 9, 8, 4, '2024-01-10'),
-- ECE Batch (Semester 2)
(25, 10, 7, 2, '2024-01-11'),
(26, 18, 8, 2, '2024-01-11'),
-- MECH Batch (Semester 4)
(27, 11, 9, 4, '2024-01-10'),
(28, 11, 10, 4, '2024-01-10'),
(29, 12, 9, 4, '2024-01-10'),
(30, 12, 10, 4, '2024-01-10'),
-- MECH Batch (Semester 2)
(31, 13, 9, 2, '2024-01-11'),
-- EEE Batch (Semester 4)
(32, 14, 11, 4, '2024-01-10'),
(33, 14, 12, 4, '2024-01-10'),
(34, 15, 11, 4, '2024-01-10'),
(35, 15, 12, 4, '2024-01-10'),
-- Interdisciplinary / Elective Enrollments
(36, 1, 4, 4, '2024-01-15'),
(37, 5, 1, 4, '2024-01-15'),
(38, 16, 2, 1, '2024-08-01');

-- -----------------------------------------------------------------------------
-- 6. Seed Marks
-- Note: Trigger auto-calculates total and sets grade!
-- Range: internal (0-40), external (0-60)
-- -----------------------------------------------------------------------------
INSERT INTO `marks` (`enrollment_id`, `internal`, `external`) VALUES
(1, 38.00, 56.50),  -- Aarav DBMS: 94.50 -> O
(2, 35.00, 52.00),  -- Aarav DSA: 87.00 -> A+
(3, 32.50, 45.00),  -- Aarav OS: 77.50 -> A
(4, 39.50, 58.00),  -- Ananya DBMS: 97.50 -> O
(5, 38.00, 55.00),  -- Ananya DSA: 93.00 -> O
(6, 36.00, 51.50),  -- Ananya OS: 87.50 -> A+
(7, 24.00, 31.00),  -- Rohan DBMS: 55.00 -> C
(8, 28.00, 38.50),  -- Rohan DSA: 66.50 -> B
(9, 18.00, 20.00),  -- Rohan OS: 38.00 -> F
(10, 34.00, 49.00), -- Sneha DBMS: 83.00 -> A+
(11, 31.00, 42.00), -- Sneha DSA: 73.00 -> A
(12, 37.00, 54.00), -- Vikram Web: 91.00 -> O
(13, 33.00, 48.00), -- Vikram CN: 81.00 -> A+
(14, 36.00, 52.00), -- Vikram Cloud: 88.00 -> A+
(15, 29.00, 41.00), -- Diya Web: 70.00 -> A
(16, 27.50, 37.00), -- Diya CN: 64.50 -> B
(17, 30.00, 44.00), -- Diya Cloud: 74.00 -> A
(18, 22.00, 33.00), -- Manish Web: 55.00 -> C
(19, 20.00, 25.00), -- Manish CN: 45.00 -> P
(20, 32.00, 46.00), -- Arjun Web: 78.00 -> A
(21, 36.50, 55.00), -- Meera DSP: 91.50 -> O
(22, 34.00, 50.00), -- Meera VLSI: 84.00 -> A+
(23, 26.00, 38.00), -- Kabir DSP: 64.00 -> B
(24, 25.00, 32.00), -- Kabir VLSI: 57.00 -> C
(25, 30.00, 43.00), -- Ishita DSP: 73.00 -> A
(26, 33.00, 48.00), -- Tanvi VLSI: 81.00 -> A+
(27, 35.00, 53.00), -- Devendra Thermo: 88.00 -> A+
(28, 32.00, 46.50), -- Devendra Fluid: 78.50 -> A
(29, 28.00, 36.00), -- Pooja Thermo: 64.00 -> B
(30, 29.50, 39.00), -- Pooja Fluid: 68.50 -> B
(31, 31.00, 45.00), -- Siddharth Thermo: 76.00 -> A
(32, 37.00, 56.00), -- Kavya Power: 93.00 -> O
(33, 35.50, 52.50), -- Kavya Control: 88.00 -> A+
(34, 25.00, 34.00), -- Aditya Power: 59.00 -> C
(35, 23.00, 30.00), -- Aditya Control: 53.00 -> C
(36, 35.00, 51.00), -- Aarav Web (Elective): 86.00 -> A+
(37, 34.00, 49.00), -- Vikram DBMS (Elective): 83.00 -> A+
(38, 30.00, 42.00); -- Riya DSA: 72.00 -> A

-- -----------------------------------------------------------------------------
-- 7. Seed Attendance Records (Course Sessions)
-- -----------------------------------------------------------------------------
-- Course 1 (DBMS) - Lectures across Feb-Mar 2024
-- Aarav (Student 1), Ananya (Student 2), Rohan (Student 3), Sneha (Student 4), Vikram (Student 5)
INSERT INTO `attendance` (`student_id`, `course_id`, `date`, `status`) VALUES
(1, 1, '2024-02-01', 'Present'),
(1, 1, '2024-02-05', 'Present'),
(1, 1, '2024-02-08', 'Present'),
(1, 1, '2024-02-12', 'Present'),
(1, 1, '2024-02-15', 'Present'),
(1, 1, '2024-02-19', 'Present'),
(1, 1, '2024-02-22', 'Present'),
(1, 1, '2024-02-26', 'Present'),
(1, 1, '2024-03-01', 'Present'),
(1, 1, '2024-03-05', 'Present'), -- Aarav: 10/10 (100%)

(2, 1, '2024-02-01', 'Present'),
(2, 1, '2024-02-05', 'Present'),
(2, 1, '2024-02-08', 'Present'),
(2, 1, '2024-02-12', 'Present'),
(2, 1, '2024-02-15', 'Present'),
(2, 1, '2024-02-19', 'Present'),
(2, 1, '2024-02-22', 'Present'),
(2, 1, '2024-02-26', 'Present'),
(2, 1, '2024-03-01', 'Present'),
(2, 1, '2024-03-05', 'Absent'),  -- Ananya: 9/10 (90%)

-- Rohan Verma: Chronic defaulter demonstration (<75%)
(3, 1, '2024-02-01', 'Present'),
(3, 1, '2024-02-05', 'Absent'),
(3, 1, '2024-02-08', 'Absent'),
(3, 1, '2024-02-12', 'Present'),
(3, 1, '2024-02-15', 'Absent'),
(3, 1, '2024-02-19', 'Absent'),
(3, 1, '2024-02-22', 'Present'),
(3, 1, '2024-02-26', 'Absent'),
(3, 1, '2024-03-01', 'Absent'),
(3, 1, '2024-03-05', 'Present'), -- Rohan: 4/10 (40% Defaulter)

(4, 1, '2024-02-01', 'Present'),
(4, 1, '2024-02-05', 'Present'),
(4, 1, '2024-02-08', 'Present'),
(4, 1, '2024-02-12', 'Present'),
(4, 1, '2024-02-15', 'Present'),
(4, 1, '2024-02-19', 'Present'),
(4, 1, '2024-02-22', 'Present'),
(4, 1, '2024-02-26', 'Present'),
(4, 1, '2024-03-01', 'Present'),
(4, 1, '2024-03-05', 'Present'), -- Sneha: 10/10 (100%)

(5, 1, '2024-02-01', 'Present'),
(5, 1, '2024-02-05', 'Present'),
(5, 1, '2024-02-08', 'Present'),
(5, 1, '2024-02-12', 'Present'),
(5, 1, '2024-02-15', 'Absent'),
(5, 1, '2024-02-19', 'Present'),
(5, 1, '2024-02-22', 'Present'),
(5, 1, '2024-02-26', 'Present'),
(5, 1, '2024-03-01', 'Present'),
(5, 1, '2024-03-05', 'Present'); -- Vikram: 9/10 (90%)

-- Course 4 (Web Technologies) Attendance
INSERT INTO `attendance` (`student_id`, `course_id`, `date`, `status`) VALUES
(5, 4, '2024-02-02', 'Present'),
(5, 4, '2024-02-06', 'Present'),
(5, 4, '2024-02-09', 'Present'),
(5, 4, '2024-02-13', 'Present'),
(5, 4, '2024-02-16', 'Present'),
(5, 4, '2024-02-20', 'Present'),
(5, 4, '2024-02-23', 'Present'),
(5, 4, '2024-02-27', 'Present'), -- Vikram: 8/8 (100%)

(6, 4, '2024-02-02', 'Present'),
(6, 4, '2024-02-06', 'Present'),
(6, 4, '2024-02-09', 'Absent'),
(6, 4, '2024-02-13', 'Present'),
(6, 4, '2024-02-16', 'Present'),
(6, 4, '2024-02-20', 'Present'),
(6, 4, '2024-02-23', 'Present'),
(6, 4, '2024-02-27', 'Present'), -- Diya: 7/8 (87.5%)

-- Manish Gupta: Defaulter demonstration in Course 4
(17, 4, '2024-02-02', 'Present'),
(17, 4, '2024-02-06', 'Absent'),
(17, 4, '2024-02-09', 'Absent'),
(17, 4, '2024-02-13', 'Present'),
(17, 4, '2024-02-16', 'Absent'),
(17, 4, '2024-02-20', 'Absent'),
(17, 4, '2024-02-23', 'Present'),
(17, 4, '2024-02-27', 'Absent'); -- Manish: 3/8 (37.5% Defaulter)

-- Course 7 (Digital Signal Processing) Attendance
INSERT INTO `attendance` (`student_id`, `course_id`, `date`, `status`) VALUES
(8, 7, '2024-02-01', 'Present'),
(8, 7, '2024-02-05', 'Present'),
(8, 7, '2024-02-08', 'Present'),
(8, 7, '2024-02-12', 'Present'),
(8, 7, '2024-02-15', 'Present'),
(8, 7, '2024-02-19', 'Present'),

(9, 7, '2024-02-01', 'Present'),
(9, 7, '2024-02-05', 'Absent'),
(9, 7, '2024-02-08', 'Present'),
(9, 7, '2024-02-12', 'Present'),
(9, 7, '2024-02-15', 'Absent'),
(9, 7, '2024-02-19', 'Absent'), -- Kabir: 3/6 (50% Defaulter)

(10, 7, '2024-02-01', 'Present'),
(10, 7, '2024-02-05', 'Present'),
(10, 7, '2024-02-08', 'Present'),
(10, 7, '2024-02-12', 'Present'),
(10, 7, '2024-02-15', 'Present'),
(10, 7, '2024-02-19', 'Present');

-- -----------------------------------------------------------------------------
-- 8. Seed Default Admin User
-- Credentials: admin / admin123
-- Hash generated via bcrypt (cost factor: 10)
-- -----------------------------------------------------------------------------
INSERT INTO `users` (`user_id`, `username`, `password_hash`, `role`) VALUES
(1, 'admin', '$2b$10$8qihzRlsrUp3.nIfNlyLhObaDHofXVIfggxLrRpnTpp/f6Y1JbLlC', 'admin'),
(2, 'faculty', '$2b$10$8qihzRlsrUp3.nIfNlyLhObaDHofXVIfggxLrRpnTpp/f6Y1JbLlC', 'faculty');

