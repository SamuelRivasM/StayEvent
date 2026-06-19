const express = require('express');
const router = express.Router();
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');
const {
    obtenerEventos,
    obtenerDetalleEvento,
    obtenerEstadisticas,
    obtenerEventosOrganizador,
    obtenerDashboardOrganizador,
    crearEvento,
    actualizarEvento,
    cambiarEstadoEvento,
    eliminarEvento,
} = require('../controladores/eventosControlador');
const { streamInsights } = require('../controladores/insightsControlador');

// Público
router.get('/', obtenerEventos);
router.get('/:id/detalle', obtenerDetalleEvento);

// Organizador — rutas específicas antes de /:id para evitar conflictos
router.get('/estadisticas',          verificarToken, verificarRol('organizador'), obtenerEstadisticas);
router.get('/mis-eventos',           verificarToken, verificarRol('organizador'), obtenerEventosOrganizador);
router.get('/dashboard-organizador', verificarToken, verificarRol('organizador'), obtenerDashboardOrganizador);
router.get('/insights/stream',       verificarToken, verificarRol('organizador'), streamInsights);
router.post('/', verificarToken, verificarRol('organizador'), crearEvento);
router.put('/:id', verificarToken, verificarRol('organizador'), actualizarEvento);
router.patch('/:id/estado', verificarToken, verificarRol('organizador'), cambiarEstadoEvento);
router.delete('/:id', verificarToken, verificarRol('organizador'), eliminarEvento);

module.exports = router;
