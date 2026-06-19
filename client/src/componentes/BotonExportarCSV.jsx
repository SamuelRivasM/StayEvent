// ─── BotonExportarCSV — Botón reutilizable de exportación CSV ─────────────────
//
// Renderiza un botón con icono de descarga que ejecuta `exportarCSV`
// al hacer click. Recibe la data, columnas, nombre del archivo y opciones.
// Incluye estado de feedback visual (icono check) al exportar.

import React, { useState, useCallback } from 'react';
import { exportarCSV } from '../utils/exportarCSV';

const IconoDescarga = () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);

const IconoCheck = () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
);

/**
 * @param {Object}   props
 * @param {Object[]} props.datos          — Array de objetos a exportar
 * @param {Object}   props.columnas       — Mapa { clave: 'Encabezado' }
 * @param {string}   props.nombreArchivo  — Nombre del archivo (sin .csv)
 * @param {Object}   [props.opciones]     — Opciones de formato ({ formatoColumnas: { clave: 'fecha' | 'moneda' } })
 * @param {string}   [props.etiqueta]     — Texto del botón (default: 'Exportar CSV')
 * @param {boolean}  [props.compact]      — Si true, solo muestra el icono (sin texto)
 */
const BotonExportarCSV = ({
    datos,
    columnas,
    nombreArchivo,
    opciones = {},
    etiqueta = 'Exportar CSV',
    compact = false,
}) => {
    const [exportado, setExportado] = useState(false);

    const handleClick = useCallback(() => {
        if (!datos || datos.length === 0) return;

        exportarCSV(datos, columnas, nombreArchivo, opciones);

        // Feedback visual: mostrar check por 2 segundos
        setExportado(true);
        setTimeout(() => setExportado(false), 2000);
    }, [datos, columnas, nombreArchivo, opciones]);

    const deshabilitado = !datos || datos.length === 0;

    return (
        <button
            onClick={handleClick}
            disabled={deshabilitado}
            title={deshabilitado ? 'No hay datos para exportar' : etiqueta}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all duration-150
                ${exportado
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : deshabilitado
                        ? 'bg-white/[0.02] text-gray-600 border border-white/[0.04] cursor-not-allowed'
                        : 'bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 hover:text-white border border-white/[0.08] hover:border-white/[0.15]'
                }`}
        >
            {exportado ? <IconoCheck /> : <IconoDescarga />}
            {!compact && <span>{exportado ? 'Descargado' : etiqueta}</span>}
        </button>
    );
};

export default BotonExportarCSV;
