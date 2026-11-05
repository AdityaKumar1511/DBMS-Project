# Student Management System

A small student records application built for a DBMS lab course. It uses MySQL for the schema, constraints, triggers, views, and stored procedures, with an Express API and plain HTML/CSS/JavaScript front end.

## Features

- Departments, students, faculty, courses, enrollments, marks, and attendance
- Search, filters, and pagination on the student list
- Marks total and grade calculated by database triggers
- Enrollment created through the `enroll_student()` stored procedure
- Attendance percentage through the `get_attendance_percentage()` stored procedure
- Report card generated from the `student_report_card` view
- Dashboard department summary generated from the `department_summary` view
- Session-based login with bcrypt password hashing

## Stack

- Node.js and Express
- MySQL 8
- `mysql2` connection pool
- Plain HTML, CSS, and JavaScript
- `express-session` and `bcrypt`

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file from `.env.example` and set your MySQL credentials:

   ```env
   PORT=3000
   SESSION_SECRET=change_this
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=student_management_db
   ```

3. Create the database and load the schema, triggers, views, procedures, and sample data:

   ```bash
   npm run setup:db
   ```

4. Start the server:

   ```bash
   npm start
   ```

5. Open `http://localhost:3000`.

Default login: `admin` / `admin123`

## Database files

| File | Purpose |
| --- | --- |
| `database/schema.sql` | Tables, primary keys, foreign keys, constraints |
| `database/triggers.sql` | Marks total and grade calculation |
| `database/views.sql` | `student_report_card` and `department_summary` views |
| `database/procedures.sql` | `enroll_student()` and `get_attendance_percentage()` |
| `database/seed.sql` | Sample departments, students, courses, and records |
| `database/queries.sql` | Reference queries and joins |

The SQL files are loaded in the order above by `server/setup.js`.

## Project layout

```text
database/          SQL schema and database logic
public/            HTML pages, CSS, and browser JavaScript
server/
  middleware/      Session authentication guard
  routes/          REST endpoints
  db.js            MySQL connection pool
  server.js        Express entry point
  setup.js         Database initialization script
```

## Notes

- All SQL queries use parameter placeholders where user input is involved.
- Deleting a student removes their enrollments, marks, and attendance through foreign key rules.
- Departments and courses with linked records cannot be deleted.
- Removing faculty leaves their courses unassigned (`ON DELETE SET NULL`).
