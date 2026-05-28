const validarEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email?.trim() || '');
};

const sanitizarString = (str) => {
    if (typeof str !== 'string') return '';
    return str.trim().replace(/[<>]/g, ''); // Remove potential XSS chars
};

const validacionMiddleware = (req, res, next) => {
    // Validar que el body sea un objeto
    if (req.body && typeof req.body !== 'object') {
        return res.status(400).json({ mensaje: 'Body inválido. Debe ser un objeto JSON.' });
    }

    // Limitar el tamaño del payload
    if (JSON.stringify(req.body || {}).length > 1048576) { // 1MB
        return res.status(413).json({ mensaje: 'Payload demasiado grande.' });
    }

    next();
};

const validarCamposRequeridos = (campos) => {
    return (req, res, next) => {
        const missing = campos.filter(campo => !req.body[campo] || req.body[campo].toString().trim() === '');
        if (missing.length > 0) {
            return res.status(400).json({ mensaje: `Campos requeridos: ${missing.join(', ')}.` });
        }
        next();
    };
};

const validarTiposDeData = (esquema) => {
    return (req, res, next) => {
        for (const [campo, tipo] of Object.entries(esquema)) {
            if (req.body[campo] !== undefined && typeof req.body[campo] !== tipo) {
                return res.status(400).json({ mensaje: `Campo '${campo}' debe ser de tipo ${tipo}.` });
            }
        }
        next();
    };
};

module.exports = {
    validacionMiddleware,
    validarCamposRequeridos,
    validarTiposDeData,
    validarEmail,
    sanitizarString,
};
