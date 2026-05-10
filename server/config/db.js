const mysql = require('mysql2/promise');
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

const testConnection = async () => {
    try {
        const conn = await pool.getConnection();
        console.log('✅ Conectado a MySQL (XAMPP)');
        conn.release();
    } catch (error) {
        console.error('❌ Error de conexión a MySQL:', error.message);
        process.exit(1);
    }
};

module.exports = { pool, testConnection };