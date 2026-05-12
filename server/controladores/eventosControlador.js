const { pool } = require('../config/db');

const obtenerEventos = async (req, res) => {
    try {
        const { categoria, distrito, precio_max, busqueda } = req.query;

        let query = `
            SELECT id, titulo, descripcion, categoria, fecha, hora,
                   distrito, lugar, precio, imagen_url
            FROM eventos
            WHERE activo = 1
        `;
        const params = [];

        if (categoria) {
            query += ' AND categoria = ?';
            params.push(categoria);
        }
        if (distrito) {
            query += ' AND distrito = ?';
            params.push(distrito);
        }
        if (precio_max !== undefined && precio_max !== '') {
            query += ' AND precio <= ?';
            params.push(Number(precio_max));
        }
        if (busqueda) {
            query += ' AND titulo LIKE ?';
            params.push(`%${busqueda}%`);
        }

        query += ' ORDER BY fecha ASC';

        const [eventos] = await pool.query(query, params);
        res.json({ eventos });
    } catch (error) {
        console.error('Error al obtener eventos:', error);
        res.status(500).json({ mensaje: 'Error interno del servidor.' });
    }
};

module.exports = { obtenerEventos };
