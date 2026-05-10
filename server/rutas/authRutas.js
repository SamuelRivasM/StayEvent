const express = require('express');
const router = express.Router();
const { registrar, iniciarSesion, obtenerPerfil } = require('../controladores/authControlador');
const { verificarToken } = require('../middlewares/authMiddleware');

// POST /api/auth/register
router.post('/register', registrar);

// POST /api/auth/login
router.post('/login', iniciarSesion);

// GET /api/auth/me
router.get('/me', verificarToken, obtenerPerfil);

module.exports = router;
