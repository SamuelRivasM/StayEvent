require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { testConnection, pool } = require('./config/db');
const authRutas = require('./rutas/authRutas');
const eventosRutas = require('./rutas/eventosRutas');
const comprasRutas = require('./rutas/comprasRutas');

const app = express();
const PORT = process.env.PORT || 5000;

// cabeceras de seguridad HTTP
app.use(helmet());

// CORS: solo permite el origen del frontend
const ORIGENES_PERMITIDOS = ['http://localhost:3000'];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || ORIGENES_PERMITIDOS.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('CORS: origen no permitido.'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// límite de body
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// rate limit global
const limitadorGlobal = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { mensaje: 'Demasiadas solicitudes. Intenta más tarde.' },
});
app.use(limitadorGlobal);

// Rutas
app.use('/api/auth', authRutas);
app.use('/api/eventos', eventosRutas);
app.use('/api/compras', comprasRutas);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Stay Event API funcionando' });
});

// 404
app.use((req, res) => {
    res.status(404).json({ mensaje: 'Ruta no encontrada.' });
});

// error handler global
app.use((err, req, res, next) => {
    console.error('Error no controlado:', err.message);
    if (err.message && err.message.includes('CORS')) {
        return res.status(403).json({ mensaje: 'Acceso no permitido.' });
    }
    res.status(500).json({ mensaje: 'Error interno del servidor.' });
});

const agregarColumnaEventosSiNoExiste = async (columna, definicion) => {
    const [filas] = await pool.execute(
        `SELECT COUNT(*) AS count FROM information_schema.columns
         WHERE table_schema = DATABASE() AND table_name = 'eventos' AND column_name = ?`,
        [columna]
    );
    if (filas[0].count === 0) {
        await pool.execute(`ALTER TABLE eventos ADD COLUMN ${columna} ${definicion}`);
        console.log(`Columna '${columna}' agregada a tabla eventos.`);
    }
};

const inicializarDB = async () => {
    try {
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS sesiones_activas (
                id INT AUTO_INCREMENT PRIMARY KEY,
                usuario_id INT NOT NULL,
                jti VARCHAR(64) NOT NULL,
                creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expira_en DATETIME NOT NULL,
                activo TINYINT(1) NOT NULL DEFAULT 1,
                UNIQUE KEY uk_jti (jti),
                INDEX idx_usuario_activo (usuario_id, activo),
                INDEX idx_expira_en (expira_en),
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
        await pool.execute(
            'UPDATE sesiones_activas SET activo = 0 WHERE expira_en < NOW() AND activo = 1'
        );
        console.log('Tabla sesiones_activas lista.');

        // columnas del módulo organizador
        await agregarColumnaEventosSiNoExiste('organizador_id', 'INT NULL');
        await agregarColumnaEventosSiNoExiste('eliminado', 'TINYINT(1) NOT NULL DEFAULT 0');
    } catch (error) {
        console.error('Error al inicializar DB:', error.message);
    }
};

// Iniciar servidor
app.listen(PORT, async () => {
    console.log(`Servidor Stay Event corriendo en http://localhost:${PORT}`);
    await testConnection();
    await inicializarDB();
});
