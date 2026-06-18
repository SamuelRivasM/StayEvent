// ─────────────────────────────────────────────────────────────
//  Check-in — Validación de QR para control de asistencia
//
//  Flujo:
//    1. registrarCheckin    → Valida el código QR y marca asistencia
//    2. obtenerCheckins     → Lista check-ins de un evento (organizador)
//    3. estadisticasCheckin → Métricas de asistencia por evento
// ─────────────────────────────────────────────────────────────

const { pool } = require('../config/db');
const { logError } = require('../config/logger');

// ─── 1. Registrar check-in por código QR ─────────────────────────────────────

const registrarCheckin = async (req, res) => {
    const { codigo_ingreso } = req.body;

    if (!codigo_ingreso || typeof codigo_ingreso !== 'string') {
        return res.status(400).json({ mensaje: 'Código de ingreso requerido.' });
    }

    const codigoNorm = codigo_ingreso.trim().toUpperCase();

    // Patrón válido: STE-XXXXXX
    if (!/^STE-[A-F0-9]{6}$/.test(codigoNorm)) {
        return res.status(400).json({ mensaje: 'Formato de código inválido.' });
    }

    const conn = await pool.getConnection();

    try {
        await conn.beginTransaction();

        // Buscar la compra asociada al código
        const [compras] = await conn.execute(
            `SELECT c.id, c.evento_id, c.cantidad, c.estado,
                    e.organizador_id, e.titulo AS evento_titulo
             FROM compras c
             JOIN eventos e ON c.evento_id = e.id
             WHERE c.codigo_ingreso = ? AND c.estado = 'confirmado'
             FOR UPDATE`,
            [codigoNorm]
        );

        if (compras.length === 0) {
            await conn.rollback();
            return res.status(404).json({ mensaje: 'Código no encontrado o compra no confirmada.' });
        }

        const compra = compras[0];

        // Verificar que el organizador del evento sea el que hace el check-in
        if (compra.organizador_id !== req.usuario.id) {
            await conn.rollback();
            return res.status(403).json({ mensaje: 'No tienes permisos para este evento.' });
        }

        // Verificar si ya se hizo check-in
        const [checkinExistente] = await conn.execute(
            'SELECT id FROM checkins WHERE compra_id = ?',
            [compra.id]
        );

        if (checkinExistente.length > 0) {
            await conn.rollback();
            return res.status(409).json({
                mensaje: 'Este código ya fue validado anteriormente.',
                ya_validado: true,
            });
        }

        // Registrar check-in
        await conn.execute(
            `INSERT INTO checkins (compra_id, evento_id, validado_por, cantidad_personas)
             VALUES (?, ?, ?, ?)`,
            [compra.id, compra.evento_id, req.usuario.id, compra.cantidad]
        );

        await conn.commit();

        res.status(200).json({
            mensaje: 'Check-in registrado exitosamente.',
            detalle: {
                codigo:   codigoNorm,
                evento:   compra.evento_titulo,
                personas: compra.cantidad,
            },
        });
    } catch (error) {
        await conn.rollback();
        const idError = logError('Checkin.registrarCheckin', error);
        res.status(500).json({ mensaje: 'Error al registrar el check-in.', referencia: idError });
    } finally {
        conn.release();
    }
};

// ─── 2. Listar check-ins de un evento ────────────────────────────────────────

const obtenerCheckins = async (req, res) => {
    const eventoId = parseInt(req.params.eventoId, 10);
    if (isNaN(eventoId) || eventoId <= 0) {
        return res.status(400).json({ mensaje: 'ID de evento inválido.' });
    }

    try {
        // Verificar propiedad del evento
        const [evento] = await pool.execute(
            'SELECT id FROM eventos WHERE id = ? AND organizador_id = ? AND eliminado = 0',
            [eventoId, req.usuario.id]
        );

        if (evento.length === 0) {
            return res.status(404).json({ mensaje: 'Evento no encontrado.' });
        }

        const [checkins] = await pool.query(
            `SELECT ch.id, ch.cantidad_personas, ch.fecha_checkin,
                    c.codigo_ingreso,
                    u.nombre AS usuario_nombre, u.apellido AS usuario_apellido
             FROM checkins ch
             JOIN compras c ON ch.compra_id = c.id
             JOIN usuarios u ON c.usuario_id = u.id
             WHERE ch.evento_id = ?
             ORDER BY ch.fecha_checkin DESC`,
            [eventoId]
        );

        res.json({ checkins });
    } catch (error) {
        const idError = logError('Checkin.obtenerCheckins', error);
        res.status(500).json({ mensaje: 'Error al obtener check-ins.', referencia: idError });
    }
};

// ─── 3. Estadísticas de check-in por evento ──────────────────────────────────

const estadisticasCheckin = async (req, res) => {
    try {
        const [stats] = await pool.query(
            `SELECT e.id AS evento_id, e.titulo,
                    COALESCE(SUM(c.cantidad), 0) AS entradas_vendidas,
                    COALESCE(SUM(ch.cantidad_personas), 0) AS asistentes_checkin
             FROM eventos e
             LEFT JOIN compras c ON c.evento_id = e.id AND c.estado = 'confirmado'
             LEFT JOIN checkins ch ON ch.evento_id = e.id
             WHERE e.organizador_id = ? AND e.eliminado = 0 AND e.activo = 1
             GROUP BY e.id, e.titulo
             ORDER BY e.fecha DESC`,
            [req.usuario.id]
        );

        const totalVendidas = stats.reduce((s, r) => s + Number(r.entradas_vendidas), 0);
        const totalCheckin  = stats.reduce((s, r) => s + Number(r.asistentes_checkin), 0);
        const tasaGeneral   = totalVendidas > 0
            ? Math.round((totalCheckin / totalVendidas) * 1000) / 10
            : 0;

        res.json({
            tasa_general: tasaGeneral,
            total_vendidas: totalVendidas,
            total_checkin:  totalCheckin,
            por_evento: stats.map(r => ({
                evento_id:         r.evento_id,
                titulo:            r.titulo,
                entradas_vendidas: Number(r.entradas_vendidas),
                asistentes:        Number(r.asistentes_checkin),
                tasa: Number(r.entradas_vendidas) > 0
                    ? Math.round((Number(r.asistentes_checkin) / Number(r.entradas_vendidas)) * 1000) / 10
                    : 0,
            })),
        });
    } catch (error) {
        const idError = logError('Checkin.estadisticasCheckin', error);
        res.status(500).json({ mensaje: 'Error al obtener estadísticas de check-in.', referencia: idError });
    }
};

// ─── 4. Registrar acceso rápido para un evento (acción directa) ─────────────────────
const registrarAccesoRapido = async (req, res) => {
    const eventoId = parseInt(req.params.eventoId, 10);
    if (isNaN(eventoId) || eventoId <= 0) {
        return res.status(400).json({ mensaje: 'ID de evento inválido.' });
    }

    const conn = await pool.getConnection();

    try {
        await conn.beginTransaction();

        // 1. Verificar que el evento pertenece al organizador autenticado
        const [eventos] = await conn.execute(
            'SELECT id, titulo FROM eventos WHERE id = ? AND organizador_id = ? AND eliminado = 0',
            [eventoId, req.usuario.id]
        );

        if (eventos.length === 0) {
            await conn.rollback();
            return res.status(404).json({ mensaje: 'Evento no encontrado o no tienes permisos.' });
        }

        // 2. Buscar la compra confirmada más antigua de este evento que aún no tenga check-in
        const [compras] = await conn.execute(
            `SELECT c.id, c.codigo_ingreso, c.cantidad, u.nombre, u.apellido
             FROM compras c
             JOIN usuarios u ON c.usuario_id = u.id
             LEFT JOIN checkins ch ON ch.compra_id = c.id
             WHERE c.evento_id = ? AND c.estado = 'confirmado' AND ch.id IS NULL
             ORDER BY c.fecha_compra ASC
             LIMIT 1
             FOR UPDATE`,
            [eventoId]
        );

        if (compras.length === 0) {
            await conn.rollback();
            return res.status(400).json({
                mensaje: 'No quedan entradas pendientes de validar para este evento.'
            });
        }

        const compra = compras[0];

        // 3. Registrar el check-in en la base de datos
        await conn.execute(
            `INSERT INTO checkins (compra_id, evento_id, validado_por, cantidad_personas)
             VALUES (?, ?, ?, ?)`,
            [compra.id, eventoId, req.usuario.id, compra.cantidad]
        );

        await conn.commit();

        res.status(200).json({
            mensaje: 'Acceso registrado exitosamente.',
            detalle: {
                codigo: compra.codigo_ingreso,
                evento: eventos[0].titulo,
                asistente: `${compra.nombre} ${compra.apellido}`,
                personas: compra.cantidad,
            },
        });
    } catch (error) {
        await conn.rollback();
        const idError = logError('Checkin.registrarAccesoRapido', error);
        res.status(500).json({ mensaje: 'Error al registrar el acceso.', referencia: idError });
    } finally {
        conn.release();
    }
};

module.exports = { registrarCheckin, obtenerCheckins, estadisticasCheckin, registrarAccesoRapido };
