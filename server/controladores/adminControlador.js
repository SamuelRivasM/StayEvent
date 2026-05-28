const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

const SALT_ROUNDS   = 12;
const REGEX_ESPECIAL = /[$%#]/;

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
        console.error('Error al obtener métricas admin:', error.message);
        res.status(500).json({ mensaje: 'Error al obtener métricas.' });
    }
};

// ─── Gestión de Usuarios ──────────────────────────────────────────────────────

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
        console.error('Error al listar usuarios admin:', error.message);
        res.status(500).json({ mensaje: 'Error al obtener usuarios.' });
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
        console.error('Error al obtener usuario admin:', error.message);
        res.status(500).json({ mensaje: 'Error al obtener usuario.' });
    }
};

// Campos permitidos en edición: nombre, apellido, teléfono, rol y contraseña opcional.
// El email no se modifica desde el panel admin para reducir la superficie de ataque.
const CAMPOS_EDITAR   = new Set(['nombre', 'apellido', 'telefono', 'rol', 'password']);
const ROLES_EDITABLES = new Set(['usuario', 'organizador']);

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
            if (typeof rol !== 'string' || !ROLES_EDITABLES.has(rol)) {
                return res.status(400).json({ mensaje: 'Rol inválido. Solo se permite usuario u organizador.' });
            }
        }

        // Verificar que el objetivo no sea admin (nunca aparece en lista, doble check)
        const [objetivo] = await pool.query('SELECT rol FROM usuarios WHERE id = ?', [id]);
        if (!objetivo.length) return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
        if (objetivo[0].rol === 'admin') {
            return res.status(403).json({ mensaje: 'No se puede modificar un administrador.' });
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
            if (!REGEX_ESPECIAL.test(password)) {
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
        console.error('Error al editar usuario admin:', error.message);
        res.status(500).json({ mensaje: 'Error al actualizar usuario.' });
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
        console.error('Error al listar eventos admin:', error.message);
        res.status(500).json({ mensaje: 'Error al obtener eventos.' });
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
        console.error('Error al obtener evento admin:', error.message);
        res.status(500).json({ mensaje: 'Error al obtener evento.' });
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
        console.error('Error al cambiar estado evento admin:', error.message);
        res.status(500).json({ mensaje: 'Error al cambiar estado del evento.' });
    }
};

module.exports = {
    obtenerMetricas,
    listarUsuarios,
    obtenerUsuario,
    editarUsuario,
    listarEventosAdmin,
    obtenerEventoAdmin,
    cambiarEstadoEvento,
};
