const { pool } = require('../config/db');

const CATEGORIAS_VALIDAS = new Set(['Conciertos', 'Festivales', 'Fiestas / Discoteca']);

const sanitizarTexto = (str, max) => {
    if (typeof str !== 'string') return null;
    const t = str.trim();
    return t.length <= max ? t : null;
};

const esFechaValida = (fecha) => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const f = new Date(fecha + 'T00:00:00');
    return !isNaN(f.getTime()) && f >= hoy;
};

const validarZonas = (zonas) => {
    if (!Array.isArray(zonas) || zonas.length === 0) return null;
    if (zonas.length > 5) return 'El evento puede tener máximo 5 zonas.';
    for (const z of zonas) {
        if (!z || typeof z !== 'object') return 'Formato de zona inválido.';
        const nombre = sanitizarTexto(String(z.nombre ?? ''), 50);
        if (!nombre) return 'Cada zona debe tener un nombre válido (máx. 50 caracteres).';
        const precio = parseFloat(z.precio);
        const stock = parseInt(z.stock ?? 0, 10);
        if (isNaN(precio) || precio < 0) return 'El precio de cada zona debe ser un número no negativo.';
        if (isNaN(stock) || stock < 0) return 'La capacidad de cada zona debe ser un número no negativo.';
    }
    return null;
};

const insertarZonas = async (eventoId, zonas) => {
    if (!Array.isArray(zonas) || zonas.length === 0) return;
    const values = zonas.map(z => [
        eventoId,
        sanitizarTexto(String(z.nombre), 50),
        parseFloat(z.precio),
        parseInt(z.stock ?? 0, 10),
    ]);
    await pool.query(
        'INSERT INTO zonas_evento (evento_id, nombre, precio, stock) VALUES ?',
        [values]
    );
};

// GET /api/eventos — público
const obtenerEventos = async (req, res) => {
    try {
        const { categoria, distrito, busqueda } = req.query;

        let query = `
            SELECT e.id, e.titulo, e.descripcion, e.categoria, e.fecha, e.hora,
                   e.distrito, e.lugar, e.imagen_url,
                   (SELECT MIN(z.precio) FROM zonas_evento z WHERE z.evento_id = e.id AND z.activo = 1) AS precio_min
            FROM eventos e
            WHERE e.activo = 1 AND e.eliminado = 0
        `;
        const params = [];

        if (categoria) { query += ' AND e.categoria = ?'; params.push(categoria); }
        if (distrito) { query += ' AND e.distrito = ?'; params.push(distrito); }
        if (busqueda) { query += ' AND e.titulo LIKE ?'; params.push(`%${busqueda}%`); }

        query += ' ORDER BY e.fecha ASC';

        const [eventos] = await pool.query(query, params);
        res.json({ eventos });
    } catch (error) {
        console.error('Error al obtener eventos:', error);
        res.status(500).json({ mensaje: 'Error interno del servidor.' });
    }
};

// GET /api/eventos/:id/detalle — público
const obtenerDetalleEvento = async (req, res) => {
    try {
        const eventoId = parseInt(req.params.id, 10);
        if (!Number.isInteger(eventoId) || eventoId <= 0) {
            return res.status(400).json({ mensaje: 'ID de evento inválido.' });
        }

        const [eventos] = await pool.query(
            `SELECT id, titulo, descripcion, categoria, fecha, hora,
                    distrito, lugar, direccion, imagen_url, imagen_mapa
             FROM eventos
             WHERE id = ? AND activo = 1 AND eliminado = 0`,
            [eventoId]
        );

        if (eventos.length === 0) {
            return res.status(404).json({ mensaje: 'Evento no encontrado.' });
        }

        const [zonas] = await pool.query(
            `SELECT id, nombre, precio, stock
             FROM zonas_evento
             WHERE evento_id = ? AND activo = 1
             ORDER BY precio ASC`,
            [eventoId]
        );

        res.json({ evento: eventos[0], zonas });
    } catch (error) {
        console.error('Error al obtener detalle del evento:', error);
        res.status(500).json({ mensaje: 'Error interno del servidor.' });
    }
};

// GET /api/eventos/estadisticas — organizador autenticado
const obtenerEstadisticas = async (req, res) => {
    try {
        const [statsRows] = await pool.query(
            `SELECT COUNT(*) AS total,
                    SUM(activo = 1) AS activos,
                    SUM(activo = 0) AS inactivos,
                    SUM(fecha >= CURDATE() AND activo = 1) AS proximos
             FROM eventos
             WHERE organizador_id = ? AND eliminado = 0`,
            [req.usuario.id]
        );
        const [stockRows] = await pool.query(
            `SELECT COALESCE(SUM(z.stock), 0) AS stock_total
             FROM zonas_evento z
             JOIN eventos e ON z.evento_id = e.id
             WHERE e.organizador_id = ? AND e.eliminado = 0 AND z.activo = 1`,
            [req.usuario.id]
        );
        res.json({ estadisticas: { ...statsRows[0], stock_total: stockRows[0].stock_total } });
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
                    imagen_url, imagen_mapa, activo, created_at
             FROM eventos
             WHERE organizador_id = ? AND eliminado = 0
             ORDER BY fecha DESC`,
            [req.usuario.id]
        );

        if (eventos.length > 0) {
            const ids = eventos.map(e => e.id);
            const [zonas] = await pool.query(
                'SELECT id, evento_id, nombre, precio, stock FROM zonas_evento WHERE evento_id IN (?) AND activo = 1 ORDER BY id ASC',
                [ids]
            );
            const zonasPorEvento = {};
            for (const z of zonas) {
                if (!zonasPorEvento[z.evento_id]) zonasPorEvento[z.evento_id] = [];
                zonasPorEvento[z.evento_id].push({ id: z.id, nombre: z.nombre, precio: z.precio, stock: z.stock });
            }
            eventos.forEach(e => { e.zonas = zonasPorEvento[e.id] || []; });
        }

        res.json({ eventos });
    } catch (error) {
        console.error('Error al obtener eventos del organizador:', error);
        res.status(500).json({ mensaje: 'Error interno del servidor.' });
    }
};

// POST /api/eventos — organizador
const crearEvento = async (req, res) => {
    try {
        const { titulo, descripcion, categoria, fecha, hora, distrito, lugar, imagen_url, imagen_mapa, zonas } = req.body;

        if (!titulo || !categoria || !fecha || !hora || !lugar) {
            return res.status(400).json({ mensaje: 'Título, categoría, fecha, hora y lugar son obligatorios.' });
        }
        if (!CATEGORIAS_VALIDAS.has(categoria)) {
            return res.status(400).json({ mensaje: 'Categoría no válida.' });
        }
        if (!esFechaValida(fecha)) {
            return res.status(400).json({ mensaje: 'La fecha del evento no puede ser anterior a hoy.' });
        }

        const errorZonas = validarZonas(zonas);
        if (errorZonas) return res.status(400).json({ mensaje: errorZonas });

        const tituloSanitizado = sanitizarTexto(titulo, 200);
        const lugarSanitizado = sanitizarTexto(lugar, 200);
        const distritoSanitizado = sanitizarTexto(distrito || '', 100);
        const descripcionSanitizada = sanitizarTexto(descripcion || '', 2000);
        const imagenSanitizada = sanitizarTexto(imagen_url || '', 500);
        const imagenMapaSanitizada = sanitizarTexto(imagen_mapa || '', 500);

        if (!tituloSanitizado || !lugarSanitizado) {
            return res.status(400).json({ mensaje: 'Título y lugar son requeridos.' });
        }

        const [resultado] = await pool.query(
            `INSERT INTO eventos
                (titulo, descripcion, categoria, fecha, hora, distrito, lugar, imagen_url, imagen_mapa, organizador_id, activo, eliminado)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0)`,
            [tituloSanitizado, descripcionSanitizada, categoria, fecha, hora, distritoSanitizado || null, lugarSanitizado, imagenSanitizada || null, imagenMapaSanitizada || null, req.usuario.id]
        );

        await insertarZonas(resultado.insertId, zonas);

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

        const { titulo, descripcion, categoria, fecha, hora, distrito, lugar, imagen_url, imagen_mapa, zonas } = req.body;

        if (!titulo || !categoria || !fecha || !hora || !lugar) {
            return res.status(400).json({ mensaje: 'Título, categoría, fecha, hora y lugar son obligatorios.' });
        }
        if (!CATEGORIAS_VALIDAS.has(categoria)) {
            return res.status(400).json({ mensaje: 'Categoría no válida.' });
        }
        if (!esFechaValida(fecha)) {
            return res.status(400).json({ mensaje: 'La fecha del evento no puede ser anterior a hoy.' });
        }

        const errorZonas = validarZonas(zonas);
        if (errorZonas) return res.status(400).json({ mensaje: errorZonas });

        const tituloSanitizado = sanitizarTexto(titulo, 200);
        const lugarSanitizado = sanitizarTexto(lugar, 200);
        const distritoSanitizado = sanitizarTexto(distrito || '', 100);
        const descripcionSanitizada = sanitizarTexto(descripcion || '', 2000);
        const imagenSanitizada = sanitizarTexto(imagen_url || '', 500);
        const imagenMapaSanitizada = sanitizarTexto(imagen_mapa || '', 500);

        if (!tituloSanitizado || !lugarSanitizado) {
            return res.status(400).json({ mensaje: 'Título y lugar son requeridos.' });
        }

        await pool.query(
            `UPDATE eventos
             SET titulo = ?, descripcion = ?, categoria = ?, fecha = ?, hora = ?,
                 distrito = ?, lugar = ?, imagen_url = ?, imagen_mapa = ?
             WHERE id = ? AND organizador_id = ?`,
            [tituloSanitizado, descripcionSanitizada, categoria, fecha, hora, distritoSanitizado || null, lugarSanitizado, imagenSanitizada || null, imagenMapaSanitizada || null, eventoId, req.usuario.id]
        );

        await pool.query('DELETE FROM zonas_evento WHERE evento_id = ?', [eventoId]);
        await insertarZonas(eventoId, zonas);

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
            'SELECT id, activo, (fecha >= CURDATE()) AS fecha_futura FROM eventos WHERE id = ? AND organizador_id = ? AND eliminado = 0',
            [eventoId, req.usuario.id]
        );
        if (filas.length === 0) {
            return res.status(404).json({ mensaje: 'Evento no encontrado.' });
        }

        const nuevoEstado = filas[0].activo ? 0 : 1;
        if (nuevoEstado === 1 && !filas[0].fecha_futura) {
            return res.status(400).json({ mensaje: 'No se puede activar un evento cuya fecha ya pasó.' });
        }
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
    obtenerDetalleEvento,
    obtenerEstadisticas,
    obtenerEventosOrganizador,
    crearEvento,
    actualizarEvento,
    cambiarEstadoEvento,
    eliminarEvento,
};
