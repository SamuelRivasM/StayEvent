// Valida que los parámetros de ruta indicados sean enteros positivos (> 0)
// Ejemplo: router.get('/:id', validarEnteros('id'), controlador)
const validarEnteros = (...nombres) => {
    return (req, res, next) => {
        for (const nombre of nombres) {
            const valor = parseInt(req.params[nombre], 10);

            if (!Number.isInteger(valor) || valor <= 0) {
                return res.status(400).json({
                    mensaje: `Parámetro '${nombre}' debe ser un entero positivo.`,
                });
            }

            // Reemplazar el parámetro crudo por el entero parseado
            req.params[nombre] = valor;
        }
        next();
    };
};

module.exports = { validarEnteros };
