const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool } = require('../config/db');

const SALT_ROUNDS = 12;
const CAMPOS_PERMITIDOS_REGISTRO = new Set(['nombre', 'apellido', 'email', 'password', 'codigoPais', 'telefono']);

const DIGITOS_POR_PAIS = {
    '+51': 9,   // Perú
    '+56': 9,   // Chile
    '+54': 10,  // Argentina
    '+57': 10,  // Colombia
    '+52': 10,  // México
    '+593': 9,  // Ecuador
    '+591': 8,  // Bolivia
    '+598': 8,  // Uruguay
    '+595': 9,  // Paraguay
};
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REGEX_CARACTER_ESPECIAL = /[$%#]/;
const REGEX_SOLO_NUMEROS = /^\d+$/;

const MAX_EMAIL_LENGTH = 100;
const MAX_PASSWORD_LENGTH = 72;
const DELAY_BASE_MS = 300;
const MAX_DELAY_MS = 4000;

// Rastreo en memoria de intentos fallidos por IP para retraso progresivo
const intentosFallidos = new Map();

setInterval(() => {
    const ahora = Date.now();
    for (const [clave, datos] of intentosFallidos.entries()) {
        if (ahora - datos.ultimoIntento > 30 * 60 * 1000) intentosFallidos.delete(clave);
    }
}, 30 * 60 * 1000).unref();

const calcularDelay = (intentos) =>
    Math.min(DELAY_BASE_MS * Math.pow(2, Math.max(0, intentos - 2)), MAX_DELAY_MS);

const generarToken = (payload) => {
    const jti = crypto.randomUUID();
    const token = jwt.sign(
        { ...payload, jti },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d', algorithm: 'HS256' }
    );
    const { exp } = jwt.decode(token);
    return { token, jti, expiraEn: new Date(exp * 1000) };
};

const registrarSesionDB = async (usuarioId, jti, expiraEn) => {
    await pool.execute(
        'INSERT INTO sesiones_activas (usuario_id, jti, expira_en) VALUES (?, ?, ?)',
        [usuarioId, jti, expiraEn]
    );
};

const registrar = async (req, res) => {
    try {
        // Rechazar campos no esperados
        const camposRecibidos = Object.keys(req.body || {});
        const camposExtras = camposRecibidos.filter((c) => !CAMPOS_PERMITIDOS_REGISTRO.has(c));
        if (camposExtras.length > 0) {
            return res.status(400).json({ mensaje: 'Se recibieron campos no permitidos.' });
        }

        const { nombre, apellido, email, password, codigoPais, telefono } = req.body;

        // Verificar tipos de datos
        if (
            typeof nombre !== 'string' ||
            typeof apellido !== 'string' ||
            typeof email !== 'string' ||
            typeof password !== 'string' ||
            typeof telefono !== 'string' ||
            (codigoPais !== undefined && typeof codigoPais !== 'string')
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

        // Teléfono: obligatorio, solo numérico, longitud válida por país
        const codigoPaisNormalizado = (codigoPais || '+51').trim();
        if (!DIGITOS_POR_PAIS[codigoPaisNormalizado]) {
            return res.status(400).json({ mensaje: 'Código de país no válido.' });
        }
        if (!REGEX_SOLO_NUMEROS.test(telefono.trim())) {
            return res.status(400).json({ mensaje: 'El teléfono solo debe contener números.' });
        }
        const digitosEsperados = DIGITOS_POR_PAIS[codigoPaisNormalizado];
        if (telefono.trim().length !== digitosEsperados) {
            return res.status(400).json({ mensaje: `El teléfono debe tener exactamente ${digitosEsperados} dígitos para el país seleccionado.` });
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

        const telefonoCompleto = codigoPaisNormalizado + telefono.trim();

        const [resultado] = await pool.query(
            'INSERT INTO usuarios (nombre, apellido, email, password, telefono, rol) VALUES (?, ?, ?, ?, ?, ?)',
            [
                nombre.trim(),
                apellido.trim(),
                email.toLowerCase().trim(),
                passwordHash,
                telefonoCompleto,
                'usuario',
            ]
        );

        const { token, jti, expiraEn } = generarToken({ id: resultado.insertId, rol: 'usuario' });
        await registrarSesionDB(resultado.insertId, jti, expiraEn);

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
    const ip = req.ip || 'unknown';

    try {
        const { email, password } = req.body;

        // Validación de tipos para evitar inyección de objetos
        if (typeof email !== 'string' || typeof password !== 'string') {
            return res.status(400).json({ mensaje: 'Credenciales inválidas.' });
        }

        const emailNormalizado = email.trim().toLowerCase();
        const passwordSanitizada = password.trim();

        if (!emailNormalizado || !passwordSanitizada) {
            return res.status(400).json({ mensaje: 'Email y contraseña son requeridos.' });
        }

        // Límites de longitud
        if (emailNormalizado.length > MAX_EMAIL_LENGTH || passwordSanitizada.length > MAX_PASSWORD_LENGTH) {
            return res.status(400).json({ mensaje: 'Credenciales inválidas.' });
        }

        // Validación de formato de email
        if (!REGEX_EMAIL.test(emailNormalizado)) {
            return res.status(400).json({ mensaje: 'Credenciales inválidas.' });
        }

        // Retraso progresivo a partir del 3er intento fallido desde la misma IP
        const datosIP = intentosFallidos.get(ip);
        if (datosIP && datosIP.count >= 3) {
            await new Promise((resolve) => setTimeout(resolve, calcularDelay(datosIP.count)));
        }

        const [usuarios] = await pool.query(
            'SELECT id, nombre, apellido, email, password, rol FROM usuarios WHERE email = ?',
            [emailNormalizado]
        );

        const registrarFallo = () => {
            const datos = intentosFallidos.get(ip) || { count: 0 };
            intentosFallidos.set(ip, { count: datos.count + 1, ultimoIntento: Date.now() });
        };

        if (usuarios.length === 0) {
            registrarFallo();
            return res.status(401).json({ mensaje: 'Credenciales inválidas.' });
        }

        const usuario = usuarios[0];
        const passwordValida = await bcrypt.compare(passwordSanitizada, usuario.password);

        if (!passwordValida) {
            registrarFallo();
            return res.status(401).json({ mensaje: 'Credenciales inválidas.' });
        }

        // Limpiar historial de fallos al autenticarse correctamente
        intentosFallidos.delete(ip);

        const { token, jti, expiraEn } = generarToken({ id: usuario.id, rol: usuario.rol });
        await registrarSesionDB(usuario.id, jti, expiraEn);

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

const cerrarSesion = async (req, res) => {
    try {
        await pool.execute(
            'UPDATE sesiones_activas SET activo = 0 WHERE usuario_id = ? AND activo = 1',
            [req.usuario.id]
        );
        return res.status(200).json({ mensaje: 'Sesión cerrada correctamente.' });
    } catch (error) {
        console.error('Error al cerrar sesión:', error.message);
        return res.status(500).json({ mensaje: 'Error interno del servidor.' });
    }
};

module.exports = { registrar, iniciarSesion, obtenerPerfil, cerrarSesion };
