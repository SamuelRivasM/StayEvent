// ─── exportarCSV — Generador nativo de CSV + descarga en navegador ────────────
//
// Convierte un array de objetos a CSV válido con:
//   - BOM (\uFEFF) para soporte de tildes/ñ en Excel
//   - Escape de comas, comillas dobles y saltos de línea (RFC 4180)
//   - Formato de fechas DD/MM/YYYY
//   - Limpieza de IDs internos y campos sensibles
//   - Descarga nativa con Blob + URL.createObjectURL
//
// SIN dependencias externas.

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Escapa un valor para CSV según RFC 4180.
 * Si el valor contiene comas, comillas dobles o saltos de línea,
 * se envuelve en comillas y se duplican las comillas internas.
 */
const escaparValorCSV = (valor) => {
    if (valor === null || valor === undefined) return '';

    const str = String(valor);

    // Si contiene caracteres que rompen CSV, envolver en comillas
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
    }

    return str;
};

/**
 * Formatea una fecha ISO o Date a DD/MM/YYYY.
 * Si incluye hora, retorna DD/MM/YYYY HH:mm.
 */
const formatearFechaCSV = (fecha) => {
    if (!fecha) return '';
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return String(fecha);

    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();

    // Si la fecha original incluye hora (tiene 'T' o es un Date con hora no 00:00)
    const tieneHora =
        (typeof fecha === 'string' && fecha.includes('T')) ||
        (d.getHours() !== 0 || d.getMinutes() !== 0);

    if (tieneHora) {
        const hh = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
    }

    return `${dd}/${mm}/${yyyy}`;
};

/**
 * Formatea un monto numérico a formato legible para CSV.
 */
const formatearMontoCSV = (monto) => {
    const num = Number(monto);
    if (isNaN(num)) return '';
    return num.toFixed(2);
};

// ─── Generador Core ───────────────────────────────────────────────────────────

/**
 * Genera una cadena CSV a partir de un array de objetos.
 *
 * @param {Object[]} datos        — Array de objetos (filas)
 * @param {Object}   columnas     — Mapa { claveDelObjeto: "Encabezado Visible" }
 * @param {Object}   [opciones]   — Opciones de formato
 * @param {Object}   [opciones.formatoColumnas] — { clave: 'fecha' | 'moneda' | 'texto' }
 * @returns {string} Cadena CSV con BOM
 *
 * @example
 * generarCSV(
 *   datos,
 *   { usuario: 'Usuario', evento: 'Evento', monto: 'Monto (S/)', fecha: 'Fecha' },
 *   { formatoColumnas: { fecha: 'fecha', monto: 'moneda' } }
 * );
 */
const generarCSV = (datos, columnas, opciones = {}) => {
    if (!datos || datos.length === 0) return '';

    const { formatoColumnas = {} } = opciones;
    const claves = Object.keys(columnas);
    const encabezados = claves.map((k) => columnas[k]);

    // Fila de encabezados
    const filaHeader = encabezados.map(escaparValorCSV).join(',');

    // Filas de datos
    const filasBody = datos.map((fila) =>
        claves
            .map((clave) => {
                const valor = fila[clave];
                const formato = formatoColumnas[clave];

                switch (formato) {
                    case 'fecha':
                        return escaparValorCSV(formatearFechaCSV(valor));
                    case 'moneda':
                        return escaparValorCSV(formatearMontoCSV(valor));
                    default:
                        return escaparValorCSV(valor);
                }
            })
            .join(',')
    );

    // BOM + encabezados + datos
    return '\uFEFF' + [filaHeader, ...filasBody].join('\r\n');
};

// ─── Descarga nativa ──────────────────────────────────────────────────────────

/**
 * Descarga un string CSV como archivo en el navegador.
 * Usa Blob + URL.createObjectURL + <a> temporal.
 *
 * @param {string} contenidoCSV — La cadena CSV (con BOM)
 * @param {string} nombreArchivo — Nombre del archivo (sin extensión)
 */
const descargarCSV = (contenidoCSV, nombreArchivo = 'exportacion') => {
    if (!contenidoCSV) return;

    const blob = new Blob([contenidoCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `${nombreArchivo}.csv`;
    enlace.style.display = 'none';

    document.body.appendChild(enlace);
    enlace.click();

    // Limpiar
    document.body.removeChild(enlace);
    URL.revokeObjectURL(url);
};

// ─── API pública ──────────────────────────────────────────────────────────────

/**
 * Genera y descarga un archivo CSV desde un array de objetos.
 *
 * @param {Object[]} datos          — Array de objetos (filas de la tabla)
 * @param {Object}   columnas       — Mapa { clave: 'Encabezado' }
 * @param {string}   nombreArchivo  — Nombre del archivo sin extensión
 * @param {Object}   [opciones]     — Opciones de formato
 */
const exportarCSV = (datos, columnas, nombreArchivo, opciones = {}) => {
    const csv = generarCSV(datos, columnas, opciones);
    descargarCSV(csv, nombreArchivo);
};

export { generarCSV, descargarCSV, exportarCSV, formatearFechaCSV, formatearMontoCSV };
export default exportarCSV;
