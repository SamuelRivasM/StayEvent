const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { verificarToken } = require('../middlewares/authMiddleware');
const {
    obtenerMetricas,
    listarUsuarios,
    obtenerUsuario,
    editarUsuario,
    listarEventosAdmin,
    obtenerEventoAdmin,
    cambiarEstadoEvento,
} = require('../controladores/adminControlador');

// Verifica el rol admin contra la BD, no contra el payload del JWT.
// Esto evita fallos cuando el rol fue actualizado en BD después del último login.
const esAdmin = async (req, res, next) => {
    try {
        const [rows] = await pool.query(
            'SELECT rol FROM usuarios WHERE id = ?',
            [req.usuario.id]
        );
        if (!rows.length || rows[0].rol !== 'admin') {
            return res.status(403).json({ mensaje: 'Acceso denegado.' });
        }
        next();
    } catch (err) {
        console.error('Error en esAdmin:', err.message);
        res.status(500).json({ mensaje: 'Error de autorización.' });
    }
};

// Dashboard
router.get('/metricas', verificarToken, esAdmin, obtenerMetricas);

// Gestión de usuarios
router.get('/usuarios',     verificarToken, esAdmin, listarUsuarios);
router.get('/usuarios/:id', verificarToken, esAdmin, obtenerUsuario);
router.put('/usuarios/:id', verificarToken, esAdmin, editarUsuario);

// Gestión de eventos
router.get('/eventos',              verificarToken, esAdmin, listarEventosAdmin);
router.get('/eventos/:id',          verificarToken, esAdmin, obtenerEventoAdmin);
router.patch('/eventos/:id/estado', verificarToken, esAdmin, cambiarEstadoEvento);

module.exports = router;
