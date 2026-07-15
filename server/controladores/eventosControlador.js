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

const obtenerFiltrosDisponiblesOrganizador = async (organizadorId, filtrosActivos) => {
    const { anio, mes, categoria, eventoId, estadoEvento } = filtrosActivos;

    const getConds = (excludeKey) => {
        let condsEventos = ["e.organizador_id = ?", "e.eliminado = 0"];
        let paramsEventos = [organizadorId];
        let condsCompras = ["e.organizador_id = ?", "c.estado = 'confirmado'", "e.eliminado = 0"];
        let paramsCompras = [organizadorId];

        if (anio && excludeKey !== 'anio') {
            condsEventos.push("YEAR(e.fecha) = ?");
            paramsEventos.push(parseInt(anio, 10));
            condsCompras.push("YEAR(c.fecha_compra) = ?");
            paramsCompras.push(parseInt(anio, 10));
        }
        if (mes && excludeKey !== 'mes') {
            condsEventos.push("MONTH(e.fecha) = ?");
            paramsEventos.push(parseInt(mes, 10));
            condsCompras.push("MONTH(c.fecha_compra) = ?");
            paramsCompras.push(parseInt(mes, 10));
        }
        if (categoria && excludeKey !== 'categoria') {
            condsEventos.push("e.categoria = ?");
            paramsEventos.push(categoria);
            condsCompras.push("e.categoria = ?");
            paramsCompras.push(categoria);
        }
        if (eventoId && excludeKey !== 'eventoId') {
            condsEventos.push("e.id = ?");
            paramsEventos.push(eventoId);
            condsCompras.push("c.evento_id = ?");
            paramsCompras.push(eventoId);
        }
        if (estadoEvento && excludeKey !== 'estadoEvento') {
            if (estadoEvento === 'activo') {
                condsEventos.push("e.activo = 1");
                condsCompras.push("e.activo = 1");
            } else if (estadoEvento === 'inactivo') {
                condsEventos.push("e.activo = 0");
                condsCompras.push("e.activo = 0");
            } else if (estadoEvento === 'agotado') {
                const subQueryAgotado = "(SELECT COALESCE(SUM(z.stock), 0) FROM zonas_evento z WHERE z.evento_id = e.id AND z.activo = 1) = 0";
                condsEventos.push(subQueryAgotado);
                condsCompras.push(subQueryAgotado);
            }
        }

        return {
            whereEv: condsEventos.join(" AND "),
            paramsEv: paramsEventos,
            whereComp: condsCompras.join(" AND "),
            paramsComp: paramsCompras
        };
    };

    try {
        // 1. Años (solo de este organizador)
        const cAnio = getConds('anio');
        const [rowsAnios] = await pool.query(`
            SELECT DISTINCT YEAR(e.fecha) AS anio FROM eventos e WHERE ${cAnio.whereEv} AND e.fecha IS NOT NULL
            UNION
            SELECT DISTINCT YEAR(c.fecha_compra) AS anio FROM compras c JOIN eventos e ON c.evento_id = e.id WHERE ${cAnio.whereComp} AND c.fecha_compra IS NOT NULL
            ORDER BY anio DESC
        `, [...cAnio.paramsEv, ...cAnio.paramsComp]);
        const anios = rowsAnios.map(r => r.anio).filter(Boolean);

        // 2. Meses (solo de este organizador)
        const cMes = getConds('mes');
        const [rowsMeses] = await pool.query(`
            SELECT DISTINCT MONTH(e.fecha) AS mes FROM eventos e WHERE ${cMes.whereEv} AND e.fecha IS NOT NULL
            UNION
            SELECT DISTINCT MONTH(c.fecha_compra) AS mes FROM compras c JOIN eventos e ON c.evento_id = e.id WHERE ${cMes.whereComp} AND c.fecha_compra IS NOT NULL
            ORDER BY mes ASC
        `, [...cMes.paramsEv, ...cMes.paramsComp]);
        const meses = rowsMeses.map(r => r.mes).filter(Boolean);

        // 3. Categorías (solo de este organizador)
        const cCat = getConds('categoria');
        const [rowsCats] = await pool.query(`
            SELECT DISTINCT e.categoria FROM eventos e WHERE ${cCat.whereEv}
        `, cCat.paramsEv);
        const categorias = rowsCats.map(r => r.categoria).filter(Boolean);

        // 4. Eventos (solo de este organizador)
        const cEv = getConds('eventoId');
        const [rowsEvs] = await pool.query(`
            SELECT DISTINCT e.id, e.titulo FROM eventos e WHERE ${cEv.whereEv}
        `, cEv.paramsEv);

        return {
            anios,
            meses,
            categorias,
            eventos: rowsEvs
        };
    } catch (err) {
        logError('Eventos.obtenerFiltrosDisponiblesOrganizador', err);
        return { anios: [], meses: [], categorias: [], eventos: [] };
    }
};

// GET /api/eventos/dashboard-organizador — consolidado de métricas reales para el organizador
const obtenerDashboardOrganizador = async (req, res) => {
    const organizadorId = req.usuario.id;
    const { mes, anio, categoria, estadoEvento, eventoId } = req.query;

    try {
        // Validaciones básicas de tipos
        if (mes && (isNaN(parseInt(mes, 10)) || parseInt(mes, 10) < 1 || parseInt(mes, 10) > 12)) {
            return res.status(400).json({ mensaje: 'Mes inválido. Debe ser un número entre 1 y 12.' });
        }
        if (anio && (isNaN(parseInt(anio, 10)) || parseInt(anio, 10) < 2000 || parseInt(anio, 10) > 2100)) {
            return res.status(400).json({ mensaje: 'Año inválido.' });
        }

        // Aislamiento / Seguridad: Si se filtra por eventoId, validar que pertenezca al organizador actual
        if (eventoId) {
            const parsed = parseInt(eventoId, 10);
            if (isNaN(parsed) || parsed <= 0) {
                return res.status(400).json({ mensaje: 'ID de evento inválido.' });
            }
            const [check] = await pool.query(
                'SELECT id FROM eventos WHERE id = ? AND organizador_id = ? AND eliminado = 0',
                [parsed, organizadorId]
            );
            if (check.length === 0) {
                return res.status(403).json({ mensaje: 'Acceso denegado a este evento.' });
            }
        }

        // Filtros base para compras (c) y eventos (e)
        let condsCompras = ["e.organizador_id = ?", "c.estado = 'confirmado'", "e.eliminado = 0"];
        let paramsComprasBase = [organizadorId];

        let condsEventos = ["e.organizador_id = ?", "e.eliminado = 0"];
        let paramsEventosBase = [organizadorId];

        if (eventoId) {
            condsCompras.push("c.evento_id = ?");
            paramsComprasBase.push(eventoId);

            condsEventos.push("e.id = ?");
            paramsEventosBase.push(eventoId);
        }
        if (categoria) {
            condsCompras.push("e.categoria = ?");
            paramsComprasBase.push(categoria);

            condsEventos.push("e.categoria = ?");
            paramsEventosBase.push(categoria);
        }
        if (estadoEvento) {
            if (estadoEvento === 'activo') {
                condsCompras.push("e.activo = 1");
                condsEventos.push("e.activo = 1");
            } else if (estadoEvento === 'inactivo') {
                condsCompras.push("e.activo = 0");
                condsEventos.push("e.activo = 0");
            } else if (estadoEvento === 'agotado') {
                const subQueryAgotado = "(SELECT COALESCE(SUM(z.stock), 0) FROM zonas_evento z WHERE z.evento_id = e.id AND z.activo = 1) = 0";
                condsCompras.push(subQueryAgotado);
                condsEventos.push(subQueryAgotado);
            }
        }

        // ── KPI 1: Ingresos Periodo Actual vs Periodo Anterior ──
        let condsActual = [...condsCompras];
        let paramsActual = [...paramsComprasBase];
        let condsAnterior = [...condsCompras];
        let paramsAnterior = [...paramsComprasBase];

        if (mes && anio) {
            condsActual.push("MONTH(c.fecha_compra) = ?", "YEAR(c.fecha_compra) = ?");
            paramsActual.push(parseInt(mes, 10), parseInt(anio, 10));

            const m = parseInt(mes, 10);
            const y = parseInt(anio, 10);
            const prevM = m === 1 ? 12 : m - 1;
            const prevY = m === 1 ? y - 1 : y;

            condsAnterior.push("MONTH(c.fecha_compra) = ?", "YEAR(c.fecha_compra) = ?");
            paramsAnterior.push(prevM, prevY);
        } else if (anio) {
            condsActual.push("YEAR(c.fecha_compra) = ?");
            paramsActual.push(parseInt(anio, 10));

            const y = parseInt(anio, 10);
            condsAnterior.push("YEAR(c.fecha_compra) = ?");
            paramsAnterior.push(y - 1);
        } else if (mes) {
            condsActual.push("MONTH(c.fecha_compra) = ?");
            paramsActual.push(parseInt(mes, 10));

            const m = parseInt(mes, 10);
            const prevM = m === 1 ? 12 : m - 1;
            condsAnterior.push("MONTH(c.fecha_compra) = ?");
            paramsAnterior.push(prevM);
        } else {
            condsActual.push("MONTH(c.fecha_compra) = MONTH(CURRENT_DATE()) AND YEAR(c.fecha_compra) = YEAR(CURRENT_DATE())");
            condsAnterior.push("MONTH(c.fecha_compra) = MONTH(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH)) AND YEAR(c.fecha_compra) = YEAR(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))");
        }

        // 1. KPIs
        let ingresosTotales = 0, ticketsVendidos = 0;
        try {
            const [kpiRows] = await pool.query(`
                SELECT
                    COALESCE(SUM(c.subtotal), 0) AS ingresos_totales,
                    COALESCE(SUM(c.cantidad), 0) AS tickets_vendidos
                FROM compras c
                JOIN eventos e ON c.evento_id = e.id
                WHERE ${condsActual.join(" AND ")}
            `, paramsActual);
            ingresosTotales = Number(kpiRows[0].ingresos_totales);
            ticketsVendidos = Number(kpiRows[0].tickets_vendidos);
        } catch (e) { logError('Eventos.dashboard.kpi', e); }

        let stockTotal = 0;
        try {
            let condsStock = [...condsEventos, "z.activo = 1"];
            let paramsStock = [...paramsEventosBase];
            if (anio) { condsStock.push("YEAR(e.fecha) = ?"); paramsStock.push(parseInt(anio, 10)); }
            if (mes) { condsStock.push("MONTH(e.fecha) = ?"); paramsStock.push(parseInt(mes, 10)); }

            const [stockRows] = await pool.query(`
                SELECT COALESCE(SUM(z.stock), 0) AS stock_total
                FROM zonas_evento z
                JOIN eventos e ON z.evento_id = e.id
                WHERE ${condsStock.join(" AND ")}
            `, paramsStock);
            stockTotal = Number(stockRows[0].stock_total);
        } catch (e) { logError('Eventos.dashboard.stock', e); }

        let totalAsistentes = 0;
        try {
            let condsCheckin = ["e.organizador_id = ?", "c.estado = 'confirmado'", "e.eliminado = 0"];
            let paramsCheckin = [organizadorId];
            if (eventoId) { condsCheckin.push("e.id = ?"); paramsCheckin.push(eventoId); }
            if (categoria) { condsCheckin.push("e.categoria = ?"); paramsCheckin.push(categoria); }
            if (estadoEvento) {
                if (estadoEvento === 'activo') condsCheckin.push("e.activo = 1");
                else if (estadoEvento === 'inactivo') condsCheckin.push("e.activo = 0");
                else if (estadoEvento === 'agotado') condsCheckin.push("(SELECT COALESCE(SUM(z.stock), 0) FROM zonas_evento z WHERE z.evento_id = e.id AND z.activo = 1) = 0");
            }
            if (anio) { condsCheckin.push("YEAR(ch.fecha_checkin) = ?"); paramsCheckin.push(parseInt(anio, 10)); }
            if (mes) { condsCheckin.push("MONTH(ch.fecha_checkin) = ?"); paramsCheckin.push(parseInt(mes, 10)); }

            const [checkinRows] = await pool.query(`
                SELECT COALESCE(SUM(ch.cantidad_personas), 0) AS total_asistentes
                FROM checkins ch
                JOIN compras c ON ch.compra_id = c.id
                JOIN eventos e ON c.evento_id = e.id
                WHERE ${condsCheckin.join(" AND ")}
            `, paramsCheckin);
            totalAsistentes = Number(checkinRows[0].total_asistentes);
        } catch (e) { logError('Eventos.dashboard.checkins', e); }

        let ultimos30 = 0, previos30 = 0;
        try {
            const [growthRowsActual] = await pool.query(`
                SELECT COALESCE(SUM(c.subtotal), 0) AS total
                FROM compras c
                JOIN eventos e ON c.evento_id = e.id
                WHERE ${condsActual.join(" AND ")}
            `, paramsActual);

            const [growthRowsAnterior] = await pool.query(`
                SELECT COALESCE(SUM(c.subtotal), 0) AS total
                FROM compras c
                JOIN eventos e ON c.evento_id = e.id
                WHERE ${condsAnterior.join(" AND ")}
            `, paramsAnterior);

            ultimos30 = Number(growthRowsActual[0].total);
            previos30 = Number(growthRowsAnterior[0].total);
        } catch (e) { logError('Eventos.dashboard.growth', e); }

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

        // 2. Tendencia (ingresos y tickets por día)
        let tendencia30dias = [];
        try {
            let startTrendDate, endTrendDate;
            let trendByMonth = false;

            if (mes && anio) {
                const m = parseInt(mes, 10);
                const y = parseInt(anio, 10);
                startTrendDate = new Date(y, m - 1, 1);
                endTrendDate = new Date(y, m, 0);
            } else if (anio) {
                trendByMonth = true;
                const y = parseInt(anio, 10);
                startTrendDate = new Date(y, 0, 1);
                endTrendDate = new Date(y, 11, 31);
            } else if (mes) {
                const m = parseInt(mes, 10);
                const y = new Date().getFullYear();
                startTrendDate = new Date(y, m - 1, 1);
                endTrendDate = new Date(y, m, 0);
            } else {
                endTrendDate = new Date();
                startTrendDate = new Date();
                startTrendDate.setDate(endTrendDate.getDate() - 29);
            }

            let condsTrend = ["c.estado = 'confirmado'", "e.eliminado = 0", "e.organizador_id = ?"];
            let paramsTrend = [organizadorId];
            if (eventoId) { condsTrend.push("c.evento_id = ?"); paramsTrend.push(eventoId); }
            if (categoria) { condsTrend.push("e.categoria = ?"); paramsTrend.push(categoria); }
            if (estadoEvento) {
                if (estadoEvento === 'activo') condsTrend.push("e.activo = 1");
                else if (estadoEvento === 'inactivo') condsTrend.push("e.activo = 0");
                else if (estadoEvento === 'agotado') condsTrend.push("(SELECT COALESCE(SUM(z.stock), 0) FROM zonas_evento z WHERE z.evento_id = e.id AND z.activo = 1) = 0");
            }
            condsTrend.push("c.fecha_compra >= ? AND c.fecha_compra <= ?");
            paramsTrend.push(`${startTrendDate.toISOString().slice(0, 10)} 00:00:00`, `${endTrendDate.toISOString().slice(0, 10)} 23:59:59`);

            let trendQuery;
            if (trendByMonth) {
                trendQuery = `
                    SELECT MONTH(c.fecha_compra) AS dia,
                           COALESCE(SUM(c.subtotal), 0) AS ingresos,
                           COALESCE(SUM(c.cantidad), 0) AS tickets
                    FROM compras c
                    JOIN eventos e ON c.evento_id = e.id
                    WHERE ${condsTrend.join(" AND ")}
                    GROUP BY MONTH(c.fecha_compra)
                    ORDER BY dia ASC
                `;
            } else {
                trendQuery = `
                    SELECT DATE_FORMAT(c.fecha_compra, '%Y-%m-%d') AS dia,
                           COALESCE(SUM(c.subtotal), 0) AS ingresos,
                           COALESCE(SUM(c.cantidad), 0) AS tickets
                    FROM compras c
                    JOIN eventos e ON c.evento_id = e.id
                    WHERE ${condsTrend.join(" AND ")}
                    GROUP BY DATE(c.fecha_compra)
                    ORDER BY dia ASC
                `;
            }

            const [tendenciaRows] = await pool.query(trendQuery, paramsTrend);
            const tendenciaCompleta = [];

            if (trendByMonth) {
                const mesesMapa = new Map(tendenciaRows.map(r => [Number(r.dia), r]));
                const nombresMeses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Set", "Oct", "Nov", "Dic"];
                for (let m = 1; m <= 12; m++) {
                    const reg = mesesMapa.get(m);
                    tendenciaCompleta.push({
                        dia: nombresMeses[m - 1],
                        ingresos: reg ? Number(reg.ingresos) : 0,
                        tickets: reg ? Number(reg.tickets) : 0
                    });
                }
            } else {
                const diasMapa = new Map(tendenciaRows.map(r => [r.dia, r]));
                const iterador = new Date(startTrendDate);
                while (iterador <= endTrendDate) {
                    const fechaStr = iterador.toISOString().slice(0, 10);
                    const diaReg = diasMapa.get(fechaStr);
                    tendenciaCompleta.push({
                        dia: fechaStr,
                        ingresos: diaReg ? Number(diaReg.ingresos) : 0,
                        tickets: diaReg ? Number(diaReg.tickets) : 0
                    });
                    iterador.setDate(iterador.getDate() + 1);
                }
            }
            tendencia30dias = tendenciaCompleta;
        } catch (e) { logError('Eventos.dashboard.tendencia', e); }

        // 3. Distribución por zona
        let distribucionZonas = [];
        try {
            let condsDist = [...condsCompras];
            let paramsDist = [...paramsComprasBase];
            if (anio) { condsDist.push("YEAR(c.fecha_compra) = ?"); paramsDist.push(parseInt(anio, 10)); }
            if (mes) { condsDist.push("MONTH(c.fecha_compra) = ?"); paramsDist.push(parseInt(mes, 10)); }

            let distQuery = `
                SELECT
                    z.nombre AS categoria,
                    COALESCE(SUM(c.cantidad), 0) AS tickets,
                    COALESCE(SUM(c.subtotal), 0) AS ingresos
                FROM compras c
                JOIN eventos e ON c.evento_id = e.id
                JOIN zonas_evento z ON c.zona_id = z.id
                WHERE ${condsDist.join(" AND ")}
                GROUP BY z.nombre
                ORDER BY tickets DESC
            `;

            const [distribucionRows] = await pool.query(distQuery, paramsDist);
            distribucionZonas = distribucionRows.map(r => ({
                categoria: r.categoria,
                tickets: Number(r.tickets),
                ingresos: Number(r.ingresos)
            }));
        } catch (e) { logError('Eventos.dashboard.distribucion', e); }

        // 4. Eficiencia de asistencia por evento
        let eficienciaAsistencia = [];
        try {
            let condsEf = [...condsEventos];
            let paramsEf = [...paramsEventosBase];
            if (anio) { condsEf.push("YEAR(e.fecha) = ?"); paramsEf.push(parseInt(anio, 10)); }
            if (mes) { condsEf.push("MONTH(e.fecha) = ?"); paramsEf.push(parseInt(mes, 10)); }

            let efQuery = `
                SELECT
                    e.titulo AS evento,
                    (SELECT COALESCE(SUM(c.cantidad), 0) FROM compras c WHERE c.evento_id = e.id AND c.estado = 'confirmado') AS vendidas,
                    (SELECT COALESCE(SUM(ch.cantidad_personas), 0) FROM checkins ch JOIN compras c ON ch.compra_id = c.id WHERE c.evento_id = e.id AND c.estado = 'confirmado') AS checkin
                FROM eventos e
                WHERE ${condsEf.join(" AND ")}
                ORDER BY e.fecha DESC
            `;

            const [eficienciaRows] = await pool.query(efQuery, paramsEf);
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
            let condsEvActivos = [...condsEventos];
            let paramsEvActivos = [...paramsEventosBase];
            if (anio) { condsEvActivos.push("YEAR(e.fecha) = ?"); paramsEvActivos.push(parseInt(anio, 10)); }
            if (mes) { condsEvActivos.push("MONTH(e.fecha) = ?"); paramsEvActivos.push(parseInt(mes, 10)); }

            let evActivosQuery = `
                SELECT
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
                WHERE ${condsEvActivos.join(" AND ")}
                ORDER BY e.fecha DESC
            `;

            const [eventosRows] = await pool.query(evActivosQuery, paramsEvActivos);
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
                let condsEvActivos = [...condsEventos];
                let paramsEvActivos = [...paramsEventosBase];
                if (anio) { condsEvActivos.push("YEAR(e.fecha) = ?"); paramsEvActivos.push(parseInt(anio, 10)); }
                if (mes) { condsEvActivos.push("MONTH(e.fecha) = ?"); paramsEvActivos.push(parseInt(mes, 10)); }

                let evActivosFallback = `
                    SELECT
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
                     WHERE ${condsEvActivos.join(" AND ")}
                     ORDER BY e.fecha DESC
                `;

                const [eventosRows] = await pool.query(evActivosFallback, paramsEvActivos);
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
            let actFilterClause = "WHERE e.organizador_id = ? AND c.estado = 'confirmado' AND e.eliminado = 0";
            let actParams = [organizadorId];
            if (eventoId) { actFilterClause += " AND e.id = ?"; actParams.push(eventoId); }
            if (categoria) { actFilterClause += " AND e.categoria = ?"; actParams.push(categoria); }
            if (estadoEvento) {
                if (estadoEvento === 'activo') actFilterClause += " AND e.activo = 1";
                else if (estadoEvento === 'inactivo') actFilterClause += " AND e.activo = 0";
                else if (estadoEvento === 'agotado') actFilterClause += " AND (SELECT COALESCE(SUM(z.stock), 0) FROM zonas_evento z WHERE z.evento_id = e.id AND z.activo = 1) = 0";
            }
            if (anio) { actFilterClause += " AND YEAR(c.fecha_compra) = ?"; actParams.push(parseInt(anio, 10)); }
            if (mes) { actFilterClause += " AND MONTH(c.fecha_compra) = ?"; actParams.push(parseInt(mes, 10)); }

            let checkinFilterClause = "WHERE e.organizador_id = ? AND c.estado = 'confirmado' AND e.eliminado = 0";
            let checkinParams = [organizadorId];
            if (eventoId) { checkinFilterClause += " AND e.id = ?"; checkinParams.push(eventoId); }
            if (categoria) { checkinFilterClause += " AND e.categoria = ?"; checkinParams.push(categoria); }
            if (estadoEvento) {
                if (estadoEvento === 'activo') checkinFilterClause += " AND e.activo = 1";
                else if (estadoEvento === 'inactivo') checkinFilterClause += " AND e.activo = 0";
                else if (estadoEvento === 'agotado') checkinFilterClause += " AND (SELECT COALESCE(SUM(z.stock), 0) FROM zonas_evento z WHERE z.evento_id = e.id AND z.activo = 1) = 0";
            }
            if (anio) { checkinFilterClause += " AND YEAR(ch.fecha_checkin) = ?"; checkinParams.push(parseInt(anio, 10)); }
            if (mes) { checkinFilterClause += " AND MONTH(ch.fecha_checkin) = ?"; checkinParams.push(parseInt(mes, 10)); }

            let resFilterClause = "WHERE e.organizador_id = ? AND r.expira_en > NOW() AND e.eliminado = 0";
            let resParams = [organizadorId];
            if (eventoId) { resFilterClause += " AND e.id = ?"; resParams.push(eventoId); }
            if (categoria) { resFilterClause += " AND e.categoria = ?"; resParams.push(categoria); }
            if (estadoEvento) {
                if (estadoEvento === 'activo') resFilterClause += " AND e.activo = 1";
                else if (estadoEvento === 'inactivo') resFilterClause += " AND e.activo = 0";
                else if (estadoEvento === 'agotado') resFilterClause += " AND (SELECT COALESCE(SUM(z.stock), 0) FROM zonas_evento z WHERE z.evento_id = e.id AND z.activo = 1) = 0";
            }
            if (anio) { resFilterClause += " AND YEAR(r.creado_en) = ?"; resParams.push(parseInt(anio, 10)); }
            if (mes) { resFilterClause += " AND MONTH(r.creado_en) = ?"; resParams.push(parseInt(mes, 10)); }

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
                    ${actFilterClause}
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
                    ${checkinFilterClause}
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
                    ${resFilterClause}
                )
                ORDER BY fecha DESC
                LIMIT 10`,
                [...actParams, ...checkinParams, ...resParams]
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
                let actFallbackClause = "WHERE e.organizador_id = ? AND c.estado = 'confirmado' AND e.eliminado = 0";
                let actFallbackParams = [organizadorId];
                if (eventoId) { actFallbackClause += " AND e.id = ?"; actFallbackParams.push(eventoId); }
                if (categoria) { actFallbackClause += " AND e.categoria = ?"; actFallbackParams.push(categoria); }
                if (estadoEvento) {
                    if (estadoEvento === 'activo') actFallbackClause += " AND e.activo = 1";
                    else if (estadoEvento === 'inactivo') actFallbackClause += " AND e.activo = 0";
                    else if (estadoEvento === 'agotado') actFallbackClause += " AND (SELECT COALESCE(SUM(z.stock), 0) FROM zonas_evento z WHERE z.evento_id = e.id AND z.activo = 1) = 0";
                }
                if (anio) { actFallbackClause += " AND YEAR(c.fecha_compra) = ?"; actFallbackParams.push(parseInt(anio, 10)); }
                if (mes) { actFallbackClause += " AND MONTH(c.fecha_compra) = ?"; actFallbackParams.push(parseInt(mes, 10)); }

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
                     ${actFallbackClause}
                     ORDER BY fecha DESC
                     LIMIT 10`,
                    actFallbackParams
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

        const filtrosValidos = await obtenerFiltrosDisponiblesOrganizador(organizadorId, { anio, mes, categoria, estadoEvento, eventoId });

        res.json({
            kpis,
            tendencia30dias,
            distribucionZonas,
            eficienciaAsistencia,
            eventosActivos,
            actividadReciente,
            filtrosValidos
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