// ─── ActivityTable — Tabla de actividad global reciente (paginada) ─────────────
//
// Muestra las últimas transacciones de la plataforma con:
//   - ID, Tipo (badge con color), Usuario, Evento, Fecha, Estado (badge), Monto
//   - Paginación de 8 filas por página
//   - Diseño coherente con AdminCompras.jsx

import React, { useState, useMemo, useCallback } from 'react';

// ─── Constantes ───────────────────────────────────────────────────────────────

const FILAS_POR_PAGINA = 8;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatFechaHora = (fecha) => {
    if (!fecha) return '—';
    return new Date(fecha).toLocaleString('es-PE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const formatMoneda = (monto) =>
    `S/ ${Number(monto).toLocaleString('es-PE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;

// ─── Badge de tipo ────────────────────────────────────────────────────────────

const BadgeTipo = ({ tipo }) => {
    const esCompra = tipo === 'Compra de Ticket';
    return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider rounded-sm ${
            esCompra
                ? 'bg-purple-500/10 text-purple-400'
                : 'bg-blue-500/10 text-blue-400'
        }`}>
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d={esCompra
                        ? 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z'
                        : 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
                    }
                />
            </svg>
            {esCompra ? 'Ticket' : 'Evento'}
        </span>
    );
};

// ─── Badge de estado ──────────────────────────────────────────────────────────

const BadgeEstado = ({ estado }) => {
    const configs = {
        confirmado: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400', label: 'Completado' },
        completado: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400', label: 'Completado' },
        pendiente:  { bg: 'bg-amber-500/10',   text: 'text-amber-400',   dot: 'bg-amber-400',   label: 'Pendiente'  },
        cancelado:  { bg: 'bg-red-500/10',      text: 'text-red-400',     dot: 'bg-red-400',     label: 'Cancelado'  },
    };
    const config = configs[estado] || configs.pendiente;

    return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider rounded-sm ${config.bg} ${config.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
            {config.label}
        </span>
    );
};

// ─── Fila de la tabla ─────────────────────────────────────────────────────────

const FilaActividad = React.memo(({ item }) => (
    <tr className="border-b border-white/[0.04] hover:bg-white/[0.025] transition-colors">
        <td className="pl-5 pr-2 py-3.5 text-gray-500 text-xs tabular-nums text-center w-16 font-mono">
            #{item.id}
        </td>
        <td className="px-3 py-3.5">
            <BadgeTipo tipo={item.tipo} />
        </td>
        <td className="px-3 py-3.5">
            <p className="text-sm text-white font-medium leading-snug truncate max-w-[160px]">
                {item.usuario}
            </p>
        </td>
        <td className="px-3 py-3.5 text-sm text-gray-400 hidden md:table-cell truncate max-w-[180px]">
            {item.evento}
        </td>
        <td className="px-3 py-3.5 hidden lg:table-cell">
            <span className="text-xs text-gray-500 tabular-nums">
                {formatFechaHora(item.fecha)}
            </span>
        </td>
        <td className="px-3 py-3.5">
            <BadgeEstado estado={item.estado} />
        </td>
        <td className="px-5 py-3.5 text-right tabular-nums">
            {item.monto > 0 ? (
                <span className="text-sm font-semibold text-white">{formatMoneda(item.monto)}</span>
            ) : (
                <span className="text-xs text-gray-400">—</span>
            )}
        </td>
    </tr>
));

// ─── Componente principal ─────────────────────────────────────────────────────

const ActivityTable = ({ datos, cargando }) => {
    const [paginaActual, setPaginaActual] = useState(1);

    const totalPaginas = useMemo(
        () => Math.ceil((datos?.length || 0) / FILAS_POR_PAGINA),
        [datos],
    );

    const datosPaginados = useMemo(() => {
        if (!datos) return [];
        const inicio = (paginaActual - 1) * FILAS_POR_PAGINA;
        return datos.slice(inicio, inicio + FILAS_POR_PAGINA);
    }, [datos, paginaActual]);

    const irPagina = useCallback((pagina) => {
        setPaginaActual(Math.max(1, Math.min(pagina, totalPaginas)));
    }, [totalPaginas]);

    if (cargando) {
        return (
            <div className="bg-white/[0.02] border border-white/[0.06] p-5">
                <div className="h-8 w-48 bg-white/[0.04] animate-pulse rounded-sm mb-5" />
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-12 bg-white/[0.03] animate-pulse rounded-sm mb-2" />
                ))}
            </div>
        );
    }

    return (
        <div className="bg-white/[0.02] border border-white/[0.06] shadow-[0_2px_16px_rgba(0,0,0,0.3)]">
            {/* Cabecera */}
            <div className="px-5 py-4 border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                    <div className="w-0.5 h-5 bg-indigo-500/70 rounded-full" />
                    <div className="flex-1">
                        <h2 className="text-sm font-bold text-white">Actividad Global Reciente</h2>
                        <p className="text-xs text-gray-400 mt-0.5">Últimas transacciones de la plataforma</p>
                    </div>
                </div>
            </div>

            {/* Tabla */}
            {datos && datos.length > 0 ? (
                <>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm" aria-label="Actividad global reciente">
                            <thead>
                                <tr className="border-b border-white/[0.06] bg-white/[0.015]">
                                    <th className="pl-5 pr-2 py-3.5 text-center text-xs font-semibold text-gray-400 uppercase tracking-widest w-16">
                                        ID
                                    </th>
                                    <th className="text-left px-3 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-widest">
                                        Tipo
                                    </th>
                                    <th className="text-left px-3 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-widest">
                                        Usuario
                                    </th>
                                    <th className="text-left px-3 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-widest hidden md:table-cell">
                                        Evento
                                    </th>
                                    <th className="text-left px-3 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-widest hidden lg:table-cell">
                                        Fecha
                                    </th>
                                    <th className="text-left px-3 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-widest">
                                        Estado
                                    </th>
                                    <th className="text-right px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-widest">
                                        Monto
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {datosPaginados.map((item) => (
                                    <FilaActividad key={item.id} item={item} />
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Paginación */}
                    {totalPaginas > 1 && (
                        <div className="px-5 py-3 border-t border-white/[0.04] flex items-center justify-between">
                            <p className="text-xs text-gray-400">
                                Página {paginaActual} de {totalPaginas}
                                <span className="hidden sm:inline"> · {datos.length} registros</span>
                            </p>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => irPagina(paginaActual - 1)}
                                    disabled={paginaActual === 1}
                                    aria-label="Página anterior"
                                    className="p-1.5 text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>

                                {Array.from({ length: totalPaginas }).map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => irPagina(i + 1)}
                                        className={`w-7 h-7 text-xs font-medium transition-colors ${
                                            paginaActual === i + 1
                                                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                                : 'text-gray-400 hover:text-white hover:bg-white/[0.06]'
                                        }`}
                                    >
                                        {i + 1}
                                    </button>
                                ))}

                                <button
                                    onClick={() => irPagina(paginaActual + 1)}
                                    disabled={paginaActual === totalPaginas}
                                    aria-label="Página siguiente"
                                    className="p-1.5 text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <div className="text-center py-16">
                    <svg className="w-8 h-8 text-gray-700 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p className="text-gray-500 text-sm">Sin actividad registrada</p>
                </div>
            )}
        </div>
    );
};

export default ActivityTable;
