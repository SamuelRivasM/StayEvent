const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { actualizarPerfil } = require('../controladores/usuariosControlador');
const { verificarToken } = require('../middlewares/authMiddleware');

const limitadorPerfil = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { mensaje: 'Demasiadas solicitudes. Intenta más tarde.' },
});

// PUT /api/usuarios/perfil
router.put('/perfil', limitadorPerfil, verificarToken, actualizarPerfil);

module.exports = router;
