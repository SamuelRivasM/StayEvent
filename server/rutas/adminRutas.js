const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { verificarToken } = require('../middlewares/authMiddleware');
const { logError } = require('../config/logger');
const {
    obtenerMetricas,
    obtenerMetricasDashboard,
    crearUsuarioAdmin,
    listarUsuarios,
    obtenerUsuario,
    editarUsuario,
    eliminarUsuario,
    listarEventosAdmin,
    obtenerEventoAdmin,
    cambiarEstadoEvento,
} = require('../controladores/adminControlador');
const { streamInsights } = require('../controladores/insightsControlador');

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
        const idError = logError('AdminRutas.esAdmin', err);
        res.status(500).json({ mensaje: 'Error de autorización.', referencia: idError });
    }
};

// Dashboard
router.get('/metricas',           verificarToken, esAdmin, obtenerMetricas);
router.get('/metricas-dashboard', verificarToken, esAdmin, obtenerMetricasDashboard);
router.get('/insights/stream',    verificarToken, esAdmin, streamInsights);

// Gestión de usuarios
router.post('/usuarios',        verificarToken, esAdmin, crearUsuarioAdmin);
router.get('/usuarios',         verificarToken, esAdmin, listarUsuarios);
router.get('/usuarios/:id',     verificarToken, esAdmin, obtenerUsuario);
router.put('/usuarios/:id',     verificarToken, esAdmin, editarUsuario);
router.delete('/usuarios/:id',  verificarToken, esAdmin, eliminarUsuario);

// Gestión de eventos
router.get('/eventos',              verificarToken, esAdmin, listarEventosAdmin);
router.get('/eventos/:id',          verificarToken, esAdmin, obtenerEventoAdmin);
router.patch('/eventos/:id/estado', verificarToken, esAdmin, cambiarEstadoEvento);

module.exports = router;
