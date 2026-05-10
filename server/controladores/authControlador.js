const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const SALT_ROUNDS = 12;

const registrar = async (req, res) => {
    try {
        const { nombre, apellido, email, password, telefono } = req.body;

        if (!nombre || !apellido || !email || !password) {
            return res.status(400).json({ mensaje: 'Nombre, apellido, email y contraseña son obligatorios.' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ mensaje: 'Formato de email inválido.' });
        }

        if (password.length < 8) {
            return res.status(400).json({ mensaje: 'La contraseña debe tener al menos 8 caracteres.' });
        }

        if (nombre.trim().length < 2 || apellido.trim().length < 2) {
            return res.status(400).json({ mensaje: 'Nombre y apellido deben tener al menos 2 caracteres.' });
        }

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
                telefono ? telefono.trim() : null,
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
