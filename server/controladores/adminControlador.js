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

// ─── Dashboard Analítico (endpoint ampliado) ──────────────────────────────────
//
// Devuelve toda la información necesaria para el dashboard analítico:
//   - KPIs con crecimiento mes a mes
//   - Tendencia de ingresos y tickets (últimos 30 días)
//   - Top 5 eventos por recaudación
//   - Distribución de ventas por categoría de zona
//   - Últimas transacciones de la plataforma
//
// Todas las consultas se ejecutan en paralelo con Promise.all para reducir
// la latencia total del endpoint.

const obtenerFiltrosDisponiblesAdmin = async (filtrosActivos) => {
    const { anio, mes, categoria, organizadorId, eventoId, estadoEvento } = filtrosActivos;

    const getConds = (excludeKey) => {
        let condsEventos = ["e.eliminado = 0"];
        let paramsEventos = [];
        let condsCompras = ["c.estado = 'confirmado'", "e.eliminado = 0"];
        let paramsCompras = [];

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
        if (organizadorId && excludeKey !== 'organizadorId') {
            condsEventos.push("e.organizador_id = ?");
            paramsEventos.push(organizadorId);
            condsCompras.push("e.organizador_id = ?");
            paramsCompras.push(organizadorId);
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
        // 1. Años (todos los años que coinciden con los otros filtros)
        const cAnio = getConds('anio');
        const [rowsAnios] = await pool.query(`
            SELECT DISTINCT YEAR(e.fecha) AS anio FROM eventos e WHERE ${cAnio.whereEv} AND e.fecha IS NOT NULL
            UNION
            SELECT DISTINCT YEAR(c.fecha_compra) AS anio FROM compras c JOIN eventos e ON c.evento_id = e.id WHERE ${cAnio.whereComp} AND c.fecha_compra IS NOT NULL
            ORDER BY anio DESC
        `, [...cAnio.paramsEv, ...cAnio.paramsComp]);
        const anios = rowsAnios.map(r => r.anio).filter(Boolean);

        // 2. Meses (disponibles según año y otros filtros)
        const cMes = getConds('mes');
        const [rowsMeses] = await pool.query(`
            SELECT DISTINCT MONTH(e.fecha) AS mes FROM eventos e WHERE ${cMes.whereEv} AND e.fecha IS NOT NULL
            UNION
            SELECT DISTINCT MONTH(c.fecha_compra) AS mes FROM compras c JOIN eventos e ON c.evento_id = e.id WHERE ${cMes.whereComp} AND c.fecha_compra IS NOT NULL
            ORDER BY mes ASC
        `, [...cMes.paramsEv, ...cMes.paramsComp]);
        const meses = rowsMeses.map(r => r.mes).filter(Boolean);

        // 3. Categorías (disponibles según año, mes y otros filtros)
        const cCat = getConds('categoria');
        const [rowsCats] = await pool.query(`
            SELECT DISTINCT e.categoria FROM eventos e WHERE ${cCat.whereEv}
        `, cCat.paramsEv);
        const categorias = rowsCats.map(r => r.categoria).filter(Boolean);

        // 4. Organizadores (tienen eventos según los otros filtros)
        const cOrg = getConds('organizadorId');
        const [rowsOrgs] = await pool.query(`
            SELECT DISTINCT u.id, u.nombre, u.apellido 
            FROM usuarios u
            JOIN eventos e ON e.organizador_id = u.id
            WHERE ${cOrg.whereEv}
        `, cOrg.paramsEv);

        // 5. Eventos (disponibles según los otros filtros)
        const cEv = getConds('eventoId');
        const [rowsEvs] = await pool.query(`
            SELECT DISTINCT e.id, e.titulo FROM eventos e WHERE ${cEv.whereEv}
        `, cEv.paramsEv);

        return {
            anios,
            meses,
            categorias,
            organizadores: rowsOrgs,
            eventos: rowsEvs
        };
    } catch (err) {
        logError('Admin.obtenerFiltrosDisponiblesAdmin', err);
        return { anios: [], meses: [], categorias: [], organizadores: [], eventos: [] };
    }
};

const obtenerMetricasDashboard = async (req, res) => {
    try {
        const { mes, anio, categoria, estadoEvento, eventoId, organizadorId } = req.query;

        // Validaciones básicas de tipos
        if (mes && (isNaN(parseInt(mes, 10)) || parseInt(mes, 10) < 1 || parseInt(mes, 10) > 12)) {
            return res.status(400).json({ mensaje: 'Mes inválido. Debe ser un número entre 1 y 12.' });
        }
        if (anio && (isNaN(parseInt(anio, 10)) || parseInt(anio, 10) < 2000 || parseInt(anio, 10) > 2100)) {
            return res.status(400).json({ mensaje: 'Año inválido.' });
        }

        // Filtros base para compras (c) y eventos (e)
        let condsCompras = ["c.estado = 'confirmado'", "e.eliminado = 0"];
        let paramsComprasBase = [];

        let condsEventos = ["e.eliminado = 0"];
        let paramsEventosBase = [];

        if (eventoId) {
            condsCompras.push("c.evento_id = ?");
            paramsComprasBase.push(eventoId);

            condsEventos.push("e.id = ?");
            paramsEventosBase.push(eventoId);
        }
        if (organizadorId) {
            condsCompras.push("e.organizador_id = ?");
            paramsComprasBase.push(organizadorId);

            condsEventos.push("e.organizador_id = ?");
            paramsEventosBase.push(organizadorId);
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
            // Por defecto: mes actual vs mes anterior
            condsActual.push("MONTH(c.fecha_compra) = MONTH(CURRENT_DATE()) AND YEAR(c.fecha_compra) = YEAR(CURRENT_DATE())");
            condsAnterior.push("MONTH(c.fecha_compra) = MONTH(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH)) AND YEAR(c.fecha_compra) = YEAR(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))");
        }

        const sqlWhereActual = "WHERE " + condsActual.join(" AND ");
        const sqlWhereAnterior = "WHERE " + condsAnterior.join(" AND ");

        // ── KPI 2: Tickets vendidos (eventos activos) ──
        let condsTickets = [...condsCompras, "e.activo = 1"];
        let paramsTickets = [...paramsComprasBase];
        if (anio) {
            condsTickets.push("YEAR(c.fecha_compra) = ?");
            paramsTickets.push(parseInt(anio, 10));
        }
        if (mes) {
            condsTickets.push("MONTH(c.fecha_compra) = ?");
            paramsTickets.push(parseInt(mes, 10));
        }
        const sqlWhereTickets = "WHERE " + condsTickets.join(" AND ");

        // ── KPI 2b: Stock restante ──
        let condsStock = [...condsEventos, "z.activo = 1", "e.activo = 1"];
        let paramsStock = [...paramsEventosBase];
        if (anio) {
            condsStock.push("YEAR(e.fecha) = ?");
            paramsStock.push(parseInt(anio, 10));
        }
        if (mes) {
            condsStock.push("MONTH(e.fecha) = ?");
            paramsStock.push(parseInt(mes, 10));
        }
        const sqlWhereStock = "WHERE " + condsStock.join(" AND ");

        // ── KPI 3: Eventos activos ──
        let condsEvActivos = [...condsEventos, "e.activo = 1"];
        let paramsEvActivos = [...paramsEventosBase];
        if (anio) {
            condsEvActivos.push("YEAR(e.fecha) = ?");
            paramsEvActivos.push(parseInt(anio, 10));
        }
        if (mes) {
            condsEvActivos.push("MONTH(e.fecha) = ?");
            paramsEvActivos.push(parseInt(mes, 10));
        }
        const sqlWhereEvActivos = "WHERE " + condsEvActivos.join(" AND ");

        // ── KPI 3b: Eventos totales ──
        let condsEvTotales = [...condsEventos];
        let paramsEvTotales = [...paramsEventosBase];
        if (anio) {
            condsEvTotales.push("YEAR(e.fecha) = ?");
            paramsEvTotales.push(parseInt(anio, 10));
        }
        if (mes) {
            condsEvTotales.push("MONTH(e.fecha) = ?");
            paramsEvTotales.push(parseInt(mes, 10));
        }
        const sqlWhereEvTotales = "WHERE " + condsEvTotales.join(" AND ");

        // ── KPI 4: Usuarios totales (Compradores únicos si hay filtros) ──
        let queryUsers;
        let paramsUsers = [];
        if (eventoId || organizadorId || categoria || estadoEvento || mes || anio) {
            let condsUsers = ["c.estado = 'confirmado'", "e.eliminado = 0"];
            if (eventoId) { condsUsers.push("e.id = ?"); paramsUsers.push(eventoId); }
            if (organizadorId) { condsUsers.push("e.organizador_id = ?"); paramsUsers.push(organizadorId); }
            if (categoria) { condsUsers.push("e.categoria = ?"); paramsUsers.push(categoria); }
            if (estadoEvento) {
                if (estadoEvento === 'activo') condsUsers.push("e.activo = 1");
                else if (estadoEvento === 'inactivo') condsUsers.push("e.activo = 0");
                else if (estadoEvento === 'agotado') condsUsers.push("(SELECT COALESCE(SUM(z.stock), 0) FROM zonas_evento z WHERE z.evento_id = e.id AND z.activo = 1) = 0");
            }
            if (anio) { condsUsers.push("YEAR(c.fecha_compra) = ?"); paramsUsers.push(parseInt(anio, 10)); }
            if (mes) { condsUsers.push("MONTH(c.fecha_compra) = ?"); paramsUsers.push(parseInt(mes, 10)); }

            queryUsers = `
                SELECT COUNT(DISTINCT c.usuario_id) AS total
                FROM compras c
                JOIN eventos e ON c.evento_id = e.id
                WHERE ${condsUsers.join(" AND ")}
            `;
        } else {
            queryUsers = "SELECT COUNT(*) AS total FROM usuarios WHERE rol IN ('usuario', 'organizador')";
        }

        // Organizadores
        let queryOrgs = "SELECT COUNT(*) AS total FROM usuarios WHERE rol = 'organizador'";
        let paramsOrgs = [];
        if (organizadorId) {
            queryOrgs += " AND id = ?";
            paramsOrgs.push(organizadorId);
        }

        // Nuevos usuarios periodo
        let queryNuevos;
        let paramsNuevos = [];
        let condsNuevos = ["rol IN ('usuario', 'organizador')"];
        if (anio) { condsNuevos.push("YEAR(created_at) = ?"); paramsNuevos.push(parseInt(anio, 10)); }
        if (mes) { condsNuevos.push("MONTH(created_at) = ?"); paramsNuevos.push(parseInt(mes, 10)); }
        if (!mes && !anio) {
            condsNuevos.push("created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)");
        }
        queryNuevos = `SELECT COUNT(*) AS total FROM usuarios WHERE ${condsNuevos.join(" AND ")}`;

        // ── Tendencia de ingresos y tickets (diario o mensual) ──
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

        let condsTrend = ["c.estado = 'confirmado'", "e.eliminado = 0"];
        let paramsTrend = [];
        if (eventoId) { condsTrend.push("c.evento_id = ?"); paramsTrend.push(eventoId); }
        if (organizadorId) { condsTrend.push("e.organizador_id = ?"); paramsTrend.push(organizadorId); }
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

        // Top eventos
        let condsTop = [...condsCompras];
        let paramsTop = [...paramsComprasBase];
        if (anio) { condsTop.push("YEAR(c.fecha_compra) = ?"); paramsTop.push(parseInt(anio, 10)); }
        if (mes) { condsTop.push("MONTH(c.fecha_compra) = ?"); paramsTop.push(parseInt(mes, 10)); }
        const sqlWhereTop = "WHERE " + condsTop.join(" AND ");

        // Distribución por zona
        let condsDist = [...condsCompras];
        let paramsDist = [...paramsComprasBase];
        if (anio) { condsDist.push("YEAR(c.fecha_compra) = ?"); paramsDist.push(parseInt(anio, 10)); }
        if (mes) { condsDist.push("MONTH(c.fecha_compra) = ?"); paramsDist.push(parseInt(mes, 10)); }
        const sqlWhereDist = "WHERE " + condsDist.join(" AND ");

        // Actividad Reciente
        let condsAct = [];
        let paramsAct = [];
        if (eventoId) { condsAct.push("c.evento_id = ?"); paramsAct.push(eventoId); }
        if (organizadorId) { condsAct.push("e.organizador_id = ?"); paramsAct.push(organizadorId); }
        if (categoria) { condsAct.push("e.categoria = ?"); paramsAct.push(categoria); }
        if (estadoEvento) {
            if (estadoEvento === 'activo') condsAct.push("e.activo = 1");
            else if (estadoEvento === 'inactivo') condsAct.push("e.activo = 0");
            else if (estadoEvento === 'agotado') condsAct.push("(SELECT COALESCE(SUM(z.stock), 0) FROM zonas_evento z WHERE z.evento_id = e.id AND z.activo = 1) = 0");
        }
        if (anio) { condsAct.push("YEAR(c.fecha_compra) = ?"); paramsAct.push(parseInt(anio, 10)); }
        if (mes) { condsAct.push("MONTH(c.fecha_compra) = ?"); paramsAct.push(parseInt(mes, 10)); }
        const sqlWhereAct = condsAct.length > 0 ? "WHERE " + condsAct.join(" AND ") : "";

        const [
            [rowsIngresosMesActual],
            [rowsIngresosMesAnterior],
            [rowsTicketsVendidos],
            [rowsCapacidadRestante],
            [rowsEventosActivos],
            [rowsEventosTotales],
            [rowsUsuariosTotal],
            [rowsOrganizadores],
            [rowsUsuariosNuevos],
            [rowsTendencia],
            [rowsTopEventos],
            [rowsDistribucion],
            [rowsActividad],
            filtrosValidos,
        ] = await Promise.all([
            pool.query(`
                SELECT COALESCE(SUM(c.subtotal), 0) AS total
                FROM compras c
                JOIN eventos e ON c.evento_id = e.id
                ${sqlWhereActual}
            `, paramsActual),

            pool.query(`
                SELECT COALESCE(SUM(c.subtotal), 0) AS total
                FROM compras c
                JOIN eventos e ON c.evento_id = e.id
                ${sqlWhereAnterior}
            `, paramsAnterior),

            pool.query(`
                SELECT COALESCE(SUM(c.cantidad), 0) AS total
                FROM compras c
                JOIN eventos e ON c.evento_id = e.id
                ${sqlWhereTickets}
            `, paramsTickets),

            pool.query(`
                SELECT COALESCE(SUM(z.stock), 0) AS total
                FROM zonas_evento z
                JOIN eventos e ON z.evento_id = e.id
                ${sqlWhereStock}
            `, paramsStock),

            pool.query(`SELECT COUNT(*) AS total FROM eventos e ${sqlWhereEvActivos}`, paramsEvActivos),
            pool.query(`SELECT COUNT(*) AS total FROM eventos e ${sqlWhereEvTotales}`, paramsEvTotales),
            pool.query(queryUsers, paramsUsers),
            pool.query(queryOrgs, paramsOrgs),
            pool.query(queryNuevos, paramsNuevos),

            pool.query(trendQuery, paramsTrend),

            pool.query(`
                SELECT e.titulo,
                       COALESCE(SUM(c.subtotal), 0) AS recaudacion,
                       COALESCE(SUM(c.cantidad), 0) AS asistencia
                FROM compras c
                JOIN eventos e ON c.evento_id = e.id
                ${sqlWhereTop}
                GROUP BY e.id, e.titulo
                ORDER BY recaudacion DESC
                LIMIT 5
            `, paramsTop),

            pool.query(`
                SELECT z.nombre AS categoria,
                       COALESCE(SUM(c.cantidad), 0) AS tickets,
                       COALESCE(SUM(c.subtotal), 0) AS ingresos
                FROM compras c
                JOIN zonas_evento z ON c.zona_id = z.id
                JOIN eventos e ON c.evento_id = e.id
                ${sqlWhereDist}
                GROUP BY z.nombre
                ORDER BY tickets DESC
            `, paramsDist),

            pool.query(`
                SELECT c.id,
                       c.cantidad,
                       c.subtotal,
                       c.estado,
                       c.fecha_compra,
                       u.nombre AS usuario_nombre,
                       u.apellido AS usuario_apellido,
                       e.titulo AS evento_titulo
                FROM compras c
                JOIN usuarios u ON c.usuario_id = u.id
                JOIN eventos e ON c.evento_id = e.id
                ${sqlWhereAct}
                ORDER BY c.fecha_compra DESC
                LIMIT 20
            `, paramsAct),

            obtenerFiltrosDisponiblesAdmin({ anio, mes, categoria, organizadorId, eventoId, estadoEvento })
        ]);

        // Cálculo del % de crecimiento de ingresos
        const ingresosMesActual   = parseFloat(rowsIngresosMesActual[0].total);
        const ingresosMesAnterior = parseFloat(rowsIngresosMesAnterior[0].total);
        const crecimientoIngresos = ingresosMesAnterior > 0
            ? ((ingresosMesActual - ingresosMesAnterior) / ingresosMesAnterior) * 100
            : ingresosMesActual > 0 ? 100 : 0;

        // Tickets vendidos y capacidad
        const ticketsVendidos   = Number(rowsTicketsVendidos[0].total);
        const capacidadRestante = Number(rowsCapacidadRestante[0].total);
        const capacidadTotal    = ticketsVendidos + capacidadRestante;

        // Rellenar días vacíos en la tendencia
        const tendenciaCompleta = [];
        if (trendByMonth) {
            const mesesMapa = new Map(rowsTendencia.map(r => [Number(r.dia), r]));
            const nombresMeses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Set", "Oct", "Nov", "Dic"];
            for (let m = 1; m <= 12; m++) {
                const reg = mesesMapa.get(m);
                tendenciaCompleta.push({
                    dia: nombresMeses[m - 1],
                    ingresos: reg ? parseFloat(reg.ingresos) : 0,
                    tickets: reg ? Number(reg.tickets) : 0
                });
            }
        } else {
            const diasMapa = new Map(rowsTendencia.map(r => [r.dia, r]));
            const iterador = new Date(startTrendDate);
            while (iterador <= endTrendDate) {
                const fechaStr = iterador.toISOString().slice(0, 10);
                const diaReg = diasMapa.get(fechaStr);
                tendenciaCompleta.push({
                    dia: fechaStr,
                    ingresos: diaReg ? parseFloat(diaReg.ingresos) : 0,
                    tickets: diaReg ? Number(diaReg.tickets) : 0
                });
                iterador.setDate(iterador.getDate() + 1);
            }
        }

        res.json({
            kpis: {
                ingresos: {
                    actual:      ingresosMesActual,
                    anterior:    ingresosMesAnterior,
                    crecimiento: Math.round(crecimientoIngresos * 10) / 10,
                },
                tickets: {
                    vendidos:  ticketsVendidos,
                    capacidad: capacidadTotal,
                },
                eventos: {
                    activos: Number(rowsEventosActivos[0].total),
                    totales: Number(rowsEventosTotales[0].total),
                },
                usuarios: {
                    total:         Number(rowsUsuariosTotal[0].total),
                    organizadores: Number(rowsOrganizadores[0].total),
                    nuevosEstaSemana: Number(rowsUsuariosNuevos[0].total),
                },
            },
            tendencia30dias: tendenciaCompleta,
            topEventos: rowsTopEventos.map(r => ({
                titulo:      r.titulo,
                recaudacion: parseFloat(r.recaudacion),
                asistencia:  Number(r.asistencia),
            })),
            distribucion: rowsDistribucion.map(r => ({
                categoria: r.categoria,
                tickets:   Number(r.tickets),
                ingresos:  parseFloat(r.ingresos),
            })),
            actividadReciente: rowsActividad.map(r => ({
                id:       r.id,
                tipo:     'Compra de Ticket',
                usuario:  `${r.usuario_nombre} ${r.usuario_apellido}`,
                evento:   r.evento_titulo,
                cantidad: r.cantidad,
                monto:    parseFloat(r.subtotal),
                estado:   r.estado,
                fecha:    r.fecha_compra,
            })),
            filtrosValidos
        });
    } catch (error) {
        const idError = logError('Admin.obtenerMetricasDashboard', error);
        res.status(500).json({ mensaje: 'Error al obtener métricas del dashboard.', referencia: idError });
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

// ─── Gestión de Compras ───────────────────────────────────────────────────────

const listarCompras = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT
                c.id,
                c.cantidad,
                c.subtotal     AS total,
                c.estado,
                c.fecha_compra AS fecha,
                u.nombre,
                u.apellido,
                u.email,
                e.titulo       AS evento
            FROM compras c
            JOIN usuarios u ON c.usuario_id = u.id
            JOIN eventos e  ON c.evento_id  = e.id
            WHERE c.estado = 'confirmado'
            ORDER BY c.fecha_compra DESC
        `);

        res.json({
            compras: rows.map(r => ({
                id:       r.id,
                nombre:   `${r.nombre} ${r.apellido}`,
                email:    r.email,
                evento:   r.evento,
                cantidad: r.cantidad,
                total:    parseFloat(r.total),
                fecha:    r.fecha,
            })),
        });
    } catch (error) {
        const idError = logError('Admin.listarCompras', error);
        res.status(500).json({ mensaje: 'Error al obtener compras.', referencia: idError });
    }
};

module.exports = {
    obtenerMetricas,
    obtenerMetricasDashboard,
    crearUsuarioAdmin,
    listarUsuarios,
    obtenerUsuario,
    editarUsuario,
    eliminarUsuario,
    listarEventosAdmin,
    obtenerEventoAdmin,
    cambiarEstadoEvento,
    listarCompras,
};
