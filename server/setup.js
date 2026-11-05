// =============================================================================
// STUDENT MANAGEMENT SYSTEM
// File: server/setup.js
// Description: Automated Database Initialization Script
// Executes schema, views, triggers, procedures, and seed datasets in sequence.
// Run with: npm run setup:db
// =============================================================================

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');

dotenv.config();

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT, 10) || 3306;
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'student_management_db';

/**
 * Splits an SQL file into individual executable statements,
 * correctly taking into account custom DELIMITER changes (e.g. DELIMITER $$).
 */
function parseSqlStatements(sqlContent) {
    const lines = sqlContent.split(/\r?\n/);
    const statements = [];
    let currentDelimiter = ';';
    let currentStatement = '';

    for (let rawLine of lines) {
        const trimmed = rawLine.trim();

        // Check for DELIMITER instruction
        const delimiterMatch = trimmed.match(/^DELIMITER\s+(.+)$/i);
        if (delimiterMatch) {
            currentDelimiter = delimiterMatch[1].trim();
            continue;
        }

        // Ignore standalone single-line comments outside of active statement
        if (trimmed.startsWith('--') && currentStatement.trim().length === 0) {
            continue;
        }

        currentStatement += rawLine + '\n';

        // Check if current statement ends with active delimiter
        if (currentStatement.trim().endsWith(currentDelimiter)) {
            let stmt = currentStatement.trim();
            // Strip the trailing delimiter
            stmt = stmt.slice(0, stmt.length - currentDelimiter.length).trim();
            if (stmt.length > 0) {
                statements.push(stmt);
            }
            currentStatement = '';
        }
    }

    if (currentStatement.trim().length > 0) {
        statements.push(currentStatement.trim());
    }

    return statements;
}

async function runSqlFile(connection, filePath) {
    const fileName = path.basename(filePath);
    console.log(`\n--> Running ${fileName}...`);
    const content = fs.readFileSync(filePath, 'utf8');
    const statements = parseSqlStatements(content);

    let executed = 0;
    for (const sql of statements) {
        if (!sql || sql.trim().length === 0) continue;
        try {
            await connection.query(sql);
            executed++;
        } catch (err) {
            console.error(`[Error] Failed executing statement in ${fileName}:`);
            console.error(sql.substring(0, 150) + '...');
            console.error(`Reason: ${err.message}`);
            throw err;
        }
    }
    console.log(`[OK] ${fileName} completed successfully (${executed} statements executed).`);
}

async function setup() {
    console.log('====================================================');
    console.log('   STUDENT MANAGEMENT SYSTEM - DATABASE SETUP       ');
    console.log('====================================================');
    console.log(`Target: ${DB_USER}@${DB_HOST}:${DB_PORT} / ${DB_NAME}`);

    let rootConnection;
    try {
        // 1. Connect without selecting database to ensure database exists
        rootConnection = await mysql.createConnection({
            host: DB_HOST,
            port: DB_PORT,
            user: DB_USER,
            password: DB_PASSWORD,
            multipleStatements: true
        });

        console.log('[OK] Connected to MySQL Server.');
        await rootConnection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
        console.log(`[OK] Database "${DB_NAME}" confirmed/created.`);
        await rootConnection.query(`USE \`${DB_NAME}\`;`);

        // 2. Execute SQL files in strict relational order
        const baseDir = path.join(__dirname, '..', 'database');
        await runSqlFile(rootConnection, path.join(baseDir, 'schema.sql'));
        await runSqlFile(rootConnection, path.join(baseDir, 'triggers.sql'));
        await runSqlFile(rootConnection, path.join(baseDir, 'views.sql'));
        await runSqlFile(rootConnection, path.join(baseDir, 'procedures.sql'));
        await runSqlFile(rootConnection, path.join(baseDir, 'seed.sql'));

        // 3. Ensure Default Admin User is seeded with fresh bcrypt hash
        const adminPass = 'admin123';
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(adminPass, saltRounds);

        await rootConnection.query(
            `INSERT INTO users (username, password_hash, role) 
             VALUES (?, ?, 'admin') 
             ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = 'admin'`,
            ['admin', passwordHash]
        );
        console.log('[OK] Default admin verified (username: "admin", password: "admin123")');

        console.log('\n====================================================');
        console.log('   DATABASE INITIALIZATION COMPLETED SUCCESSFULLY!  ');
        console.log('   You can now run: npm start                       ');
        console.log('====================================================\n');

    } catch (err) {
        console.error('\n[FATAL] Database setup failed:', err.message);
        console.error('\nPlease verify your .env file credentials and ensure MySQL is running.');
        process.exit(1);
    } finally {
        if (rootConnection) {
            await rootConnection.end();
        }
    }
}

if (require.main === module) {
    setup();
}

module.exports = setup;

