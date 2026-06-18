// Configuración del pool de base de datos (MySQL)

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { logInfo, logError, logWarn } = require('./logger');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'stay_event',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

// Carga schema.sql inicial si existe, asegurando liberar la conexión en el bloque finally
const initializeDatabase = async () => {
    const schemaPath = path.join(__dirname, 'schema.sql');

    if (!fs.existsSync(schemaPath)) {
        logWarn('DB', 'Archivo schema.sql no encontrado, omitiendo inicialización.');
        return;
    }

    let conn;
    try {
        const schema = fs.readFileSync(schemaPath, 'utf8');
        conn = await pool.getConnection();

        const statements = schema
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0);

        for (const statement of statements) {
            await conn.execute(statement);
        }

        logInfo('DB', 'Schema de base de datos inicializado correctamente.');
    } catch (error) {
        logError('DB.initializeDatabase', error);
    } finally {
        if (conn) conn.release();
    }
};

// Prueba la conexión inicial y carga el schema de BD
const testConnection = async () => {
    let conn;
    try {
        conn = await pool.getConnection();
        logInfo('DB', 'Conectado a MySQL (XAMPP).');
        conn.release();
        conn = null;

        await initializeDatabase();
    } catch (error) {
        logError('DB.testConnection', error);
        process.exit(1);
    } finally {
        if (conn) conn.release();
    }
};

module.exports = { pool, testConnection };