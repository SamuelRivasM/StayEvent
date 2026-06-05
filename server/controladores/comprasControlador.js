// Operaciones de compra (usa transacciones con bloqueo pesimista FOR UPDATE)

const { pool } = require('../config/db');
const crypto = require('crypto');
const { logError } = require('../config/logger');
const { MAX_CANTIDAD_COMPRA, MAX_INTENTOS_CODIGO } = require('../config/constantes');

// Genera un código STE-XXXXXX único controlando el límite de intentos
const generarCodigoIngreso = async () => {
    let codigo;
    let existe;
    let intentos = 0;

    do {
        if (intentos >= MAX_INTENTOS_CODIGO) {
            throw new Error('No se pudo generar un código único tras múltiples intentos.');
        }

        const parte = crypto.randomBytes(3).toString('hex').toUpperCase();
        codigo = `STE-${parte}`;
        const [filas] = await pool.execute(
            'SELECT COUNT(*) AS count FROM compras WHERE codigo_ingreso = ?',
            [codigo]
        );
        existe = filas[0].count > 0;
        intentos++;
    } while (existe);

    return codigo;
};

// Parsea y valida que sea entero positivo (> 0)
const parseEnteroPositivo = (valor) => {
    const num = parseInt(valor, 10);
    return Number.isInteger(num) && num > 0 ? num : null;
};

const crearCompra = async (req, res) => {
    const { evento_id, zona_id, cantidad } = req.body;

    // Validación estricta de tipos
    if (!evento_id || !zona_id || !cantidad) {
        return res.status(400).json({ mensaje: 'Datos de compra incompletos.' });
    }

    const eventoIdInt = parseEnteroPositivo(evento_id);
    const zonaIdInt = parseEnteroPositivo(zona_id);
    const cantidadInt = parseEnteroPositivo(cantidad);

    if (!eventoIdInt) {
        return res.status(400).json({ mensaje: 'ID de evento inválido.' });
    }
    if (!zonaIdInt) {
        return res.status(400).json({ mensaje: 'ID de zona inválido.' });
    }
    if (!cantidadInt || cantidadInt > MAX_CANTIDAD_COMPRA) {
        return res.status(400).json({ mensaje: `Cantidad inválida. Máximo ${MAX_CANTIDAD_COMPRA} entradas.` });
    }

    const usuario_id = req.usuario.id;
    const conn = await pool.getConnection();

    try {
        await conn.beginTransaction();

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

        await conn.execute(
            'UPDATE zonas_evento SET stock = stock - ? WHERE id = ?',
            [cantidadInt, zonaIdInt]
        );

        const codigo_ingreso = await generarCodigoIngreso();
        const subtotal = Number(zona.precio) * cantidadInt;

        await conn.execute(
            `INSERT INTO compras (usuario_id, evento_id, zona_id, cantidad, subtotal, codigo_ingreso, estado)
             VALUES (?, ?, ?, ?, ?, ?, 'confirmado')`,
            [usuario_id, eventoIdInt, zonaIdInt, cantidadInt, subtotal, codigo_ingreso]
        );

        await conn.commit();

        res.status(201).json({
            mensaje: 'Compra realizada con éxito.',
            codigo_ingreso,
            subtotal,
        });
    } catch (error) {
        await conn.rollback();
        const idError = logError('Compras.crearCompra', error);
        res.status(500).json({ mensaje: 'Error al procesar la compra.', referencia: idError });
    } finally {
        conn.release();
    }
};

const obtenerMisTickets = async (req, res) => {
    const usuario_id = req.usuario.id;

    try {
        const [compras] = await pool.execute(
            `SELECT c.id, c.cantidad, c.subtotal, c.codigo_ingreso, c.estado, c.fecha_compra,
                    e.titulo AS evento_titulo, e.fecha AS evento_fecha, e.hora AS evento_hora,
                    e.lugar AS evento_lugar, e.distrito AS evento_distrito,
                    e.descripcion AS evento_descripcion, e.categoria AS evento_categoria,
                    z.nombre AS zona_nombre
             FROM compras c
             JOIN eventos e ON c.evento_id = e.id
             JOIN zonas_evento z ON c.zona_id = z.id
             WHERE c.usuario_id = ?
             ORDER BY c.fecha_compra DESC`,
            [usuario_id]
        );

        res.json({ compras });
    } catch (error) {
        const idError = logError('Compras.obtenerMisTickets', error);
        res.status(500).json({ mensaje: 'Error al obtener tus tickets.', referencia: idError });
    }
};

module.exports = { crearCompra, obtenerMisTickets };

