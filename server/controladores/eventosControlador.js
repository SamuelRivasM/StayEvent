const { pool } = require('../config/db');

const CATEGORIAS_VALIDAS = new Set(['Conciertos', 'Festivales', 'Fiestas / Discoteca']);

const sanitizarTexto = (str, max) => {
    if (typeof str !== 'string') return null;
    const t = str.trim();
    return t.length <= max ? t : null;
};

// GET /api/eventos — público
const obtenerEventos = async (req, res) => {
    try {
        const { categoria, distrito, precio_max, busqueda } = req.query;

        let query = `
            SELECT id, titulo, descripcion, categoria, fecha, hora,
                   distrito, lugar, precio, imagen_url
            FROM eventos
            WHERE activo = 1 AND eliminado = 0
        `;
        const params = [];

        if (categoria) { query += ' AND categoria = ?'; params.push(categoria); }
        if (distrito) { query += ' AND distrito = ?'; params.push(distrito); }
        if (precio_max !== undefined && precio_max !== '') {
            query += ' AND precio <= ?';
            params.push(Number(precio_max));
        }
        if (busqueda) { query += ' AND titulo LIKE ?'; params.push(`%${busqueda}%`); }

        query += ' ORDER BY fecha ASC';

        const [eventos] = await pool.query(query, params);
        res.json({ eventos });
    } catch (error) {
        console.error('Error al obtener eventos:', error);
        res.status(500).json({ mensaje: 'Error interno del servidor.' });
    }
};

// GET /api/eventos/estadisticas — organizador autenticado
const obtenerEstadisticas = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT
                COUNT(*) AS total,
                SUM(activo = 1) AS activos,
                SUM(activo = 0) AS inactivos,
                SUM(fecha >= CURDATE() AND activo = 1) AS proximos,
                COALESCE(SUM(stock), 0) AS stock_total
             FROM eventos
             WHERE organizador_id = ? AND eliminado = 0`,
            [req.usuario.id]
        );
        res.json({ estadisticas: rows[0] });
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({ mensaje: 'Error interno del servidor.' });
    }
};

// GET /api/eventos/mis-eventos — organizador autenticado
const obtenerEventosOrganizador = async (req, res) => {
    try {
        const [eventos] = await pool.query(
            `SELECT id, titulo, descripcion, categoria, fecha, hora, distrito, lugar,
                    precio, imagen_url, stock, activo, created_at
             FROM eventos
             WHERE organizador_id = ? AND eliminado = 0
             ORDER BY fecha DESC`,
            [req.usuario.id]
        );
        res.json({ eventos });
    } catch (error) {
        console.error('Error al obtener eventos del organizador:', error);
        res.status(500).json({ mensaje: 'Error interno del servidor.' });
    }
};

// POST /api/eventos — organizador
const crearEvento = async (req, res) => {
    try {
        const { titulo, descripcion, categoria, fecha, hora, distrito, lugar, precio, imagen_url, stock } = req.body;

        if (!titulo || !categoria || !fecha || !hora || !lugar || precio === undefined) {
            return res.status(400).json({ mensaje: 'Título, categoría, fecha, hora, lugar y precio son obligatorios.' });
        }
        if (!CATEGORIAS_VALIDAS.has(categoria)) {
            return res.status(400).json({ mensaje: 'Categoría no válida.' });
        }

        const tituloSanitizado = sanitizarTexto(titulo, 150);
        const lugarSanitizado = sanitizarTexto(lugar, 200);
        const distritoSanitizado = sanitizarTexto(distrito || '', 100);
        const descripcionSanitizada = sanitizarTexto(descripcion || '', 2000);
        const imagenSanitizada = sanitizarTexto(imagen_url || '', 500);

        if (!tituloSanitizado || !lugarSanitizado) {
            return res.status(400).json({ mensaje: 'Título y lugar son requeridos.' });
        }

        const precioNum = parseFloat(precio);
        const stockNum = parseInt(stock || 0, 10);

        if (isNaN(precioNum) || precioNum < 0) {
            return res.status(400).json({ mensaje: 'El precio debe ser un número positivo.' });
        }
        if (isNaN(stockNum) || stockNum < 0) {
            return res.status(400).json({ mensaje: 'El stock debe ser un número positivo.' });
        }

        const [resultado] = await pool.query(
            `INSERT INTO eventos
                (titulo, descripcion, categoria, fecha, hora, distrito, lugar, precio, imagen_url, stock, organizador_id, activo, eliminado)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0)`,
            [tituloSanitizado, descripcionSanitizada, categoria, fecha, hora, distritoSanitizado || null, lugarSanitizado, precioNum, imagenSanitizada || null, stockNum, req.usuario.id]
        );

        res.status(201).json({ mensaje: 'Evento creado correctamente.', id: resultado.insertId });
    } catch (error) {
        console.error('Error al crear evento:', error);
        res.status(500).json({ mensaje: 'Error interno del servidor.' });
    }
};

// PUT /api/eventos/:id — organizador (solo sus eventos)
const actualizarEvento = async (req, res) => {
    try {
        const eventoId = parseInt(req.params.id, 10);
        if (!Number.isInteger(eventoId) || eventoId <= 0) {
            return res.status(400).json({ mensaje: 'ID de evento inválido.' });
        }

        const [filas] = await pool.query(
            'SELECT id FROM eventos WHERE id = ? AND organizador_id = ? AND eliminado = 0',
            [eventoId, req.usuario.id]
        );
        if (filas.length === 0) {
            return res.status(404).json({ mensaje: 'Evento no encontrado.' });
        }

        const { titulo, descripcion, categoria, fecha, hora, distrito, lugar, precio, imagen_url, stock } = req.body;

        if (!titulo || !categoria || !fecha || !hora || !lugar || precio === undefined) {
            return res.status(400).json({ mensaje: 'Título, categoría, fecha, hora, lugar y precio son obligatorios.' });
        }
        if (!CATEGORIAS_VALIDAS.has(categoria)) {
            return res.status(400).json({ mensaje: 'Categoría no válida.' });
        }

        const tituloSanitizado = sanitizarTexto(titulo, 150);
        const lugarSanitizado = sanitizarTexto(lugar, 200);
        const distritoSanitizado = sanitizarTexto(distrito || '', 100);
        const descripcionSanitizada = sanitizarTexto(descripcion || '', 2000);
        const imagenSanitizada = sanitizarTexto(imagen_url || '', 500);
        const precioNum = parseFloat(precio);
        const stockNum = parseInt(stock || 0, 10);

        if (!tituloSanitizado || !lugarSanitizado) {
            return res.status(400).json({ mensaje: 'Título y lugar son requeridos.' });
        }
        if (isNaN(precioNum) || precioNum < 0) {
            return res.status(400).json({ mensaje: 'El precio debe ser un número positivo.' });
        }
        if (isNaN(stockNum) || stockNum < 0) {
            return res.status(400).json({ mensaje: 'El stock debe ser un número positivo.' });
        }

        await pool.query(
            `UPDATE eventos
             SET titulo = ?, descripcion = ?, categoria = ?, fecha = ?, hora = ?,
                 distrito = ?, lugar = ?, precio = ?, imagen_url = ?, stock = ?
             WHERE id = ? AND organizador_id = ?`,
            [tituloSanitizado, descripcionSanitizada, categoria, fecha, hora, distritoSanitizado || null, lugarSanitizado, precioNum, imagenSanitizada || null, stockNum, eventoId, req.usuario.id]
        );

        res.json({ mensaje: 'Evento actualizado correctamente.' });
    } catch (error) {
        console.error('Error al actualizar evento:', error);
        res.status(500).json({ mensaje: 'Error interno del servidor.' });
    }
};

// PATCH /api/eventos/:id/estado — toggle activo/inactivo
const cambiarEstadoEvento = async (req, res) => {
    try {
        const eventoId = parseInt(req.params.id, 10);
        if (!Number.isInteger(eventoId) || eventoId <= 0) {
            return res.status(400).json({ mensaje: 'ID de evento inválido.' });
        }

        const [filas] = await pool.query(
            'SELECT id, activo FROM eventos WHERE id = ? AND organizador_id = ? AND eliminado = 0',
            [eventoId, req.usuario.id]
        );
        if (filas.length === 0) {
            return res.status(404).json({ mensaje: 'Evento no encontrado.' });
        }

        const nuevoEstado = filas[0].activo ? 0 : 1;
        await pool.query(
            'UPDATE eventos SET activo = ? WHERE id = ? AND organizador_id = ?',
            [nuevoEstado, eventoId, req.usuario.id]
        );

        res.json({ mensaje: `Evento ${nuevoEstado ? 'activado' : 'desactivado'} correctamente.`, activo: nuevoEstado });
    } catch (error) {
        console.error('Error al cambiar estado del evento:', error);
        res.status(500).json({ mensaje: 'Error interno del servidor.' });
    }
};

// DELETE /api/eventos/:id — soft delete
const eliminarEvento = async (req, res) => {
    try {
        const eventoId = parseInt(req.params.id, 10);
        if (!Number.isInteger(eventoId) || eventoId <= 0) {
            return res.status(400).json({ mensaje: 'ID de evento inválido.' });
        }

        const [filas] = await pool.query(
            'SELECT id FROM eventos WHERE id = ? AND organizador_id = ? AND eliminado = 0',
            [eventoId, req.usuario.id]
        );
        if (filas.length === 0) {
            return res.status(404).json({ mensaje: 'Evento no encontrado.' });
        }

        await pool.query(
            'UPDATE eventos SET activo = 0, eliminado = 1 WHERE id = ? AND organizador_id = ?',
            [eventoId, req.usuario.id]
        );

        res.json({ mensaje: 'Evento eliminado correctamente.' });
    } catch (error) {
        console.error('Error al eliminar evento:', error);
        res.status(500).json({ mensaje: 'Error interno del servidor.' });
    }
};

module.exports = {
    obtenerEventos,
    obtenerEstadisticas,
    obtenerEventosOrganizador,
    crearEvento,
    actualizarEvento,
    cambiarEstadoEvento,
    eliminarEvento,
};
