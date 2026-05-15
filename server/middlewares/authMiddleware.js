const jwt = require('jsonwebtoken');

const ROLES_VALIDOS = new Set(['admin', 'usuario', 'organizador']);

const verificarToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ mensaje: 'Acceso denegado. Token no proporcionado.' });
    }

    const token = authHeader.split(' ')[1];

    if (!token || token.length < 10) {
        return res.status(401).json({ mensaje: 'Token inválido.' });
    }

    try {
        // Especificar algoritmo explícitamente previene ataques de confusión de algoritmo
        const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });

        // Validar que el payload tenga la estructura esperada
        if (
            typeof decoded.id !== 'number' ||
            typeof decoded.rol !== 'string' ||
            !ROLES_VALIDOS.has(decoded.rol)
        ) {
            return res.status(401).json({ mensaje: 'Token inválido.' });
        }

        // Exponer solo los campos necesarios, no todo el payload decodificado
        req.usuario = { id: decoded.id, rol: decoded.rol };
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ mensaje: 'El token ha expirado. Inicia sesión nuevamente.' });
        }
        return res.status(401).json({ mensaje: 'Token inválido.' });
    }
};

module.exports = { verificarToken };
