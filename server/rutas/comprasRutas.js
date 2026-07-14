const express = require('express');
const router = express.Router();
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware');
const { crearCompra, obtenerMisTickets, exportarComprasCSV } = require('../controladores/comprasControlador');

router.get('/mis-tickets', verificarToken, verificarRol('usuario'), obtenerMisTickets);
router.post('/', verificarToken, verificarRol('usuario'), crearCompra);
router.get('/export-csv', verificarToken, verificarRol('admin', 'organizador'), exportarComprasCSV);

module.exports = router;
