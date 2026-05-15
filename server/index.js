require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { testConnection } = require('./config/db');
const authRutas = require('./rutas/authRutas');
const eventosRutas = require('./rutas/eventosRutas');

const app = express();
const PORT = process.env.PORT || 5000;

// Cabeceras de seguridad HTTP (XSS, clickjacking, MIME sniffing, etc.)
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
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Limitar tamaño del body para evitar ataques de payload masivo
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Limitador global: capa de protección contra DoS en cualquier endpoint
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

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Stay Event API funcionando' });
});

// 404
app.use((req, res) => {
    res.status(404).json({ mensaje: 'Ruta no encontrada.' });
});

// Manejador global de errores — nunca expone stack traces al cliente
app.use((err, req, res, next) => {
    console.error('Error no controlado:', err.message);
    if (err.message && err.message.includes('CORS')) {
        return res.status(403).json({ mensaje: 'Acceso no permitido.' });
    }
    res.status(500).json({ mensaje: 'Error interno del servidor.' });
});

// Iniciar servidor
app.listen(PORT, async () => {
    console.log(`Servidor Stay Event corriendo en http://localhost:${PORT}`);
    await testConnection();
});
