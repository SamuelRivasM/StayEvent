const { pool } = require('../config/db');
const crypto = require('crypto');

const generarCodigoIngreso = async () => {
    let codigo;
    let existe;
    do {
        const parte = crypto.randomBytes(3).toString('hex').toUpperCase();
        codigo = `STE-${parte}`;
        const [filas] = await pool.execute(
            'SELECT COUNT(*) AS count FROM compras WHERE codigo_ingreso = ?',
            [codigo]
        );
        existe = filas[0].count > 0;
    } while (existe);
    return codigo;
};

const crearCompra = async (req, res) => {
    const { evento_id, zona_id, cantidad } = req.body;
    const usuario_id = req.usuario.id;

    if (!evento_id || !zona_id || !cantidad) {
        return res.status(400).json({ mensaje: 'Datos de compra incompletos.' });
    }

    const cantidadInt = parseInt(cantidad, 10);
    if (isNaN(cantidadInt) || cantidadInt < 1 || cantidadInt > 20) {
        return res.status(400).json({ mensaje: 'Cantidad inválida.' });
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [zonas] = await conn.execute(
            `SELECT z.id, z.precio, z.stock
             FROM zonas_evento z
             JOIN eventos e ON z.evento_id = e.id
             WHERE z.id = ? AND z.evento_id = ? AND z.activo = 1 AND e.activo = 1 AND e.eliminado = 0
             FOR UPDATE`,
            [zona_id, evento_id]
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
            [cantidadInt, zona_id]
        );

        const codigo_ingreso = await generarCodigoIngreso();
        const subtotal = Number(zona.precio) * cantidadInt;

        await conn.execute(
            `INSERT INTO compras (usuario_id, evento_id, zona_id, cantidad, subtotal, codigo_ingreso, estado)
             VALUES (?, ?, ?, ?, ?, ?, 'confirmado')`,
            [usuario_id, evento_id, zona_id, cantidadInt, subtotal, codigo_ingreso]
        );

        await conn.commit();

        res.status(201).json({
            mensaje: 'Compra realizada con éxito.',
            codigo_ingreso,
            subtotal,
        });
    } catch (error) {
        await conn.rollback();
        console.error('Error en crearCompra:', error.message);
        res.status(500).json({ mensaje: 'Error al procesar la compra.' });
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
        console.error('Error en obtenerMisTickets:', error.message);
        res.status(500).json({ mensaje: 'Error al obtener tus tickets.' });
    }
};

module.exports = { crearCompra, obtenerMisTickets };
