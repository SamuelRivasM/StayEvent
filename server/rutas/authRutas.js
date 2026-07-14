const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { registrar, iniciarSesion, obtenerPerfil, cerrarSesion, recuperarPassword } = require('../controladores/authControlador');
const { verificarToken } = require('../middlewares/authMiddleware');

const passThrough = (req, res, next) => next();

const limitadorRegistro = process.env.NODE_ENV === 'test'
    ? passThrough
    : rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 5,
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests: true,
        message: { mensaje: 'Demasiados intentos de registro. Intenta nuevamente en 15 minutos.' },
    });

const limitadorLogin = process.env.NODE_ENV === 'test'
    ? passThrough
    : rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 5,
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests: true,
        message: { mensaje: 'Demasiados intentos de inicio de sesión. Intenta nuevamente en 15 minutos.' },
    });

// POST /api/auth/register
router.post('/register', limitadorRegistro, registrar);

// POST /api/auth/login
router.post('/login', limitadorLogin, iniciarSesion);

// POST /api/auth/recover-password
router.post('/recover-password', recuperarPassword);

// GET /api/auth/me
router.get('/me', verificarToken, obtenerPerfil);

// POST /api/auth/logout
router.post('/logout', verificarToken, cerrarSesion);

module.exports = router;
