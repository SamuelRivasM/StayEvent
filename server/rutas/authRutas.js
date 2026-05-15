const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { registrar, iniciarSesion, obtenerPerfil } = require('../controladores/authControlador');
const { verificarToken } = require('../middlewares/authMiddleware');

const limitadorRegistro = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: { mensaje: 'Demasiados intentos de registro. Intenta nuevamente en 15 minutos.' },
});

const limitadorLogin = rateLimit({
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

// GET /api/auth/me
router.get('/me', verificarToken, obtenerPerfil);

module.exports = router;
