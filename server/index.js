// ─────────────────────────────────────────────────────────────
//  Stay Event — Servidor principal
//
//  Este archivo aplica las siguientes subcaracterísticas:
//  - Confidencialidad: validación de JWT_SECRET, no-leak de errores
//  - Integridad: whitelist de ALTER TABLE, validación de entrada
//  - Autenticidad: detección de contraseñas por defecto
//  - Responsabilidad: IDs de error en cada respuesta 500
// ─────────────────────────────────────────────────────────────

require('dotenv').config();
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const { testConnection, pool } = require('./config/db');
const { logError, logInfo, logWarn, generarIdError } = require('./config/logger');
const { MIN_JWT_SECRET_LENGTH } = require('./config/constantes');
const { validacionMiddleware } = require('./middlewares/validacionMiddleware');
const authRutas = require('./rutas/authRutas');
const eventosRutas = require('./rutas/eventosRutas');
const comprasRutas = require('./rutas/comprasRutas');
const usuariosRutas = require('./rutas/usuariosRutas');
const adminRutas = require('./rutas/adminRutas');

// Valida que el JWT_SECRET configurado sea seguro y robusto

const validarSecreto = () => {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
        logWarn('Seguridad', 'JWT_SECRET no definido. Generando uno temporal (NO apto para producción).');
        process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
        return;
    }

    if (secret.length < MIN_JWT_SECRET_LENGTH) {
        logWarn(
            'Seguridad',
            `JWT_SECRET tiene ${secret.length} caracteres. Se recomiendan al menos ${MIN_JWT_SECRET_LENGTH}. `
            + 'Generar uno seguro: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
        );
    }

    if (/stay.?event/i.test(secret)) {
        logWarn(
            'Seguridad',
            'JWT_SECRET contiene el nombre del proyecto, lo que lo hace predecible. Cámbialo por uno aleatorio.'
        );
    }
};

validarSecreto();

// Inicialización de la app de Express

const app = express();
const PORT = process.env.PORT || 5000;

// Cabeceras de seguridad HTTP
app.use(helmet());

// CORS: lee el origen desde variables de entorno
const ORIGENES_PERMITIDOS = (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',').map(o => o.trim());

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

// Límite de body
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Rate limit global
const limitadorGlobal = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { mensaje: 'Demasiadas solicitudes. Intenta más tarde.' },
});
app.use(limitadorGlobal);

// Validación de entrada global
app.use(validacionMiddleware);

// Rutas
app.use('/api/auth', authRutas);
app.use('/api/eventos', eventosRutas);
app.use('/api/compras', comprasRutas);
app.use('/api/usuarios', usuariosRutas);
app.use('/api/admin', adminRutas);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Stay Event API funcionando' });
});

// 404
app.use((req, res) => {
    res.status(404).json({ mensaje: 'Ruta no encontrada.' });
});

// Manejo global de errores (oculta detalles y devuelve ID de trazabilidad)

app.use((err, req, res, next) => {
    if (err.message && err.message.includes('CORS')) {
        return res.status(403).json({ mensaje: 'Acceso no permitido.' });
    }

    const idError = logError('ErrorHandler', err);
    res.status(500).json({
        mensaje: 'Error interno del servidor.',
        referencia: idError,
    });
});

// Whitelist de columnas para ALTER TABLE (previene inyección SQL)

const COLUMNAS_PERMITIDAS_EVENTOS = Object.freeze({
    imagen_url:   'VARCHAR(500) DEFAULT NULL',
    imagen_mapa:  'VARCHAR(500) DEFAULT NULL',
    activo:       'TINYINT(1) NOT NULL DEFAULT 1',
    eliminado:    'TINYINT(1) NOT NULL DEFAULT 0',
    direccion:    'VARCHAR(255) DEFAULT NULL',
});

const agregarColumnaEventosSiNoExiste = async (columna) => {
    const definicion = COLUMNAS_PERMITIDAS_EVENTOS[columna];

    if (!definicion) {
        logWarn('DB', `Columna '${columna}' no está en la whitelist. Operación rechazada.`);
        return;
    }

    const [filas] = await pool.execute(
        `SELECT COUNT(*) AS count FROM information_schema.columns
         WHERE table_schema = DATABASE() AND table_name = 'eventos' AND column_name = ?`,
        [columna]
    );

    if (filas[0].count === 0) {
        // Seguro: usa solo valores de la whitelist estática
        await pool.execute(`ALTER TABLE eventos ADD COLUMN \`${columna}\` ${definicion}`);
        logInfo('DB', `Columna '${columna}' agregada a tabla eventos.`);
    }
};

// ── Inicialización de DB ──────────────────────────────────────────────────────

const inicializarDB = async () => {
    try {
        // Crear tabla de sesiones activas
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

        // Limpiar sesiones expiradas
        await pool.execute(
            'UPDATE sesiones_activas SET activo = 0 WHERE expira_en < NOW() AND activo = 1'
        );

        logInfo('DB', 'Tabla sesiones_activas lista.');

        // Agregar columnas faltantes a eventos (usando whitelist)
        for (const columna of Object.keys(COLUMNAS_PERMITIDAS_EVENTOS)) {
            await agregarColumnaEventosSiNoExiste(columna);
        }
    } catch (error) {
        logError('DB.inicializarDB', error);
    }
};

// Alerta si el administrador sigue usando las credenciales por defecto

const verificarPasswordAdmin = async () => {
    try {
        const [admins] = await pool.query(
            "SELECT id, password FROM usuarios WHERE rol = 'admin' LIMIT 1"
        );

        if (admins.length === 0) return;

        const usaPasswordDefecto = await bcrypt.compare('admin123', admins[0].password);

        if (usaPasswordDefecto) {
            logWarn(
                'Seguridad',
                '⚠️  El administrador usa la contraseña por defecto (admin123). '
                + 'Cámbiala inmediatamente desde el panel o la base de datos.'
            );
        }
    } catch (error) {
        // No bloquear el arranque por este check
        logError('Seguridad.verificarPasswordAdmin', error);
    }
};

// ── Iniciar servidor ──────────────────────────────────────────────────────────

app.listen(PORT, async () => {
    logInfo('Server', `Stay Event API corriendo en http://localhost:${PORT}`);
    await testConnection();
    await inicializarDB();
    await verificarPasswordAdmin();
});
