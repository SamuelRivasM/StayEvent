const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

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

const initializeDatabase = async () => {
    try {
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        const conn = await pool.getConnection();

        // Ejecutar cada sentencia SQL del schema
        const statements = schema
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0);

        for (const statement of statements) {
            await conn.execute(statement);
        }

        console.log('Schema de base de datos inicializado correctamente');
        conn.release();
    } catch (error) {
        console.error('Error al inicializar el schema:', error.message);
    }
};

const testConnection = async () => {
    try {
        const conn = await pool.getConnection();
        console.log('Conectado a MySQL (XAMPP)');
        conn.release();

        // Inicializar schema después de conectar
        await initializeDatabase();
    } catch (error) {
        console.error('Error de conexión a MySQL:', error.message);
        process.exit(1);
    }
};

module.exports = { pool, testConnection };