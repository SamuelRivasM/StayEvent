const mysql = require('mysql2/promise');
require('dotenv').config();

// Validación de variables
if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_NAME) {
    console.error("Error: Los datos de conexión a la base de datos están incompletos en las variables de entorno.");
    process.exit(1);
}

// Configuración directa para Railway. Aclarando, antes estaba el SSL por la antigua NUBE PERO FUE.
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

const testConnection = async () => {
    try {
        const conn = await pool.getConnection();
        console.log('[INFO] DB: Conectado con éxito a Railway MySQL');
        conn.release();
    } catch (error) {
        console.error('Error de conexión a MySQL:', error.message);
        process.exit(1);
    }
};

module.exports = { pool, testConnection };