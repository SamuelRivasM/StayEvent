const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const ROLES_VALIDOS = new Set(['admin', 'usuario', 'organizador']);

const verificarToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ mensaje: 'Acceso denegado. Token no proporcionado.' });
    }

    const token = authHeader.split(' ')[1];

    if (!token || token.length < 10) {
        return res.status(401).json({ mensaje: 'Token inválido.' });
    }

    try {
        // algoritmo explícito — previene ataques de confusión de algoritmo
        const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });

        // validar estructura del payload: id, rol y jti
        if (
            typeof decoded.id !== 'number' ||
            typeof decoded.rol !== 'string' ||
            !ROLES_VALIDOS.has(decoded.rol) ||
            typeof decoded.jti !== 'string'
        ) {
            return res.status(401).json({ mensaje: 'Token inválido.' });
        }

        // verificar sesión activa en DB
        const [sesiones] = await pool.execute(
            'SELECT activo FROM sesiones_activas WHERE jti = ? AND usuario_id = ? AND expira_en > NOW()',
            [decoded.jti, decoded.id]
        );

        // !activo cubre bool y number (typeCast de mysql2)
        if (sesiones.length === 0 || !sesiones[0].activo) {
            return res.status(401).json({ mensaje: 'Sesión inválida o cerrada. Inicia sesión nuevamente.' });
        }

        req.usuario = { id: decoded.id, rol: decoded.rol, jti: decoded.jti };
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ mensaje: 'El token ha expirado. Inicia sesión nuevamente.' });
        }
        return res.status(401).json({ mensaje: 'Token inválido.' });
    }
};

const verificarRol = (...roles) => (req, res, next) => {
    if (!req.usuario || !roles.includes(req.usuario.rol)) {
        return res.status(403).json({ mensaje: 'Acceso denegado.' });
    }
    next();
};

module.exports = { verificarToken, verificarRol };
