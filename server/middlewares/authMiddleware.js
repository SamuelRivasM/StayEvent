const jwt = require('jsonwebtoken');

const verificarToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ mensaje: 'Acceso denegado. Token no proporcionado.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.usuario = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ mensaje: 'El token ha expirado. Inicia sesión nuevamente.' });
        }
        return res.status(401).json({ mensaje: 'Token inválido.' });
    }
};

module.exports = { verificarToken };
