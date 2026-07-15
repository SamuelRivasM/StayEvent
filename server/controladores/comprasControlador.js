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

const exportarComprasCSV = async (req, res) => {
    let baseSql = `
        FROM compras c
        JOIN usuarios u ON c.usuario_id = u.id
        JOIN eventos e ON c.evento_id = e.id
        JOIN zonas_evento z ON c.zona_id = z.id
    `;
    let conditions = [];
    let params = [];

    // Security check: if the user is an organizer, we FORCE the restriction e.organizador_id = user_id
    if (req.usuario.role === 'organizador' || req.usuario.rol === 'organizador') {
        conditions.push("e.organizador_id = ?");
        params.push(req.usuario.id);
    } else if (req.usuario.role === 'admin' || req.usuario.rol === 'admin') {
        // Admin can filter by any organizer
        if (req.query.organizadorId) {
            conditions.push("e.organizador_id = ?");
            params.push(parseInt(req.query.organizadorId, 10));
        }
    } else {
        return res.status(403).json({ mensaje: 'Acceso denegado.' });
    }

    // Dynamic filters
    if (req.query.anio) {
        conditions.push("YEAR(c.fecha_compra) = ?");
        params.push(parseInt(req.query.anio, 10));
    }
    if (req.query.mes) {
        conditions.push("MONTH(c.fecha_compra) = ?");
        params.push(parseInt(req.query.mes, 10));
    }
    if (req.query.categoria) {
        conditions.push("e.categoria = ?");
        params.push(req.query.categoria);
    }
    if (req.query.eventoId) {
        conditions.push("c.evento_id = ?");
        params.push(parseInt(req.query.eventoId, 10));
    }
    if (req.query.estadoEvento) {
        const estado = req.query.estadoEvento;
        if (estado === 'activo') {
            conditions.push("e.activo = 1");
        } else if (estado === 'inactivo') {
            conditions.push("e.activo = 0");
        } else if (estado === 'agotado') {
            conditions.push("(SELECT COALESCE(SUM(ze.stock), 0) FROM zonas_evento ze WHERE ze.evento_id = e.id) = 0");
        }
    }

    const whereClause = conditions.length > 0 ? " WHERE " + conditions.join(" AND ") : "";

    try {
        // 1. Obtener conteo total para controlar el bucle de lotes (chunks)
        const countSql = `SELECT COUNT(*) AS total ${baseSql} ${whereClause}`;
        const [countRows] = await pool.query(countSql, params);
        const totalRegistros = countRows[0].total;

        // Configurar cabeceras de respuesta para descarga de archivo
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=reporte_ventas_${new Date().toISOString().slice(0, 10)}.csv`);
        
        // Escribir BOM UTF-8 para soporte de caracteres especiales en Excel
        res.write('\uFEFF');
        
        // Escribir cabecera del CSV
        res.write('ID,Fecha,Cliente,Email,Evento,Categoria,Zona,Cantidad,Monto (S/),Estado,Codigo Ingreso\n');

        if (totalRegistros === 0) {
            return res.end();
        }

        const CHUNK_SIZE = 500;
        const querySql = `
            SELECT c.id, c.fecha_compra, c.cantidad, c.subtotal, c.estado, c.codigo_ingreso,
                   u.nombre AS usuario_nombre, u.apellido AS usuario_apellido, u.email AS usuario_email,
                   e.titulo AS evento_titulo, e.categoria AS evento_categoria,
                   z.nombre AS zona_nombre
            ${baseSql}
            ${whereClause}
            ORDER BY c.fecha_compra DESC
            LIMIT ? OFFSET ?
        `;

        const escaparCSV = (val) => {
            if (val === null || val === undefined) return '';
            let str = String(val);
            if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
                str = '"' + str.replace(/"/g, '""') + '"';
            }
            return str;
        };

        for (let offset = 0; offset < totalRegistros; offset += CHUNK_SIZE) {
            // Ejecutar consulta por lote (pasar parámetros limpios)
            const [rows] = await pool.query(querySql, [...params, CHUNK_SIZE, offset]);
            
            let chunkContent = '';
            for (const row of rows) {
                const fechaFmt = new Date(row.fecha_compra).toLocaleString('es-PE', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit', second: '2-digit'
                });
                const clienteNombre = `${row.usuario_nombre} ${row.usuario_apellido}`;
                
                chunkContent += [
                    row.id,
                    escaparCSV(fechaFmt),
                    escaparCSV(clienteNombre),
                    escaparCSV(row.usuario_email),
                    escaparCSV(row.evento_titulo),
                    escaparCSV(row.evento_categoria),
                    escaparCSV(row.zona_nombre),
                    row.cantidad,
                    Number(row.subtotal).toFixed(2),
                    escaparCSV(row.estado),
                    escaparCSV(row.codigo_ingreso)
                ].join(',') + '\n';
            }
            
            // Escribir el lote actual en el response stream
            res.write(chunkContent);
        }

        // Finalizar el response stream
        res.end();
    } catch (error) {
        const idError = logError('Compras.exportarComprasCSV', error);
        // Si no se han enviado cabeceras, devolver error 500
        if (!res.headersSent) {
            res.status(500).json({ mensaje: 'Error al exportar los datos.', referencia: idError });
        } else {
            res.end();
        }
    }
};

module.exports = { crearCompra, obtenerMisTickets, exportarComprasCSV };

