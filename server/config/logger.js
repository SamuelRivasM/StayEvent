// Logger seguro por entorno (evita filtrar datos sensibles en producción)

const crypto = require('crypto');

const esProduccion = () => process.env.NODE_ENV === 'production';

// Genera un ID de error único y corto
const generarIdError = () => crypto.randomBytes(4).toString('hex').toUpperCase();

// Registra un error y devuelve su ID de referencia
const logError = (contexto, error) => {
    const id = generarIdError();
    const mensaje = error instanceof Error ? error.message : String(error);

    if (esProduccion()) {
        console.error(`[${id}] ${contexto}: ${mensaje}`);
    } else {
        const stack = error instanceof Error ? error.stack : mensaje;
        console.error(`[${id}] ${contexto}: ${stack}`);
    }

    return id;
};

// Log informativo para desarrollo
const logDev = (contexto, mensaje) => {
    if (!esProduccion()) {
        console.log(`[DEV] ${contexto}: ${mensaje}`);
    }
};

// Log de advertencia
const logWarn = (contexto, mensaje) => {
    console.warn(`[WARN] ${contexto}: ${mensaje}`);
};

// Log informativo general
const logInfo = (contexto, mensaje) => {
    console.log(`[INFO] ${contexto}: ${mensaje}`);
};

module.exports = { logError, logDev, logWarn, logInfo, generarIdError };
