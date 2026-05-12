require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { testConnection } = require('./config/db');
const authRutas = require('./rutas/authRutas');
const eventosRutas = require('./rutas/eventosRutas');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares globales
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas
app.use('/api/auth', authRutas);
app.use('/api/eventos', eventosRutas);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Stay Event API funcionando ✅' });
});

// 404
app.use((req, res) => {
    res.status(404).json({ mensaje: 'Ruta no encontrada.' });
});

// Iniciar servidor
app.listen(PORT, async () => {
    console.log(`\n🚀 Servidor Stay Event corriendo en http://localhost:${PORT}`);
    await testConnection();
});
