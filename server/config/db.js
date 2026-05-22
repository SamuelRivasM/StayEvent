const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,

    ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true
    },

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

const testConnection = async () => {
    try {
        const conn = await pool.getConnection();

        console.log('Conectado a TiDB Cloud');

        conn.release();
    } catch (error) {
        console.error('Error de conexión a MySQL:', error.message);

        process.exit(1);
    }
};

module.exports = { pool, testConnection };