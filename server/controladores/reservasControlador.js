// ─────────────────────────────────────────────────────────────
//  Reservas Temporales — Ticket Holding (anti-overselling)
//
//  Flujo:
//    1. crearReserva   → Bloquea stock temporalmente (10 min)
//    2. confirmarReserva → Convierte la reserva en compra definitiva
//    3. cancelarReserva  → Libera el stock manualmente
//    4. obtenerEstadoZonas → Muestra disponibilidad real con reservas
// ─────────────────────────────────────────────────────────────

const { pool } = require('../config/db');
const crypto = require('crypto');
const { logError } = require('../config/logger');
const { MAX_CANTIDAD_COMPRA, MAX_INTENTOS_CODIGO, RESERVA_DURACION_MIN } = require('../config/constantes');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const parseEnteroPositivo = (valor) => {
    const num = parseInt(valor, 10);
    return Number.isInteger(num) && num > 0 ? num : null;
};

const generarCodigoIngreso = async (conn) => {
    let codigo;
    let existe;
    let intentos = 0;

    do {
        if (intentos >= MAX_INTENTOS_CODIGO) {
            throw new Error('No se pudo generar un código único tras múltiples intentos.');
        }

        const parte = crypto.randomBytes(3).toString('hex').toUpperCase();
        codigo = `STE-${parte}`;
        const [filas] = await conn.execute(
            'SELECT COUNT(*) AS count FROM compras WHERE codigo_ingreso = ?',
            [codigo]
        );
        existe = filas[0].count > 0;
        intentos++;
    } while (existe);

    return codigo;
};

// ─── 1. Crear Reserva ─────────────────────────────────────────────────────────

const crearReserva = async (req, res) => {
    const { evento_id, zona_id, cantidad } = req.body;

    if (!evento_id || !zona_id || !cantidad) {
        return res.status(400).json({ mensaje: 'Datos de reserva incompletos.' });
    }

    const eventoIdInt   = parseEnteroPositivo(evento_id);
    const zonaIdInt     = parseEnteroPositivo(zona_id);
    const cantidadInt   = parseEnteroPositivo(cantidad);

    if (!eventoIdInt) return res.status(400).json({ mensaje: 'ID de evento inválido.' });
    if (!zonaIdInt)   return res.status(400).json({ mensaje: 'ID de zona inválido.' });
    if (!cantidadInt || cantidadInt > MAX_CANTIDAD_COMPRA) {
        return res.status(400).json({ mensaje: `Cantidad inválida. Máximo ${MAX_CANTIDAD_COMPRA} entradas.` });
    }

    const usuario_id = req.usuario.id;
    const conn = await pool.getConnection();

    try {
        await conn.beginTransaction();

        // Verificar que el usuario no tenga ya una reserva activa para esta zona
        const [reservasActivas] = await conn.execute(
            `SELECT id FROM reservas_temporales
             WHERE usuario_id = ? AND zona_id = ? AND expira_en > NOW()`,
            [usuario_id, zonaIdInt]
        );

        if (reservasActivas.length > 0) {
            await conn.rollback();
            return res.status(409).json({
                mensaje: 'Ya tienes una reserva activa para esta zona. Confírmala o espera a que expire.',
            });
        }

        // Bloqueo pesimista sobre la zona
        const [zonas] = await conn.execute(
            `SELECT z.id, z.precio, z.stock
             FROM zonas_evento z
             JOIN eventos e ON z.evento_id = e.id
             WHERE z.id = ? AND z.evento_id = ? AND z.activo = 1 AND e.activo = 1 AND e.eliminado = 0
             FOR UPDATE`,
            [zonaIdInt, eventoIdInt]
        );

        if (zonas.length === 0) {
            await conn.rollback();
            return res.status(404).json({ mensaje: 'Zona o evento no encontrado.' });
        }

        const zona = zonas[0];

        if (zona.stock < cantidadInt) {
            await conn.rollback();
            return res.status(409).json({ mensaje: 'Stock insuficiente para esta zona.' });
        }

        // Descontar stock temporalmente
        await conn.execute(
            'UPDATE zonas_evento SET stock = stock - ? WHERE id = ?',
            [cantidadInt, zonaIdInt]
        );

        const subtotal = Number(zona.precio) * cantidadInt;

        // Insertar reserva temporal
        const [resultado] = await conn.execute(
            `INSERT INTO reservas_temporales (usuario_id, evento_id, zona_id, cantidad, subtotal, expira_en)
             VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))`,
            [usuario_id, eventoIdInt, zonaIdInt, cantidadInt, subtotal, RESERVA_DURACION_MIN]
        );

        // Obtener la fecha de expiración insertada
        const [reservaCreada] = await conn.execute(
            'SELECT expira_en FROM reservas_temporales WHERE id = ?',
            [resultado.insertId]
        );

        await conn.commit();

        res.status(201).json({
            mensaje: 'Reserva creada. Tienes 10 minutos para confirmar.',
            reserva: {
                id:        resultado.insertId,
                subtotal,
                cantidad:  cantidadInt,
                expira_en: reservaCreada[0].expira_en,
            },
        });
    } catch (error) {
        await conn.rollback();
        const idError = logError('Reservas.crearReserva', error);
        res.status(500).json({ mensaje: 'Error al crear la reserva.', referencia: idError });
    } finally {
        conn.release();
    }
};

// ─── 2. Confirmar Reserva (simula pago exitoso) ──────────────────────────────

const confirmarReserva = async (req, res) => {
    const reservaId = parseEnteroPositivo(req.params.id);
    if (!reservaId) return res.status(400).json({ mensaje: 'ID de reserva inválido.' });

    const usuario_id = req.usuario.id;
    const conn = await pool.getConnection();

    try {
        await conn.beginTransaction();

        // Verificar la reserva con bloqueo
        const [reservas] = await conn.execute(
            `SELECT id, evento_id, zona_id, cantidad, subtotal, expira_en
             FROM reservas_temporales
             WHERE id = ? AND usuario_id = ?
             FOR UPDATE`,
            [reservaId, usuario_id]
        );

        if (reservas.length === 0) {
            await conn.rollback();
            return res.status(404).json({ mensaje: 'Reserva no encontrada.' });
        }

        const reserva = reservas[0];

        // Verificar que no haya expirado
        if (new Date(reserva.expira_en) < new Date()) {
            // La reserva expiró pero el job aún no la limpió — liberar ahora
            await conn.execute(
                'UPDATE zonas_evento SET stock = stock + ? WHERE id = ?',
                [reserva.cantidad, reserva.zona_id]
            );
            await conn.execute('DELETE FROM reservas_temporales WHERE id = ?', [reservaId]);
            await conn.commit();
            return res.status(410).json({ mensaje: 'La reserva ha expirado. Inténtalo de nuevo.' });
        }

        // Generar código de ingreso y crear la compra definitiva
        const codigo_ingreso = await generarCodigoIngreso(conn);

        await conn.execute(
            `INSERT INTO compras (usuario_id, evento_id, zona_id, cantidad, subtotal, codigo_ingreso, estado)
             VALUES (?, ?, ?, ?, ?, ?, 'confirmado')`,
            [usuario_id, reserva.evento_id, reserva.zona_id, reserva.cantidad, reserva.subtotal, codigo_ingreso]
        );

        // Eliminar la reserva temporal (el stock ya fue descontado)
        await conn.execute('DELETE FROM reservas_temporales WHERE id = ?', [reservaId]);

        await conn.commit();

        res.status(200).json({
            mensaje: 'Compra confirmada con éxito.',
            codigo_ingreso,
            subtotal: Number(reserva.subtotal),
        });
    } catch (error) {
        await conn.rollback();
        const idError = logError('Reservas.confirmarReserva', error);
        res.status(500).json({ mensaje: 'Error al confirmar la reserva.', referencia: idError });
    } finally {
        conn.release();
    }
};

// ─── 3. Cancelar Reserva (liberación manual) ─────────────────────────────────

const cancelarReserva = async (req, res) => {
    const reservaId = parseEnteroPositivo(req.params.id);
    if (!reservaId) return res.status(400).json({ mensaje: 'ID de reserva inválido.' });

    const usuario_id = req.usuario.id;
    const conn = await pool.getConnection();

    try {
        await conn.beginTransaction();

        const [reservas] = await conn.execute(
            `SELECT id, zona_id, cantidad
             FROM reservas_temporales
             WHERE id = ? AND usuario_id = ?
             FOR UPDATE`,
            [reservaId, usuario_id]
        );

        if (reservas.length === 0) {
            await conn.rollback();
            return res.status(404).json({ mensaje: 'Reserva no encontrada.' });
        }

        const reserva = reservas[0];

        // Restaurar stock
        await conn.execute(
            'UPDATE zonas_evento SET stock = stock + ? WHERE id = ?',
            [reserva.cantidad, reserva.zona_id]
        );

        // Eliminar reserva
        await conn.execute('DELETE FROM reservas_temporales WHERE id = ?', [reservaId]);

        await conn.commit();

        res.json({ mensaje: 'Reserva cancelada. El stock ha sido liberado.' });
    } catch (error) {
        await conn.rollback();
        const idError = logError('Reservas.cancelarReserva', error);
        res.status(500).json({ mensaje: 'Error al cancelar la reserva.', referencia: idError });
    } finally {
        conn.release();
    }
};

// ─── 4. Estado de zonas con reservas activas ─────────────────────────────────

const obtenerEstadoZonas = async (req, res) => {
    const eventoId = parseEnteroPositivo(req.params.eventoId);
    if (!eventoId) return res.status(400).json({ mensaje: 'ID de evento inválido.' });

    try {
        const [zonas] = await pool.query(
            `SELECT z.id, z.nombre, z.precio, z.stock,
                    COALESCE(r.reservadas, 0) AS reservadas
             FROM zonas_evento z
             LEFT JOIN (
                 SELECT zona_id, SUM(cantidad) AS reservadas
                 FROM reservas_temporales
                 WHERE evento_id = ? AND expira_en > NOW()
                 GROUP BY zona_id
             ) r ON r.zona_id = z.id
             WHERE z.evento_id = ? AND z.activo = 1
             ORDER BY z.precio ASC`,
            [eventoId, eventoId]
        );

        res.json({ zonas });
    } catch (error) {
        const idError = logError('Reservas.obtenerEstadoZonas', error);
        res.status(500).json({ mensaje: 'Error al obtener el estado de zonas.', referencia: idError });
    }
};

module.exports = { crearReserva, confirmarReserva, cancelarReserva, obtenerEstadoZonas };
