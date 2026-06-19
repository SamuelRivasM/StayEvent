const { pool } = require('../config/db');
const { logError } = require('../config/logger');

// ─── Helpers ───────────────────────────────────────────────────────────────────

const sanitizarStr = (str) => {
    if (typeof str !== 'string') return '';
    return str
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/&(?!(?:amp|lt|gt|quot|#x27);)/g, '&amp;')
        .slice(0, 300);
};

const tiempoRelativo = (fecha) => {
    const diff = Date.now() - new Date(fecha).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1)  return 'Ahora mismo';
    if (min < 60) return `Hace ${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24)   return `Hace ${h} hora${h > 1 ? 's' : ''}`;
    return `Hace ${Math.floor(h / 24)} día(s)`;
};

// ─── Generadores de alertas ────────────────────────────────────────────────────

const alertasAdmin = async () => {
    const lista = [];
    let id = Date.now();

    try {
        const [rows] = await pool.query(`
            SELECT e.titulo,
                   COALESCE(SUM(c.cantidad), 0) AS vendidas,
                   (SELECT COALESCE(SUM(z.stock), 0)
                    FROM zonas_evento z WHERE z.evento_id = e.id AND z.activo = 1)
                   + COALESCE(SUM(c.cantidad), 0) AS capacidad
            FROM eventos e
            LEFT JOIN compras c ON c.evento_id = e.id AND c.estado = 'confirmado'
            WHERE e.activo = 1 AND e.eliminado = 0
            GROUP BY e.id, e.titulo
            HAVING capacidad > 0 AND (vendidas / capacidad) >= 0.8
            ORDER BY (vendidas / capacidad) DESC
            LIMIT 3
        `);
        for (const ev of rows) {
            const pct = Math.round((ev.vendidas / ev.capacidad) * 100);
            lista.push({
                id: id++,
                tipo: pct >= 95 ? 'warning' : 'info',
                mensaje: `El evento "${sanitizarStr(ev.titulo)}" ha superado el ${pct}% de aforo.`,
                tiempo: tiempoRelativo(new Date()),
            });
        }
    } catch {}

    try {
        const [rows] = await pool.query(`
            SELECT
                COALESCE(SUM(CASE WHEN fecha_compra >= DATE_SUB(NOW(), INTERVAL 2 HOUR)
                               THEN subtotal ELSE 0 END), 0) AS ultimas2h,
                COALESCE(SUM(CASE WHEN fecha_compra >= DATE_SUB(NOW(), INTERVAL 26 HOUR)
                               AND fecha_compra  < DATE_SUB(NOW(), INTERVAL 2 HOUR)
                               THEN subtotal ELSE 0 END), 0) / 12 AS promedio2h
            FROM compras
            WHERE estado = 'confirmado'
              AND fecha_compra >= DATE_SUB(NOW(), INTERVAL 26 HOUR)
        `);
        const { ultimas2h, promedio2h } = rows[0];
        if (Number(promedio2h) > 0 && Number(ultimas2h) > Number(promedio2h) * 1.4) {
            const pct = Math.round(((ultimas2h - promedio2h) / promedio2h) * 100);
            lista.push({
                id: id++,
                tipo: 'info',
                mensaje: `Pico inusual de ventas detectado en las últimas 2 horas (+${pct}% vs. promedio).`,
                tiempo: tiempoRelativo(new Date()),
            });
        }
    } catch {}

    try {
        const [rows] = await pool.query(`
            SELECT COUNT(*) AS total, COALESCE(SUM(subtotal), 0) AS monto
            FROM compras
            WHERE estado = 'confirmado'
              AND fecha_compra >= DATE_SUB(NOW(), INTERVAL 30 MINUTE)
        `);
        if (Number(rows[0].total) > 0) {
            lista.push({
                id: id++,
                tipo: 'success',
                mensaje: `${rows[0].total} compra(s) nuevas en los últimos 30 min (S/ ${Number(rows[0].monto).toFixed(2)}).`,
                tiempo: tiempoRelativo(new Date()),
            });
        }
    } catch {}

    try {
        const [rows] = await pool.query(`
            SELECT COUNT(*) AS total
            FROM eventos
            WHERE DATE(created_at) = CURDATE() AND activo = 1 AND eliminado = 0
        `);
        if (Number(rows[0].total) > 0) {
            lista.push({
                id: id++,
                tipo: 'success',
                mensaje: `${rows[0].total} evento(s) nuevo(s) publicado(s) y activo(s) hoy.`,
                tiempo: tiempoRelativo(new Date()),
            });
        }
    } catch {}

    return lista.slice(0, 10);
};

// eventoId = null → todos los eventos del organizador
// eventoId = number → solo ese evento específico
const alertasOrganizador = async (organizadorId, eventoId = null) => {
    const lista = [];
    let id = Date.now();
    const porEvento = eventoId !== null;

    try {
        const filtroEvento = porEvento ? 'AND e.id = ?' : '';
        const params = porEvento ? [organizadorId, eventoId] : [organizadorId];
        const [rows] = await pool.query(`
            SELECT e.titulo,
                   COALESCE(SUM(c.cantidad), 0) AS vendidas,
                   (SELECT COALESCE(SUM(z.stock), 0)
                    FROM zonas_evento z WHERE z.evento_id = e.id AND z.activo = 1)
                   + COALESCE(SUM(c.cantidad), 0) AS capacidad
            FROM eventos e
            LEFT JOIN compras c ON c.evento_id = e.id AND c.estado = 'confirmado'
            WHERE e.organizador_id = ? ${filtroEvento} AND e.activo = 1 AND e.eliminado = 0
            GROUP BY e.id, e.titulo
            HAVING capacidad > 0 AND (vendidas / capacidad) >= 0.8
            ORDER BY (vendidas / capacidad) DESC
            LIMIT 3
        `, params);
        for (const ev of rows) {
            const pct = Math.round((ev.vendidas / ev.capacidad) * 100);
            lista.push({
                id: id++,
                tipo: pct >= 95 ? 'warning' : 'info',
                mensaje: porEvento
                    ? `El evento ha alcanzado el ${pct}% de su aforo.`
                    : `"${sanitizarStr(ev.titulo)}" ha alcanzado el ${pct}% de su aforo.`,
                tiempo: tiempoRelativo(new Date()),
            });
        }
    } catch {}

    try {
        const filtroEvento = porEvento ? 'AND c.evento_id = ?' : '';
        const params = porEvento ? [organizadorId, eventoId] : [organizadorId];
        const [rows] = await pool.query(`
            SELECT COUNT(*) AS total, COALESCE(SUM(c.subtotal), 0) AS monto
            FROM compras c
            JOIN eventos e ON c.evento_id = e.id
            WHERE e.organizador_id = ? ${filtroEvento}
              AND c.estado = 'confirmado'
              AND c.fecha_compra >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
        `, params);
        if (Number(rows[0].total) > 0) {
            lista.push({
                id: id++,
                tipo: 'success',
                mensaje: `${rows[0].total} entrada(s) vendida(s) en la última hora (S/ ${Number(rows[0].monto).toFixed(2)}).`,
                tiempo: tiempoRelativo(new Date()),
            });
        }
    } catch {}

    // checkins va en catch propio porque la tabla puede no existir en Railway
    try {
        const filtroEvento = porEvento ? 'AND c.evento_id = ?' : '';
        const params = porEvento ? [organizadorId, eventoId] : [organizadorId];
        const [rows] = await pool.query(`
            SELECT COUNT(*) AS total
            FROM checkins ch
            JOIN compras c ON ch.compra_id = c.id
            JOIN eventos e ON c.evento_id  = e.id
            WHERE e.organizador_id = ? ${filtroEvento}
              AND ch.fecha_checkin >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
        `, params);
        if (Number(rows[0].total) > 0) {
            lista.push({
                id: id++,
                tipo: 'info',
                mensaje: `${rows[0].total} check-in(s) registrado(s) en la última hora.`,
                tiempo: tiempoRelativo(new Date()),
            });
        }
    } catch {}

    return lista.slice(0, 10);
};

// ─── SSE handler ───────────────────────────────────────────────────────────────

const INTERVALO_DATOS_MS = 30_000; // alertas cada 30s
const INTERVALO_PING_MS  = 15_000; // heartbeat para mantener conexión viva

const streamInsights = async (req, res) => {
    const { id: usuarioId, rol } = req.usuario;

    try {
        // Validar y verificar propiedad del evento (solo organizador)
        let eventoId = null;
        if (rol === 'organizador' && req.query.evento_id) {
            const parsed = parseInt(req.query.evento_id, 10);
            if (!Number.isInteger(parsed) || parsed <= 0) {
                return res.status(400).json({ mensaje: 'ID de evento inválido.' });
            }
            const [check] = await pool.query(
                'SELECT id FROM eventos WHERE id = ? AND organizador_id = ? AND eliminado = 0',
                [parsed, usuarioId]
            );
            if (check.length === 0) {
                return res.status(403).json({ mensaje: 'Acceso denegado a este evento.' });
            }
            eventoId = parsed;
        }

        res.setHeader('Content-Type',      'text/event-stream');
        res.setHeader('Cache-Control',     'no-cache');
        res.setHeader('Connection',        'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders();

        const enviar = async () => {
            try {
                const alertas = rol === 'admin'
                    ? await alertasAdmin()
                    : await alertasOrganizador(usuarioId, eventoId);
                res.write(`data: ${JSON.stringify({ alertas })}\n\n`);
            } catch (e) {
                logError('Insights.stream', e);
                res.write(`data: ${JSON.stringify({ alertas: [] })}\n\n`);
            }
        };

        await enviar();

        const intervaloDatos = setInterval(enviar, INTERVALO_DATOS_MS);
        const intervaloPing  = setInterval(() => res.write(': ping\n\n'), INTERVALO_PING_MS);

        req.on('close', () => {
            clearInterval(intervaloDatos);
            clearInterval(intervaloPing);
            res.end();
        });

    } catch (e) {
        logError('Insights.stream.init', e);
        if (!res.headersSent) {
            res.status(500).json({ mensaje: 'Error al iniciar el stream de insights.' });
        } else {
            res.end();
        }
    }
};

module.exports = { streamInsights };
