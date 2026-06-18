// Operaciones del perfil de usuarios

const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { logError } = require('../config/logger');
const {
    SALT_ROUNDS,
    REGEX_EMAIL,
    REGEX_CARACTER_ESPECIAL,
    REGEX_SOLO_NUMEROS,
    DIGITOS_POR_PAIS,
    MAX_EMAIL_LENGTH,
    MAX_PASSWORD_LENGTH,
    MIN_PASSWORD_LENGTH,
    MAX_NOMBRE_LENGTH,
    MIN_NOMBRE_LENGTH,
} = require('../config/constantes');

const CAMPOS_PERMITIDOS = new Set([
    'nombre', 'apellido', 'email', 'codigoPais', 'telefono',
    'passwordActual', 'passwordNueva', 'confirmarPassword',
]);

const actualizarPerfil = async (req, res) => {
    try {
        const usuarioId = req.usuario.id;

        const camposExtras = Object.keys(req.body || {}).filter(c => !CAMPOS_PERMITIDOS.has(c));
        if (camposExtras.length > 0) {
            return res.status(400).json({ mensaje: 'Campos no permitidos.' });
        }

        const { nombre, apellido, email, codigoPais, telefono, passwordActual, passwordNueva, confirmarPassword } = req.body;

        if (typeof nombre !== 'string' || typeof apellido !== 'string' || typeof email !== 'string') {
            return res.status(400).json({ mensaje: 'Tipos de datos inválidos.' });
        }

        if (!nombre.trim() || !apellido.trim() || !email.trim()) {
            return res.status(400).json({ mensaje: 'Nombre, apellido y email son obligatorios.' });
        }
        if (nombre.trim().length < 2 || apellido.trim().length < 2) {
            return res.status(400).json({ mensaje: 'Nombre y apellido deben tener al menos 2 caracteres.' });
        }
        if (nombre.trim().length > 50 || apellido.trim().length > 50) {
            return res.status(400).json({ mensaje: 'Nombre y apellido no deben exceder 50 caracteres.' });
        }
        if (email.trim().length > 100) {
            return res.status(400).json({ mensaje: 'El email no debe exceder 100 caracteres.' });
        }
        if (!REGEX_EMAIL.test(email.trim())) {
            return res.status(400).json({ mensaje: 'Formato de email inválido.' });
        }

        if (typeof telefono !== 'string' || typeof codigoPais !== 'string') {
            return res.status(400).json({ mensaje: 'Tipos de datos inválidos.' });
        }
        if (!telefono.trim()) {
            return res.status(400).json({ mensaje: 'El teléfono es obligatorio.' });
        }
        const codigoPaisNorm = codigoPais.trim();
        if (!DIGITOS_POR_PAIS[codigoPaisNorm]) {
            return res.status(400).json({ mensaje: 'Código de país no válido.' });
        }
        if (!REGEX_SOLO_NUMEROS.test(telefono.trim())) {
            return res.status(400).json({ mensaje: 'El teléfono solo debe contener números.' });
        }
        const digitosEsperados = DIGITOS_POR_PAIS[codigoPaisNorm];
        if (telefono.trim().length !== digitosEsperados) {
            return res.status(400).json({
                mensaje: `El teléfono debe tener exactamente ${digitosEsperados} dígitos para el país seleccionado.`,
            });
        }
        const telefonoCompleto = codigoPaisNorm + telefono.trim();

        const [usuarios] = await pool.query(
            'SELECT id, nombre, apellido, email, telefono, password FROM usuarios WHERE id = ?',
            [usuarioId]
        );
        if (usuarios.length === 0) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
        }
        const usuarioActual = usuarios[0];

        const emailNorm = email.trim().toLowerCase();
        if (emailNorm !== usuarioActual.email) {
            const [existente] = await pool.query(
                'SELECT id FROM usuarios WHERE email = ? AND id != ?',
                [emailNorm, usuarioId]
            );
            if (existente.length > 0) {
                return res.status(409).json({ mensaje: 'El email ya está registrado por otro usuario.' });
            }
        }

        let passwordHash = null;
        const cambiaPassword = passwordActual || passwordNueva || confirmarPassword;
        if (cambiaPassword) {
            if (
                typeof passwordActual !== 'string' ||
                typeof passwordNueva !== 'string' ||
                typeof confirmarPassword !== 'string'
            ) {
                return res.status(400).json({ mensaje: 'Tipos de datos inválidos en contraseña.' });
            }
            if (!passwordActual || !passwordNueva || !confirmarPassword) {
                return res.status(400).json({
                    mensaje: 'Para cambiar la contraseña debes completar todos los campos de contraseña.',
                });
            }
            if (passwordNueva !== confirmarPassword) {
                return res.status(400).json({ mensaje: 'La nueva contraseña y su confirmación no coinciden.' });
            }
            if (passwordNueva.length < 8) {
                return res.status(400).json({ mensaje: 'La nueva contraseña debe tener al menos 8 caracteres.' });
            }
            if (passwordNueva.length > 72) {
                return res.status(400).json({ mensaje: 'La contraseña no debe exceder 72 caracteres.' });
            }
            if (!REGEX_CARACTER_ESPECIAL.test(passwordNueva)) {
                return res.status(400).json({
                    mensaje: 'La nueva contraseña debe contener al menos un carácter especial ($, %, #).',
                });
            }

            const passwordValida = await bcrypt.compare(passwordActual, usuarioActual.password);
            if (!passwordValida) {
                return res.status(400).json({ mensaje: 'La contraseña actual es incorrecta.' });
            }

            passwordHash = await bcrypt.hash(passwordNueva, SALT_ROUNDS);
        }

        const campos = ['nombre = ?', 'apellido = ?', 'email = ?', 'telefono = ?'];
        const valores = [nombre.trim(), apellido.trim(), emailNorm, telefonoCompleto];

        if (passwordHash) {
            campos.push('password = ?');
            valores.push(passwordHash);
        }

        valores.push(usuarioId);
        await pool.execute(
            `UPDATE usuarios SET ${campos.join(', ')} WHERE id = ?`,
            valores
        );

        return res.status(200).json({
            mensaje: 'Perfil actualizado correctamente.',
            usuario: {
                id: usuarioId,
                nombre: nombre.trim(),
                apellido: apellido.trim(),
                email: emailNorm,
            },
        });
    } catch (error) {
        const idError = logError('Usuarios.actualizarPerfil', error);
        return res.status(500).json({ mensaje: 'Error interno del servidor.', referencia: idError });
    }
};

module.exports = { actualizarPerfil };
