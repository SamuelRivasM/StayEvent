const express = require('express');
const router = express.Router();
const { obtenerEventos } = require('../controladores/eventosControlador');

router.get('/', obtenerEventos);

module.exports = router;
