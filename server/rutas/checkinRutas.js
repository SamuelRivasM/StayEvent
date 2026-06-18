const express = require('express');
const router = express.Router();
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');
const {
    registrarCheckin,
    obtenerCheckins,
    estadisticasCheckin,
    registrarAccesoRapido,
} = require('../controladores/checkinControlador');

// Todas las rutas requieren rol organizador
router.post('/',                           verificarToken, verificarRol('organizador'), registrarCheckin);
router.get('/evento/:eventoId',            verificarToken, verificarRol('organizador'), obtenerCheckins);
router.get('/estadisticas',                verificarToken, verificarRol('organizador'), estadisticasCheckin);
router.post('/registrar-acceso/:eventoId', verificarToken, verificarRol('organizador'), registrarAccesoRapido);

module.exports = router;
