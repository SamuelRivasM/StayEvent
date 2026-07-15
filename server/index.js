// ─────────────────────────────────────────────────────────────
//  Stay Event — Servidor principal
//
//  Este archivo aplica las siguientes subcaracterísticas:
//  - Confidencialidad: validación de JWT_SECRET, no-leak de errores
//  - Integridad: whitelist de ALTER TABLE, validación de entrada
//  - Autenticidad: detección de contraseñas por defecto
//  - Responsabilidad: IDs de error en cada respuesta 500
// ─────────────────────────────────────────────────────────────

const bcrypt = require('bcryptjs');
const { testConnection, pool } = require('./config/db');
const { logError, logInfo, logWarn } = require('./config/logger');
const { LIMPIEZA_RESERVAS_MS } = require('./config/constantes');
const app = require('./app');

const PORT = process.env.PORT || 5000;

// Whitelist de columnas para ALTER TABLE (previene inyección SQL)

const COLUMNAS_PERMITIDAS_EVENTOS = Object.freeze({
    imagen_url:   'VARCHAR(500) DEFAULT NULL',
    imagen_mapa:  'VARCHAR(500) DEFAULT NULL',
    activo:       'TINYINT(1) NOT NULL DEFAULT 1',
    eliminado:    'TINYINT(1) NOT NULL DEFAULT 0',
    direccion:    'VARCHAR(255) DEFAULT NULL',
});

const agregarColumnaEventosSiNoExiste = async (columna) => {
    const definicion = COLUMNAS_PERMITIDAS_EVENTOS[columna];

    if (!definicion) {
        logWarn('DB', `Columna '${columna}' no está en la whitelist. Operación rechazada.`);
        return;
    }

    const [filas] = await pool.execute(
        `SELECT COUNT(*) AS count FROM information_schema.columns
         WHERE table_schema = DATABASE() AND table_name = 'eventos' AND column_name = ?`,
        [columna]
    );

    if (filas[0].count === 0) {
        // Seguro: usa solo valores de la whitelist estática
        await pool.execute(`ALTER TABLE eventos ADD COLUMN \`${columna}\` ${definicion}`);
        logInfo('DB', `Columna '${columna}' agregada a tabla eventos.`);
    }
};

// ── Inicialización de DB ──────────────────────────────────────────────────────

const agregarColumnaSiNoExiste = async (tabla, columna, definicion) => {
    const [filas] = await pool.execute(
        `SELECT COUNT(*) AS count FROM information_schema.columns
         WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
        [tabla, columna]
    );
    if (filas[0].count === 0) {
        await pool.execute(`ALTER TABLE \`${tabla}\` ADD COLUMN \`${columna}\` ${definicion}`);
        logInfo('DB', `Columna '${columna}' agregada a tabla ${tabla}.`);
    }
};

const inicializarDB = async () => {
    // Cada tabla en su propio try/catch para que un fallo no detenga las demás
    try {
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS sesiones_activas (
                id INT AUTO_INCREMENT PRIMARY KEY,
                usuario_id INT NOT NULL,
                jti VARCHAR(64) NOT NULL,
                creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expira_en DATETIME NOT NULL,
                activo TINYINT(1) NOT NULL DEFAULT 1,
                UNIQUE KEY uk_jti (jti),
                INDEX idx_usuario_activo (usuario_id, activo),
                INDEX idx_expira_en (expira_en),
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
        await pool.execute(
            'UPDATE sesiones_activas SET activo = 0 WHERE expira_en < NOW() AND activo = 1'
        );
        logInfo('DB', 'Tabla sesiones_activas lista.');
    } catch (error) {
        logError('DB.inicializarDB.sesiones_activas', error);
    }

    try {
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS reservas_temporales (
                id INT AUTO_INCREMENT PRIMARY KEY,
                usuario_id INT NOT NULL,
                evento_id INT NOT NULL,
                zona_id INT NOT NULL,
                cantidad INT NOT NULL,
                subtotal DECIMAL(10,2) NOT NULL,
                expira_en DATETIME NOT NULL,
                creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_expira (expira_en),
                INDEX idx_usuario (usuario_id),
                INDEX idx_zona (zona_id),
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
                FOREIGN KEY (evento_id) REFERENCES eventos(id) ON DELETE CASCADE,
                FOREIGN KEY (zona_id) REFERENCES zonas_evento(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
        await agregarColumnaSiNoExiste('reservas_temporales', 'creado_en', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
        await agregarColumnaSiNoExiste('reservas_temporales', 'codigo_pago', 'VARCHAR(6) DEFAULT NULL');
        logInfo('DB', 'Tabla reservas_temporales lista.');
    } catch (error) {
        logError('DB.inicializarDB.reservas_temporales', error);
    }

    try {
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS checkins (
                id INT AUTO_INCREMENT PRIMARY KEY,
                compra_id INT NOT NULL,
                evento_id INT NOT NULL,
                validado_por INT NOT NULL,
                cantidad_personas INT NOT NULL DEFAULT 1,
                fecha_checkin TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uk_compra (compra_id),
                INDEX idx_evento (evento_id),
                FOREIGN KEY (compra_id) REFERENCES compras(id) ON DELETE CASCADE,
                FOREIGN KEY (evento_id) REFERENCES eventos(id) ON DELETE CASCADE,
                FOREIGN KEY (validado_por) REFERENCES usuarios(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
        logInfo('DB', 'Tabla checkins lista.');
    } catch (error) {
        logError('DB.inicializarDB.checkins', error);
    }

    try {
        for (const columna of Object.keys(COLUMNAS_PERMITIDAS_EVENTOS)) {
            await agregarColumnaEventosSiNoExiste(columna);
        }
    } catch (error) {
        logError('DB.inicializarDB.columnas_eventos', error);
    }
};

// Alerta si el administrador sigue usando las credenciales por defecto

const verificarPasswordAdmin = async () => {
    try {
        const [admins] = await pool.query(
            "SELECT id, password FROM usuarios WHERE rol = 'admin' LIMIT 1"
        );

        if (admins.length === 0) return;

        const usaPasswordDefecto = await bcrypt.compare('admin123', admins[0].password);

        if (usaPasswordDefecto) {
            logWarn(
                'Seguridad',
                '⚠️  El administrador usa la contraseña por defecto (admin123). '
                + 'Cámbiala inmediatamente desde el panel o la base de datos.'
            );
        }
    } catch (error) {
        logError('Seguridad.verificarPasswordAdmin', error);
    }
};

// ── Job: Limpieza automática de reservas expiradas ────────────────────────────

const limpiarReservasExpiradas = async () => {
    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        const [expiradas] = await conn.execute(
            'SELECT id, zona_id, cantidad FROM reservas_temporales WHERE expira_en < NOW()'
        );

        if (expiradas.length > 0) {
            for (const reserva of expiradas) {
                await conn.execute(
                    'UPDATE zonas_evento SET stock = stock + ? WHERE id = ?',
                    [reserva.cantidad, reserva.zona_id]
                );
            }

            await conn.execute('DELETE FROM reservas_temporales WHERE expira_en < NOW()');

            await conn.commit();
            logInfo('Reservas', `${expiradas.length} reserva(s) expirada(s) liberada(s).`);
        } else {
            await conn.commit();
        }
    } catch (error) {
        if (conn) await conn.rollback();
        logError('Reservas.limpiarExpiradas', error);
    } finally {
        if (conn) conn.release();
    }
};

// ── Iniciar servidor ──────────────────────────────────────────────────────────

app.listen(PORT, async () => {
    logInfo('Server', `Stay Event API corriendo en http://localhost:${PORT}`);
    await testConnection();
    await inicializarDB();
    await verificarPasswordAdmin();

    setInterval(limpiarReservasExpiradas, LIMPIEZA_RESERVAS_MS);
    logInfo('Reservas', `Job de limpieza activo (cada ${LIMPIEZA_RESERVAS_MS / 1000}s).`);
});
