// Operaciones y métricas para el panel de administración

const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { logError } = require('../config/logger');
const {
    SALT_ROUNDS, REGEX_CARACTER_ESPECIAL, ROLES_EDITABLES, ROLES_VALIDOS,
    DIGITOS_POR_PAIS, REGEX_EMAIL, REGEX_SOLO_NUMEROS,
    MAX_EMAIL_LENGTH, MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH,
    MAX_NOMBRE_LENGTH, MIN_NOMBRE_LENGTH,
} = require('../config/constantes');

const ROLES_EDITABLES_SET = new Set(ROLES_EDITABLES);

// ─── Dashboard ────────────────────────────────────────────────────────────────

const obtenerMetricas = async (req, res) => {
    try {
        const [rowsUsuarios] = await pool.query(
            "SELECT COUNT(*) AS total FROM usuarios WHERE rol = 'usuario'"
        );
        const [rowsOrganizadores] = await pool.query(
            "SELECT COUNT(*) AS total FROM usuarios WHERE rol = 'organizador'"
        );
        const [rowsEventosActivos] = await pool.query(
            'SELECT COUNT(*) AS total FROM eventos WHERE activo = 1 AND eliminado = 0'
        );
        const [rowsEventosTotales] = await pool.query(
            'SELECT COUNT(*) AS total FROM eventos WHERE eliminado = 0'
        );
        const [rowsCompras] = await pool.query(
            "SELECT COUNT(*) AS total FROM compras WHERE estado = 'confirmado'"
        );
        const [rowsIngresos] = await pool.query(
            "SELECT COALESCE(SUM(subtotal), 0) AS total FROM compras WHERE estado = 'confirmado'"
        );

        res.json({
            usuarios: {
                total:         Number(rowsUsuarios[0].total),
                organizadores: Number(rowsOrganizadores[0].total),
            },
            eventos: {
                activos: Number(rowsEventosActivos[0].total),
                totales: Number(rowsEventosTotales[0].total),
            },
            compras: {
                total:    Number(rowsCompras[0].total),
                ingresos: parseFloat(rowsIngresos[0].total),
            },
        });
    } catch (error) {
        const idError = logError('Admin.obtenerMetricas', error);
        res.status(500).json({ mensaje: 'Error al obtener métricas.', referencia: idError });
    }
};

// ─── Gestión de Usuarios ──────────────────────────────────────────────────────

const crearUsuarioAdmin = async (req, res) => {
    try {
        const CAMPOS_CREAR = new Set(['nombre', 'apellido', 'email', 'password', 'codigoPais', 'telefono', 'rol']);
        const extras = Object.keys(req.body || {}).filter(c => !CAMPOS_CREAR.has(c));
        if (extras.length) return res.status(400).json({ mensaje: 'Campos no permitidos.' });

        const { nombre, apellido, email, password, codigoPais, telefono, rol } = req.body;

        for (const [campo, val] of Object.entries({ nombre, apellido, email, password, telefono })) {
            if (typeof val !== 'string') {
                return res.status(400).json({ mensaje: `El campo ${campo} debe ser texto.` });
            }
        }

        if (!nombre.trim() || !apellido.trim() || !email.trim() || !password || !telefono.trim()) {
            return res.status(400).json({ mensaje: 'Todos los campos son obligatorios.' });
        }
        if (nombre.trim().length > MAX_NOMBRE_LENGTH || apellido.trim().length > MAX_NOMBRE_LENGTH) {
            return res.status(400).json({ mensaje: `Nombre y apellido no deben superar ${MAX_NOMBRE_LENGTH} caracteres.` });
        }
        if (email.trim().length > MAX_EMAIL_LENGTH) {
            return res.status(400).json({ mensaje: `El email no debe superar ${MAX_EMAIL_LENGTH} caracteres.` });
        }
        if (password.length > MAX_PASSWORD_LENGTH) {
            return res.status(400).json({ mensaje: 'La contraseña no debe exceder 72 caracteres.' });
        }
        if (!REGEX_EMAIL.test(email.trim())) {
            return res.status(400).json({ mensaje: 'Formato de email inválido.' });
        }
        if (nombre.trim().length < MIN_NOMBRE_LENGTH || apellido.trim().length < MIN_NOMBRE_LENGTH) {
            return res.status(400).json({ mensaje: 'Nombre y apellido deben tener al menos 2 caracteres.' });
        }
        if (password.length < MIN_PASSWORD_LENGTH) {
            return res.status(400).json({ mensaje: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.` });
        }
        if (!REGEX_CARACTER_ESPECIAL.test(password)) {
            return res.status(400).json({ mensaje: 'La contraseña debe contener al menos un carácter especial ($, %, #).' });
        }

        const codigoPaisNorm = (typeof codigoPais === 'string' && codigoPais.trim()) ? codigoPais.trim() : '+51';
        if (!DIGITOS_POR_PAIS[codigoPaisNorm]) {
            return res.status(400).json({ mensaje: 'Código de país no reconocido.' });
        }
        if (!REGEX_SOLO_NUMEROS.test(telefono.trim())) {
            return res.status(400).json({ mensaje: 'El teléfono debe contener solo dígitos.' });
        }
        const digitosEsperados = DIGITOS_POR_PAIS[codigoPaisNorm];
        if (telefono.trim().length !== digitosEsperados) {
            return res.status(400).json({
                mensaje: `El teléfono debe tener exactamente ${digitosEsperados} dígitos para el país seleccionado.`,
            });
        }

        const rolNorm = (typeof rol === 'string' && rol.trim()) ? rol.trim().toLowerCase() : 'usuario';
        if (!ROLES_VALIDOS.includes(rolNorm)) {
            return res.status(400).json({ mensaje: 'Rol inválido.' });
        }

        const [existe] = await pool.query('SELECT id FROM usuarios WHERE email = ?', [email.toLowerCase().trim()]);
        if (existe.length) return res.status(409).json({ mensaje: 'Ya existe un usuario con ese email.' });

        const passwordHash    = await bcrypt.hash(password, SALT_ROUNDS);
        const telefonoCompleto = codigoPaisNorm + telefono.trim();

        const [result] = await pool.execute(
            'INSERT INTO usuarios (nombre, apellido, email, password, telefono, rol) VALUES (?, ?, ?, ?, ?, ?)',
            [nombre.trim(), apellido.trim(), email.toLowerCase().trim(), passwordHash, telefonoCompleto, rolNorm]
        );

        res.status(201).json({
            mensaje: 'Usuario creado correctamente.',
            usuario: {
                id:       result.insertId,
                nombre:   nombre.trim(),
                apellido: apellido.trim(),
                email:    email.toLowerCase().trim(),
                telefono: telefonoCompleto,
                rol:      rolNorm,
            },
        });
    } catch (error) {
        const idError = logError('Admin.crearUsuarioAdmin', error);
        res.status(500).json({ mensaje: 'Error al crear usuario.', referencia: idError });
    }
};

const listarUsuarios = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT
                u.id, u.nombre, u.apellido, u.email, u.telefono, u.rol, u.created_at,
                COUNT(c.id) AS total_compras
            FROM usuarios u
            LEFT JOIN compras c ON c.usuario_id = u.id AND c.estado = 'confirmado'
            GROUP BY u.id
            ORDER BY u.created_at DESC
        `);
        res.json({ usuarios: rows });
    } catch (error) {
        const idError = logError('Admin.listarUsuarios', error);
        res.status(500).json({ mensaje: 'Error al obtener usuarios.', referencia: idError });
    }
};

const obtenerUsuario = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ mensaje: 'ID inválido.' });

        const [rows] = await pool.query(`
            SELECT
                u.id, u.nombre, u.apellido, u.email, u.telefono, u.rol, u.created_at,
                COUNT(c.id) AS total_compras
            FROM usuarios u
            LEFT JOIN compras c ON c.usuario_id = u.id AND c.estado = 'confirmado'
            WHERE u.id = ?
            GROUP BY u.id
        `, [id]);

        if (!rows.length) return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
        res.json({ usuario: rows[0] });
    } catch (error) {
        const idError = logError('Admin.obtenerUsuario', error);
        res.status(500).json({ mensaje: 'Error al obtener usuario.', referencia: idError });
    }
};

// Campos permitidos en edición: nombre, apellido, teléfono, rol y contraseña opcional.
// El email no se modifica desde el panel admin para reducir la superficie de ataque.
const CAMPOS_EDITAR   = new Set(['nombre', 'apellido', 'telefono', 'rol', 'password']);

const editarUsuario = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ mensaje: 'ID inválido.' });

        const extras = Object.keys(req.body || {}).filter(c => !CAMPOS_EDITAR.has(c));
        if (extras.length) return res.status(400).json({ mensaje: 'Campos no permitidos.' });

        const { nombre, apellido, telefono, rol, password } = req.body;

        if (typeof nombre !== 'string' || typeof apellido !== 'string' || typeof telefono !== 'string') {
            return res.status(400).json({ mensaje: 'Tipos de datos inválidos.' });
        }
        if (!nombre.trim() || !apellido.trim() || !telefono.trim()) {
            return res.status(400).json({ mensaje: 'Nombre, apellido y teléfono son obligatorios.' });
        }
        if (nombre.trim().length < 2 || apellido.trim().length < 2) {
            return res.status(400).json({ mensaje: 'Nombre y apellido deben tener al menos 2 caracteres.' });
        }
        if (nombre.trim().length > 50 || apellido.trim().length > 50) {
            return res.status(400).json({ mensaje: 'Nombre y apellido no deben exceder 50 caracteres.' });
        }
        if (telefono.trim().length > 20) {
            return res.status(400).json({ mensaje: 'El teléfono no debe exceder 20 caracteres.' });
        }

        if (rol !== undefined) {
            if (typeof rol !== 'string' || !ROLES_VALIDOS.includes(rol)) {
                return res.status(400).json({ mensaje: 'Rol inválido.' });
            }
        }

        const [objetivo] = await pool.query('SELECT id, rol FROM usuarios WHERE id = ?', [id]);
        if (!objetivo.length) return res.status(404).json({ mensaje: 'Usuario no encontrado.' });

        // Validaciones de seguridad sobre cambio de rol
        if (rol !== undefined && rol !== objetivo[0].rol) {
            // Un admin no puede quitarse a sí mismo el rol de administrador
            if (id === req.usuario.id && rol !== 'admin') {
                return res.status(403).json({ mensaje: 'No puedes cambiar tu propio rol a uno distinto de administrador.' });
            }
            // No se puede degradar al único administrador del sistema
            if (objetivo[0].rol === 'admin' && rol !== 'admin') {
                const [rowsAdmin] = await pool.query("SELECT COUNT(*) AS total FROM usuarios WHERE rol = 'admin'");
                if (Number(rowsAdmin[0].total) <= 1) {
                    return res.status(403).json({ mensaje: 'No se puede cambiar el rol del único administrador del sistema.' });
                }
            }
        }

        const campos  = ['nombre = ?', 'apellido = ?', 'telefono = ?'];
        const valores = [nombre.trim(), apellido.trim(), telefono.trim()];

        if (rol !== undefined) {
            campos.push('rol = ?');
            valores.push(rol);
        }

        if (password !== undefined && password !== '') {
            if (typeof password !== 'string') {
                return res.status(400).json({ mensaje: 'Tipo de contraseña inválido.' });
            }
            if (password.length < 8) {
                return res.status(400).json({ mensaje: 'La contraseña debe tener al menos 8 caracteres.' });
            }
            if (password.length > 72) {
                return res.status(400).json({ mensaje: 'La contraseña no debe exceder 72 caracteres.' });
            }
            if (!REGEX_CARACTER_ESPECIAL.test(password)) {
                return res.status(400).json({
                    mensaje: 'La contraseña debe contener al menos un carácter especial ($, %, #).',
                });
            }
            const hash = await bcrypt.hash(password, SALT_ROUNDS);
            campos.push('password = ?');
            valores.push(hash);
        }

        valores.push(id);
        await pool.execute(`UPDATE usuarios SET ${campos.join(', ')} WHERE id = ?`, valores);

        res.json({ mensaje: 'Usuario actualizado correctamente.' });
    } catch (error) {
        const idError = logError('Admin.editarUsuario', error);
        res.status(500).json({ mensaje: 'Error al actualizar usuario.', referencia: idError });
    }
};

const eliminarUsuario = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ mensaje: 'ID inválido.' });

        // Un admin no puede eliminar su propia cuenta
        if (id === req.usuario.id) {
            return res.status(403).json({ mensaje: 'No puedes eliminar tu propia cuenta.' });
        }

        const [rows] = await pool.query('SELECT id, rol FROM usuarios WHERE id = ?', [id]);
        if (!rows.length) return res.status(404).json({ mensaje: 'Usuario no encontrado.' });

        // No se puede eliminar al único administrador del sistema
        if (rows[0].rol === 'admin') {
            const [rowsAdmin] = await pool.query("SELECT COUNT(*) AS total FROM usuarios WHERE rol = 'admin'");
            if (Number(rowsAdmin[0].total) <= 1) {
                return res.status(403).json({ mensaje: 'No se puede eliminar al único administrador del sistema.' });
            }
        }

        await pool.execute('DELETE FROM usuarios WHERE id = ?', [id]);
        res.json({ mensaje: 'Usuario eliminado correctamente.' });
    } catch (error) {
        const idError = logError('Admin.eliminarUsuario', error);
        res.status(500).json({ mensaje: 'Error al eliminar usuario.', referencia: idError });
    }
};

// ─── Gestión de Eventos ────────────────────────────────────────────────────────

const listarEventosAdmin = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT
                e.id, e.titulo, e.descripcion, e.categoria, e.fecha, e.hora,
                e.distrito, e.lugar, e.direccion, e.imagen_url, e.imagen_mapa,
                e.activo, e.created_at,
                u.nombre  AS org_nombre,
                u.apellido AS org_apellido,
                u.email   AS org_email,
                (SELECT COUNT(*) FROM compras c
                 WHERE c.evento_id = e.id AND c.estado = 'confirmado') AS total_compras
            FROM eventos e
            LEFT JOIN usuarios u ON u.id = e.organizador_id
            WHERE e.eliminado = 0
            ORDER BY e.created_at DESC
        `);
        res.json({ eventos: rows });
    } catch (error) {
        const idError = logError('Admin.listarEventosAdmin', error);
        res.status(500).json({ mensaje: 'Error al obtener eventos.', referencia: idError });
    }
};

const obtenerEventoAdmin = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ mensaje: 'ID inválido.' });

        const [rows] = await pool.query(`
            SELECT
                e.id, e.titulo, e.descripcion, e.categoria, e.fecha, e.hora,
                e.distrito, e.lugar, e.direccion, e.imagen_url, e.imagen_mapa,
                e.activo, e.created_at,
                u.nombre  AS org_nombre,
                u.apellido AS org_apellido,
                u.email   AS org_email,
                (SELECT COUNT(*) FROM compras c
                 WHERE c.evento_id = e.id AND c.estado = 'confirmado') AS total_compras
            FROM eventos e
            LEFT JOIN usuarios u ON u.id = e.organizador_id
            WHERE e.id = ? AND e.eliminado = 0
        `, [id]);

        if (!rows.length) return res.status(404).json({ mensaje: 'Evento no encontrado.' });
        res.json({ evento: rows[0] });
    } catch (error) {
        const idError = logError('Admin.obtenerEventoAdmin', error);
        res.status(500).json({ mensaje: 'Error al obtener evento.', referencia: idError });
    }
};

const cambiarEstadoEvento = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ mensaje: 'ID inválido.' });

        const [rows] = await pool.query(
            'SELECT id, activo FROM eventos WHERE id = ? AND eliminado = 0',
            [id]
        );
        if (!rows.length) return res.status(404).json({ mensaje: 'Evento no encontrado.' });

        const nuevoEstado = rows[0].activo ? 0 : 1;
        await pool.execute('UPDATE eventos SET activo = ? WHERE id = ?', [nuevoEstado, id]);

        res.json({
            mensaje: nuevoEstado ? 'Evento reactivado.' : 'Evento desactivado.',
            activo:  nuevoEstado,
        });
    } catch (error) {
        const idError = logError('Admin.cambiarEstadoEvento', error);
        res.status(500).json({ mensaje: 'Error al cambiar estado del evento.', referencia: idError });
    }
};

module.exports = {
    obtenerMetricas,
    crearUsuarioAdmin,
    listarUsuarios,
    obtenerUsuario,
    editarUsuario,
    eliminarUsuario,
    listarEventosAdmin,
    obtenerEventoAdmin,
    cambiarEstadoEvento,
};
