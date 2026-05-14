const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const SALT_ROUNDS = 12;
const CAMPOS_PERMITIDOS_REGISTRO = new Set(['nombre', 'apellido', 'email', 'password', 'telefono']);
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REGEX_CARACTER_ESPECIAL = /[$%#]/;
const REGEX_SOLO_NUMEROS = /^\d+$/;

const registrar = async (req, res) => {
    try {
        // Rechazar campos no esperados
        const camposRecibidos = Object.keys(req.body || {});
        const camposExtras = camposRecibidos.filter((c) => !CAMPOS_PERMITIDOS_REGISTRO.has(c));
        if (camposExtras.length > 0) {
            return res.status(400).json({ mensaje: 'Se recibieron campos no permitidos.' });
        }

        const { nombre, apellido, email, password, telefono } = req.body;

        // Verificar tipos de datos
        if (
            typeof nombre !== 'string' ||
            typeof apellido !== 'string' ||
            typeof email !== 'string' ||
            typeof password !== 'string' ||
            typeof telefono !== 'string'
        ) {
            return res.status(400).json({ mensaje: 'Tipos de datos inválidos.' });
        }

        // Campos obligatorios
        if (!nombre.trim() || !apellido.trim() || !email.trim() || !password || !telefono.trim()) {
            return res.status(400).json({ mensaje: 'Nombre, apellido, email, contraseña y teléfono son obligatorios.' });
        }

        // Límites de longitud máxima
        if (nombre.trim().length > 50 || apellido.trim().length > 50) {
            return res.status(400).json({ mensaje: 'Nombre y apellido no deben exceder 50 caracteres.' });
        }
        if (email.trim().length > 100) {
            return res.status(400).json({ mensaje: 'El email no debe exceder 100 caracteres.' });
        }
        if (password.length > 72) {
            return res.status(400).json({ mensaje: 'La contraseña no debe exceder 72 caracteres.' });
        }

        // Formato de email
        if (!REGEX_EMAIL.test(email.trim())) {
            return res.status(400).json({ mensaje: 'Formato de email inválido.' });
        }

        // Longitud mínima de nombre y apellido
        if (nombre.trim().length < 2 || apellido.trim().length < 2) {
            return res.status(400).json({ mensaje: 'Nombre y apellido deben tener al menos 2 caracteres.' });
        }

        // Longitud mínima de contraseña
        if (password.length < 8) {
            return res.status(400).json({ mensaje: 'La contraseña debe tener al menos 8 caracteres.' });
        }

        // Carácter especial en contraseña
        if (!REGEX_CARACTER_ESPECIAL.test(password)) {
            return res.status(400).json({ mensaje: 'La contraseña debe contener al menos un carácter especial ($, %, #).' });
        }

        // Teléfono: obligatorio, solo numérico, longitud válida
        if (!REGEX_SOLO_NUMEROS.test(telefono.trim())) {
            return res.status(400).json({ mensaje: 'El teléfono solo debe contener números.' });
        }
        if (telefono.trim().length !== 9) {
            return res.status(400).json({ mensaje: 'El teléfono debe tener exactamente 9 dígitos.' });
        }

        // Verificar email único
        const [usuarioExistente] = await pool.query(
            'SELECT id FROM usuarios WHERE email = ?',
            [email.toLowerCase().trim()]
        );

        if (usuarioExistente.length > 0) {
            return res.status(409).json({ mensaje: 'El email ya está registrado.' });
        }

        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        const [resultado] = await pool.query(
            'INSERT INTO usuarios (nombre, apellido, email, password, telefono, rol) VALUES (?, ?, ?, ?, ?, ?)',
            [
                nombre.trim(),
                apellido.trim(),
                email.toLowerCase().trim(),
                passwordHash,
                telefono.trim(),
                'usuario',
            ]
        );

        const token = jwt.sign(
            { id: resultado.insertId, rol: 'usuario' },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        return res.status(201).json({
            mensaje: 'Usuario registrado exitosamente.',
            token,
            usuario: {
                id: resultado.insertId,
                nombre: nombre.trim(),
                apellido: apellido.trim(),
                email: email.toLowerCase().trim(),
                rol: 'usuario',
            },
        });
    } catch (error) {
        console.error('Error en registro:', error.message);
        return res.status(500).json({ mensaje: 'Error interno del servidor.' });
    }
};

const iniciarSesion = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ mensaje: 'Email y contraseña son requeridos.' });
        }

        const [usuarios] = await pool.query(
            'SELECT id, nombre, apellido, email, password, rol FROM usuarios WHERE email = ?',
            [email.toLowerCase().trim()]
        );

        if (usuarios.length === 0) {
            return res.status(401).json({ mensaje: 'Credenciales inválidas.' });
        }

        const usuario = usuarios[0];
        const passwordValida = await bcrypt.compare(password, usuario.password);

        if (!passwordValida) {
            return res.status(401).json({ mensaje: 'Credenciales inválidas.' });
        }

        const token = jwt.sign(
            { id: usuario.id, rol: usuario.rol },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        return res.status(200).json({
            mensaje: 'Inicio de sesión exitoso.',
            token,
            usuario: {
                id: usuario.id,
                nombre: usuario.nombre,
                apellido: usuario.apellido,
                email: usuario.email,
                rol: usuario.rol,
            },
        });
    } catch (error) {
        console.error('Error en inicio de sesión:', error.message);
        return res.status(500).json({ mensaje: 'Error interno del servidor.' });
    }
};

const obtenerPerfil = async (req, res) => {
    try {
        const [usuarios] = await pool.query(
            'SELECT id, nombre, apellido, email, telefono, rol, created_at FROM usuarios WHERE id = ?',
            [req.usuario.id]
        );

        if (usuarios.length === 0) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
        }

        return res.status(200).json({ usuario: usuarios[0] });
    } catch (error) {
        console.error('Error al obtener perfil:', error.message);
        return res.status(500).json({ mensaje: 'Error interno del servidor.' });
    }
};

module.exports = { registrar, iniciarSesion, obtenerPerfil };
