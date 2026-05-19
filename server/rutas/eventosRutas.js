const express = require('express');
const router = express.Router();
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');
const {
    obtenerEventos,
    obtenerEstadisticas,
    obtenerEventosOrganizador,
    crearEvento,
    actualizarEvento,
    cambiarEstadoEvento,
    eliminarEvento,
} = require('../controladores/eventosControlador');

// Público
router.get('/', obtenerEventos);

// Organizador — rutas específicas antes de /:id para evitar conflictos
router.get('/estadisticas', verificarToken, verificarRol('organizador'), obtenerEstadisticas);
router.get('/mis-eventos', verificarToken, verificarRol('organizador'), obtenerEventosOrganizador);
router.post('/', verificarToken, verificarRol('organizador'), crearEvento);
router.put('/:id', verificarToken, verificarRol('organizador'), actualizarEvento);
router.patch('/:id/estado', verificarToken, verificarRol('organizador'), cambiarEstadoEvento);
router.delete('/:id', verificarToken, verificarRol('organizador'), eliminarEvento);

module.exports = router;
