// Constantes globales de configuración y reglas de negocio

const SALT_ROUNDS = 12;

// Expresiones regulares
const REGEX_EMAIL = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
const REGEX_CARACTER_ESPECIAL = /[$%#]/;
const REGEX_SOLO_NUMEROS = /^\d+$/;

// Límites de longitud
const MAX_EMAIL_LENGTH = 100;
const MAX_PASSWORD_LENGTH = 72; // Límite de bcrypt
const MIN_PASSWORD_LENGTH = 8;
const MAX_NOMBRE_LENGTH = 50;
const MIN_NOMBRE_LENGTH = 2;

// ── Teléfono por país ──────────────────────────────────────

const DIGITOS_POR_PAIS = Object.freeze({
    '+51':  9,   // Perú
    '+56':  9,   // Chile
    '+54':  10,  // Argentina
    '+57':  10,  // Colombia
    '+52':  10,  // México
    '+593': 9,   // Ecuador
    '+591': 8,   // Bolivia
    '+598': 8,   // Uruguay
    '+595': 9,   // Paraguay
});

// ── Roles ──────────────────────────────────────────────────

const ROLES_VALIDOS = Object.freeze(['admin', 'usuario', 'organizador']);
const ROLES_EDITABLES = Object.freeze(['usuario', 'organizador']);

// ── Eventos ────────────────────────────────────────────────

const CATEGORIAS_VALIDAS = Object.freeze(['Conciertos', 'Festivales', 'Fiestas / Discoteca']);

// ── Compras ────────────────────────────────────────────────

const MAX_CANTIDAD_COMPRA = 20;
const MAX_INTENTOS_CODIGO = 10;

// ── Delay progresivo para login (anti brute-force) ─────────

const DELAY_BASE_MS = 300;
const MAX_DELAY_MS = 4000;
const INTENTOS_ANTES_DELAY = 3;
const LIMPIEZA_INTENTOS_MS = 30 * 60 * 1000; // 30 minutos

// ── JWT ────────────────────────────────────────────────────

const MIN_JWT_SECRET_LENGTH = 32;

module.exports = Object.freeze({
    SALT_ROUNDS,
    REGEX_EMAIL,
    REGEX_CARACTER_ESPECIAL,
    REGEX_SOLO_NUMEROS,
    MAX_EMAIL_LENGTH,
    MAX_PASSWORD_LENGTH,
    MIN_PASSWORD_LENGTH,
    MAX_NOMBRE_LENGTH,
    MIN_NOMBRE_LENGTH,
    DIGITOS_POR_PAIS,
    ROLES_VALIDOS,
    ROLES_EDITABLES,
    CATEGORIAS_VALIDAS,
    MAX_CANTIDAD_COMPRA,
    MAX_INTENTOS_CODIGO,
    DELAY_BASE_MS,
    MAX_DELAY_MS,
    INTENTOS_ANTES_DELAY,
    LIMPIEZA_INTENTOS_MS,
    MIN_JWT_SECRET_LENGTH,
});
