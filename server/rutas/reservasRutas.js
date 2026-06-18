const express = require('express');
const router = express.Router();
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');
const {
    crearReserva,
    confirmarReserva,
    cancelarReserva,
    obtenerEstadoZonas,
} = require('../controladores/reservasControlador');

// Estado de zonas (público — para mostrar disponibilidad en tiempo real)
router.get('/zonas/:eventoId', obtenerEstadoZonas);

// Flujo de reserva (usuario autenticado)
router.post('/',               verificarToken, verificarRol('usuario'), crearReserva);
router.post('/:id/confirmar',  verificarToken, verificarRol('usuario'), confirmarReserva);
router.delete('/:id',          verificarToken, verificarRol('usuario'), cancelarReserva);

module.exports = router;
