// Operaciones y publicación de eventos

const { pool } = require('../config/db');
const { logError } = require('../config/logger');
const { CATEGORIAS_VALIDAS } = require('../config/constantes');

const CATEGORIAS_SET = new Set(CATEGORIAS_VALIDAS);

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
        if (isNaN(precio) || precio <= 0) return 'El precio de cada zona debe ser mayor a 0.';
        if (isNaN(stock) || stock <= 0) return 'La capacidad de cada zona debe ser mayor a 0.';
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
        // Escapar comodines de LIKE
        if (busqueda) {
            const busquedaSanitizada = String(busqueda)
                .replace(/%/g, '\\%')
                .replace(/_/g, '\\_');
            query += ' AND e.titulo LIKE ?';
            params.push(`%${busquedaSanitizada}%`);
        }

        query += ' ORDER BY e.fecha ASC';

        const [eventos] = await pool.query(query, params);
        res.json({ eventos });
    } catch (error) {
        const idError = logError('Eventos.obtenerEventos', error);
        res.status(500).json({ mensaje: 'Error interno del servidor.', referencia: idError });
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

        // Calcular stock total para flag de agotado
        const stockTotal = zonas.reduce((acc, z) => acc + z.stock, 0);

        res.json({ evento: eventos[0], zonas, isSoldOut: stockTotal === 0 });
    } catch (error) {
        const idError = logError('Eventos.obtenerDetalleEvento', error);
        res.status(500).json({ mensaje: 'Error interno del servidor.', referencia: idError });
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
        const idError = logError('Eventos.obtenerEstadisticas', error);
        res.status(500).json({ mensaje: 'Error interno del servidor.', referencia: idError });
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
        const idError = logError('Eventos.obtenerEventosOrganizador', error);
        res.status(500).json({ mensaje: 'Error interno del servidor.', referencia: idError });
    }
};

// POST /api/eventos — organizador
const crearEvento = async (req, res) => {
    try {
        const { titulo, descripcion, categoria, fecha, hora, distrito, lugar, imagen_url, imagen_mapa, zonas } = req.body;

        if (!titulo || !categoria || !fecha || !hora || !lugar) {
            return res.status(400).json({ mensaje: 'Título, categoría, fecha, hora y lugar son obligatorios.' });
        }
        if (!CATEGORIAS_SET.has(categoria)) {
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
             VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0)`,
            [tituloSanitizado, descripcionSanitizada, categoria, fecha, hora, distritoSanitizado || null, lugarSanitizado, imagenSanitizada || null, imagenMapaSanitizada || null, req.usuario.id]
        );

        await insertarZonas(resultado.insertId, zonas);

        res.status(201).json({ mensaje: 'Evento creado correctamente.', id: resultado.insertId });
    } catch (error) {
        const idError = logError('Eventos.crearEvento', error);
        res.status(500).json({ mensaje: 'Error interno del servidor.', referencia: idError });
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
        if (!CATEGORIAS_SET.has(categoria)) {
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
        const idError = logError('Eventos.actualizarEvento', error);
        res.status(500).json({ mensaje: 'Error interno del servidor.', referencia: idError });
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
        const idError = logError('Eventos.cambiarEstadoEvento', error);
        res.status(500).json({ mensaje: 'Error interno del servidor.', referencia: idError });
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
        const idError = logError('Eventos.eliminarEvento', error);
        res.status(500).json({ mensaje: 'Error interno del servidor.', referencia: idError });
    }
};

// GET /api/eventos/dashboard-organizador — consolidado de métricas reales para el organizador
const obtenerDashboardOrganizador = async (req, res) => {
    const organizadorId = req.usuario.id;

    try {
        // 1. KPIs
        // Ingresos totales & Tickets vendidos
        const [kpiRows] = await pool.query(
            `SELECT 
                COALESCE(SUM(c.subtotal), 0) AS ingresos_totales,
                COALESCE(SUM(c.cantidad), 0) AS tickets_vendidos
             FROM compras c
             JOIN eventos e ON c.evento_id = e.id
             WHERE e.organizador_id = ? AND c.estado = 'confirmado' AND e.eliminado = 0`,
            [organizadorId]
        );

        // Capacidad total (stock actual + vendidos)
        const [stockRows] = await pool.query(
            `SELECT COALESCE(SUM(z.stock), 0) AS stock_total
             FROM zonas_evento z
             JOIN eventos e ON z.evento_id = e.id
             WHERE e.organizador_id = ? AND e.eliminado = 0 AND z.activo = 1`,
            [organizadorId]
        );

        // Check-ins (asistentes)
        let checkinRows = [{ total_asistentes: 0 }];
        try {
            [checkinRows] = await pool.query(
                `SELECT COALESCE(SUM(ch.cantidad_personas), 0) AS total_asistentes
                 FROM checkins ch
                 JOIN compras c ON ch.compra_id = c.id
                 JOIN eventos e ON c.evento_id = e.id
                 WHERE e.organizador_id = ? AND e.eliminado = 0 AND c.estado = 'confirmado'`,
                [organizadorId]
            );
        } catch (e) {
            logError('Eventos.dashboard.checkins', e);
        }

        // Crecimiento mensual (ingresos últimos 30 días vs anteriores 30 días)
        const [growthRows] = await pool.query(
            `SELECT 
                COALESCE(SUM(CASE WHEN c.fecha_compra >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN c.subtotal ELSE 0 END), 0) AS ingresos_ultimos_30,
                COALESCE(SUM(CASE WHEN c.fecha_compra >= DATE_SUB(NOW(), INTERVAL 60 DAY) AND c.fecha_compra < DATE_SUB(NOW(), INTERVAL 30 DAY) THEN c.subtotal ELSE 0 END), 0) AS ingresos_previos_30
             FROM compras c
             JOIN eventos e ON c.evento_id = e.id
             WHERE e.organizador_id = ? AND c.estado = 'confirmado' AND e.eliminado = 0`,
            [organizadorId]
        );

        const ingresosTotales = Number(kpiRows[0].ingresos_totales);
        const ticketsVendidos = Number(kpiRows[0].tickets_vendidos);
        const stockTotal = Number(stockRows[0].stock_total);
        const totalAsistentes = Number(checkinRows[0].total_asistentes);
        const ultimos30 = Number(growthRows[0].ingresos_ultimos_30);
        const previos30 = Number(growthRows[0].ingresos_previos_30);

        const anterior = ingresosTotales - ultimos30 + previos30;
        const crecimiento = previos30 > 0
            ? Math.round(((ultimos30 - previos30) / previos30) * 1000) / 10
            : ultimos30 > 0 ? 100.0 : 0.0;

        const tasaCheckin = ticketsVendidos > 0
            ? Math.round((totalAsistentes / ticketsVendidos) * 1000) / 10
            : 0.0;

        const kpis = {
            ingresos: {
                actual: ingresosTotales,
                anterior: anterior,
                crecimiento: crecimiento
            },
            tickets: {
                vendidos: ticketsVendidos,
                capacidad: stockTotal + ticketsVendidos
            },
            checkin: {
                asistentes: totalAsistentes,
                vendidos: ticketsVendidos,
                tasa: tasaCheckin
            }
        };

        // 2. Tendencia de 30 días (ingresos y tickets por día)
        const [tendenciaRows] = await pool.query(
            `SELECT 
                DATE_FORMAT(c.fecha_compra, '%Y-%m-%d') AS dia,
                COALESCE(SUM(c.subtotal), 0) AS ingresos,
                COALESCE(SUM(c.cantidad), 0) AS tickets
             FROM compras c
             JOIN eventos e ON c.evento_id = e.id
             WHERE e.organizador_id = ? AND c.estado = 'confirmado' AND e.eliminado = 0
               AND c.fecha_compra >= DATE_SUB(CURDATE(), INTERVAL 29 DAY)
             GROUP BY DATE(c.fecha_compra)
             ORDER BY dia ASC`,
            [organizadorId]
        );

        // Llenar los días vacíos en JavaScript para evitar huecos en Recharts
        const tendencia30dias = [];
        const hoy = new Date();
        const diasMapa = new Map(tendenciaRows.map(r => [r.dia, r]));

        for (let i = 29; i >= 0; i--) {
            const d = new Date(hoy);
            d.setDate(hoy.getDate() - i);
            const fechaStr = d.toISOString().slice(0, 10);
            const diaReg = diasMapa.get(fechaStr);
            tendencia30dias.push({
                dia: fechaStr,
                ingresos: diaReg ? Number(diaReg.ingresos) : 0,
                tickets: diaReg ? Number(diaReg.tickets) : 0
            });
        }

        // 3. Distribución por zona
        const [distribucionRows] = await pool.query(
            `SELECT 
                z.nombre AS categoria,
                COALESCE(SUM(c.cantidad), 0) AS tickets,
                COALESCE(SUM(c.subtotal), 0) AS ingresos
             FROM compras c
             JOIN eventos e ON c.evento_id = e.id
             JOIN zonas_evento z ON c.zona_id = z.id
             WHERE e.organizador_id = ? AND c.estado = 'confirmado' AND e.eliminado = 0
             GROUP BY z.nombre
             ORDER BY tickets DESC`,
            [organizadorId]
        );
        const distribucionZonas = distribucionRows.map(r => ({
            categoria: r.categoria,
            tickets: Number(r.tickets),
            ingresos: Number(r.ingresos)
        }));

        // 4. Eficiencia de asistencia por evento
        let eficienciaAsistencia = [];
        try {
            const [eficienciaRows] = await pool.query(
                `SELECT
                    e.titulo AS evento,
                    (SELECT COALESCE(SUM(c.cantidad), 0) FROM compras c WHERE c.evento_id = e.id AND c.estado = 'confirmado') AS vendidas,
                    (SELECT COALESCE(SUM(ch.cantidad_personas), 0) FROM checkins ch JOIN compras c ON ch.compra_id = c.id WHERE c.evento_id = e.id AND c.estado = 'confirmado') AS checkin
                 FROM eventos e
                 WHERE e.organizador_id = ? AND e.eliminado = 0
                 ORDER BY e.fecha DESC`,
                [organizadorId]
            );
            eficienciaAsistencia = eficienciaRows.map(r => ({
                evento: r.evento,
                vendidas: Number(r.vendidas),
                checkin: Number(r.checkin)
            }));
        } catch (e) {
            logError('Eventos.dashboard.eficiencia', e);
        }

        // 5. Eventos activos
        let eventosActivos = [];
        try {
            const [eventosRows] = await pool.query(
                `SELECT
                    e.id,
                    e.titulo,
                    DATE_FORMAT(e.fecha, '%Y-%m-%d') AS fecha,
                    CASE WHEN e.activo = 1 THEN 'activo' ELSE 'pausado' END AS estado,
                    e.categoria,
                    (SELECT COALESCE(SUM(c.cantidad), 0) FROM compras c WHERE c.evento_id = e.id AND c.estado = 'confirmado') AS entradas_vendidas,
                    (SELECT COALESCE(SUM(z.stock), 0) FROM zonas_evento z WHERE z.evento_id = e.id AND z.activo = 1) +
                    (SELECT COALESCE(SUM(c.cantidad), 0) FROM compras c WHERE c.evento_id = e.id AND c.estado = 'confirmado') AS capacidad_total,
                    (SELECT COALESCE(SUM(ch.cantidad_personas), 0) FROM checkins ch JOIN compras c ON ch.compra_id = c.id WHERE c.evento_id = e.id AND c.estado = 'confirmado') AS asistentes_ingresados,
                    (SELECT COALESCE(SUM(c.subtotal), 0) FROM compras c WHERE c.evento_id = e.id AND c.estado = 'confirmado') AS ingresos
                 FROM eventos e
                 WHERE e.organizador_id = ? AND e.eliminado = 0
                 ORDER BY e.fecha DESC`,
                [organizadorId]
            );
            eventosActivos = eventosRows.map(r => ({
                id: r.id,
                titulo: r.titulo,
                fecha: r.fecha,
                estado: r.estado,
                categoria: r.categoria,
                entradas_vendidas: Number(r.entradas_vendidas),
                capacidad_total: Number(r.capacidad_total),
                asistentes_ingresados: Number(r.asistentes_ingresados),
                ingresos: Number(r.ingresos)
            }));
        } catch (e) {
            logError('Eventos.dashboard.eventosActivos', e);
            // Fallback sin subquery de checkins
            try {
                const [eventosRows] = await pool.query(
                    `SELECT
                        e.id,
                        e.titulo,
                        DATE_FORMAT(e.fecha, '%Y-%m-%d') AS fecha,
                        CASE WHEN e.activo = 1 THEN 'activo' ELSE 'pausado' END AS estado,
                        e.categoria,
                        (SELECT COALESCE(SUM(c.cantidad), 0) FROM compras c WHERE c.evento_id = e.id AND c.estado = 'confirmado') AS entradas_vendidas,
                        (SELECT COALESCE(SUM(z.stock), 0) FROM zonas_evento z WHERE z.evento_id = e.id AND z.activo = 1) +
                        (SELECT COALESCE(SUM(c.cantidad), 0) FROM compras c WHERE c.evento_id = e.id AND c.estado = 'confirmado') AS capacidad_total,
                        0 AS asistentes_ingresados,
                        (SELECT COALESCE(SUM(c.subtotal), 0) FROM compras c WHERE c.evento_id = e.id AND c.estado = 'confirmado') AS ingresos
                     FROM eventos e
                     WHERE e.organizador_id = ? AND e.eliminado = 0
                     ORDER BY e.fecha DESC`,
                    [organizadorId]
                );
                eventosActivos = eventosRows.map(r => ({
                    id: r.id,
                    titulo: r.titulo,
                    fecha: r.fecha,
                    estado: r.estado,
                    categoria: r.categoria,
                    entradas_vendidas: Number(r.entradas_vendidas),
                    capacidad_total: Number(r.capacidad_total),
                    asistentes_ingresados: 0,
                    ingresos: Number(r.ingresos)
                }));
            } catch (e2) {
                logError('Eventos.dashboard.eventosActivos.fallback', e2);
            }
        }

        // 6. Actividad reciente (Compras, checkins y reservas)
        let actividadReciente = [];
        try {
            const [actividadRows] = await pool.query(
                `(
                    SELECT
                        c.id,
                        'Compra de Ticket' AS tipo,
                        CONCAT(u.nombre, ' ', u.apellido) AS usuario,
                        e.titulo AS evento,
                        c.cantidad,
                        c.subtotal AS monto,
                        c.fecha_compra AS fecha
                    FROM compras c
                    JOIN usuarios u ON c.usuario_id = u.id
                    JOIN eventos e ON c.evento_id = e.id
                    WHERE e.organizador_id = ? AND c.estado = 'confirmado'
                )
                UNION ALL
                (
                    SELECT
                        ch.id,
                        'Check-in QR' AS tipo,
                        CONCAT(u.nombre, ' ', u.apellido) AS usuario,
                        e.titulo AS evento,
                        ch.cantidad_personas AS cantidad,
                        0.00 AS monto,
                        ch.fecha_checkin AS fecha
                    FROM checkins ch
                    JOIN compras c ON ch.compra_id = c.id
                    JOIN usuarios u ON c.usuario_id = u.id
                    JOIN eventos e ON c.evento_id = e.id
                    WHERE e.organizador_id = ? AND c.estado = 'confirmado'
                )
                UNION ALL
                (
                    SELECT
                        r.id,
                        'Reserva Temporal' AS tipo,
                        CONCAT(u.nombre, ' ', u.apellido) AS usuario,
                        e.titulo AS evento,
                        r.cantidad,
                        r.subtotal AS monto,
                        r.creado_en AS fecha
                    FROM reservas_temporales r
                    JOIN usuarios u ON r.usuario_id = u.id
                    JOIN eventos e ON r.evento_id = e.id
                    WHERE e.organizador_id = ? AND r.expira_en > NOW()
                )
                ORDER BY fecha DESC
                LIMIT 10`,
                [organizadorId, organizadorId, organizadorId]
            );
            actividadReciente = actividadRows.map(r => ({
                id: r.id,
                tipo: r.tipo,
                usuario: r.usuario,
                evento: r.evento,
                cantidad: Number(r.cantidad),
                monto: Number(r.monto),
                fecha: r.fecha
            }));
        } catch (e) {
            logError('Eventos.dashboard.actividad', e);
            // Fallback: solo compras (sin checkins ni reservas_temporales)
            try {
                const [actividadRows] = await pool.query(
                    `SELECT
                        c.id,
                        'Compra de Ticket' AS tipo,
                        CONCAT(u.nombre, ' ', u.apellido) AS usuario,
                        e.titulo AS evento,
                        c.cantidad,
                        c.subtotal AS monto,
                        c.fecha_compra AS fecha
                     FROM compras c
                     JOIN usuarios u ON c.usuario_id = u.id
                     JOIN eventos e ON c.evento_id = e.id
                     WHERE e.organizador_id = ? AND c.estado = 'confirmado'
                     ORDER BY fecha DESC
                     LIMIT 10`,
                    [organizadorId]
                );
                actividadReciente = actividadRows.map(r => ({
                    id: r.id,
                    tipo: r.tipo,
                    usuario: r.usuario,
                    evento: r.evento,
                    cantidad: Number(r.cantidad),
                    monto: Number(r.monto),
                    fecha: r.fecha
                }));
            } catch (e2) {
                logError('Eventos.dashboard.actividad.fallback', e2);
            }
        }

        res.json({
            kpis,
            tendencia30dias,
            distribucionZonas,
            eficienciaAsistencia,
            eventosActivos,
            actividadReciente
        });
    } catch (error) {
        const idError = logError('Eventos.obtenerDashboardOrganizador', error);
        res.status(500).json({ mensaje: 'Error al obtener datos del dashboard.', referencia: idError });
    }
};

module.exports = {
    obtenerEventos,
    obtenerDetalleEvento,
    obtenerEstadisticas,
    obtenerEventosOrganizador,
    obtenerDashboardOrganizador,
    crearEvento,
    actualizarEvento,
    cambiarEstadoEvento,
    eliminarEvento,
};