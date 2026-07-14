require('dotenv').config();
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { logError, logWarn } = require('./config/logger');
const { MIN_JWT_SECRET_LENGTH } = require('./config/constantes');
const { validacionMiddleware } = require('./middlewares/validacionMiddleware');
const authRutas = require('./rutas/authRutas');
const eventosRutas = require('./rutas/eventosRutas');
const comprasRutas = require('./rutas/comprasRutas');
const usuariosRutas = require('./rutas/usuariosRutas');
const adminRutas = require('./rutas/adminRutas');
const reservasRutas = require('./rutas/reservasRutas');
const checkinRutas = require('./rutas/checkinRutas');

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

const app = express();

app.use(helmet());

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

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

if (process.env.NODE_ENV !== 'test') {
    const limitadorGlobal = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 200,
        standardHeaders: true,
        legacyHeaders: false,
        message: { mensaje: 'Demasiadas solicitudes. Intenta más tarde.' },
    });
    app.use(limitadorGlobal);
}

app.use(validacionMiddleware);

app.use('/api/auth', authRutas);
app.use('/api/eventos', eventosRutas);
app.use('/api/compras', comprasRutas);
app.use('/api/usuarios', usuariosRutas);
app.use('/api/admin', adminRutas);
app.use('/api/reservas', reservasRutas);
app.use('/api/checkin', checkinRutas);

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Stay Event API funcionando' });
});

app.use((req, res) => {
    res.status(404).json({ mensaje: 'Ruta no encontrada.' });
});

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

module.exports = app;
