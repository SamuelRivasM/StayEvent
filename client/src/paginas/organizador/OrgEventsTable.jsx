// ─── OrgEventsTable — Tabla "Mis Eventos Activos" (organizador) ───────────────

import React, { useState, useMemo, useCallback } from 'react';
import BotonExportarCSV from '../../componentes/BotonExportarCSV';

// ─── Columnas y formatos para exportación CSV ─────────────────────────────────

const CSV_COLUMNAS_EVENTOS = {
    titulo:               'Evento',
    categoria:            'Categoría',
    fecha:                'Fecha',
    estado:               'Estado',
    entradas_vendidas:    'Entradas Vendidas',
    capacidad_total:      'Capacidad Total',
    asistentes_ingresados:'Asistentes Ingresados',
    ingresos:             'Ingresos (S/)',
};

const CSV_OPCIONES_EVENTOS = {
    formatoColumnas: { fecha: 'fecha', ingresos: 'moneda' },
};

const FILAS_POR_PAGINA = 5;

const formatFecha = (fecha) => {
    if (!fecha) return '—';
    const [y, m, d] = fecha.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-PE', {
        day: '2-digit', month: 'short', year: 'numeric',
    });
};

const formatMoneda = (monto) =>
    `S/ ${Number(monto).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const BadgeEstado = ({ estado }) => {
    const configs = {
        activo:  { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400', label: 'Activo'  },
        pausado: { bg: 'bg-amber-500/10',   text: 'text-amber-400',   dot: 'bg-amber-400',   label: 'Pausado' },
        cancelado: { bg: 'bg-red-500/10',   text: 'text-red-400',     dot: 'bg-red-400',     label: 'Cancelado' },
    };
    const config = configs[estado] || configs.activo;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider rounded-sm ${config.bg} ${config.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
            {config.label}
        </span>
    );
};

const BadgeCategoria = ({ categoria }) => {
    const colors = {
        'Conciertos':           'bg-violet-500/10 text-violet-400',
        'Festivales':           'bg-orange-500/10 text-orange-400',
        'Fiestas / Discoteca':  'bg-pink-500/10 text-pink-400',
    };
    return (
        <span className={`inline-block px-2 py-0.5 text-xs font-semibold uppercase tracking-wider rounded-sm ${colors[categoria] || 'bg-gray-500/10 text-gray-400'}`}>
            {categoria}
        </span>
    );
};

const IconValidar = () => (
    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
);

const FilaEvento = React.memo(({ evento, onRegistrarAcceso, cargandoAcceso }) => {
    const porcentaje = evento.capacidad_total > 0
        ? Math.round((evento.entradas_vendidas / evento.capacidad_total) * 100) : 0;

    const estaCargando = cargandoAcceso === evento.id;
    const inhabilitado = evento.entradas_vendidas === 0 || (evento.asistentes_ingresados !== undefined && evento.asistentes_ingresados >= evento.entradas_vendidas);

    return (
        <tr className="border-b border-white/[0.04] hover:bg-white/[0.025] transition-colors">
            <td className="pl-5 pr-3 py-3.5">
                <div>
                    <p className="text-sm text-white font-medium leading-snug truncate max-w-[200px]">{evento.titulo}</p>
                    <div className="mt-0.5"><BadgeCategoria categoria={evento.categoria} /></div>
                </div>
            </td>
            <td className="px-3 py-3.5 text-xs text-gray-400 tabular-nums hidden sm:table-cell">
                {formatFecha(evento.fecha)}
            </td>
            <td className="px-3 py-3.5">
                <BadgeEstado estado={evento.estado} />
            </td>
            <td className="px-3 py-3.5 hidden md:table-cell">
                <div className="flex flex-col gap-1 max-w-[120px]">
                    <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>Ventas: {porcentaje}%</span>
                        <span className="tabular-nums font-semibold text-white">{evento.entradas_vendidas}/{evento.capacidad_total}</span>
                    </div>
                    <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-purple-500 transition-all duration-500"
                            style={{ width: `${porcentaje}%` }} />
                    </div>
                    {evento.entradas_vendidas > 0 && (
                        <span className="text-xs text-emerald-400 font-medium whitespace-nowrap">
                            {evento.asistentes_ingresados} de {evento.entradas_vendidas} ingresaron
                        </span>
                    )}
                </div>
            </td>
            <td className="px-3 py-3.5 text-right tabular-nums">
                <span className="text-sm font-semibold text-white">{formatMoneda(evento.ingresos)}</span>
            </td>
            <td className="pr-5 pl-3 py-3.5 text-right">
                <button
                    onClick={() => onRegistrarAcceso(evento.id)}
                    disabled={inhabilitado || estaCargando}
                    title={inhabilitado ? "Todos los asistentes ingresaron" : "Registrar ingreso de asistente"}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm text-xs font-bold uppercase tracking-wider transition-all duration-150 ${
                        inhabilitado
                            ? 'bg-white/[0.01] text-gray-600 border border-white/[0.03] cursor-not-allowed'
                            : estaCargando
                            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30 cursor-wait'
                            : 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 hover:text-purple-300 border border-purple-500/20 hover:border-purple-500/30'
                    }`}
                >
                    {estaCargando ? (
                        <span className="w-3 h-3 rounded-full border border-purple-400 border-t-transparent animate-spin" />
                    ) : (
                        <IconValidar />
                    )}
                    <span className="hidden lg:inline">Registrar Entrada</span>
                </button>
            </td>
        </tr>
    );
});

const OrgEventsTable = ({ datos, cargando, onRegistrarAcceso, cargandoAcceso }) => {
    const [paginaActual, setPaginaActual] = useState(1);
    const totalPaginas = useMemo(() => Math.ceil((datos?.length || 0) / FILAS_POR_PAGINA), [datos]);

    const datosPaginados = useMemo(() => {
        if (!datos) return [];
        const inicio = (paginaActual - 1) * FILAS_POR_PAGINA;
        return datos.slice(inicio, inicio + FILAS_POR_PAGINA);
    }, [datos, paginaActual]);

    const irPagina = useCallback((p) => setPaginaActual(Math.max(1, Math.min(p, totalPaginas))), [totalPaginas]);

    if (cargando) {
        return (
            <div className="bg-white/[0.02] border border-white/[0.06] p-5">
                <div className="h-8 w-48 bg-white/[0.04] animate-pulse rounded-sm mb-5" />
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-12 bg-white/[0.03] animate-pulse rounded-sm mb-2" />
                ))}
            </div>
        );
    }

    return (
        <div className="bg-white/[0.02] border border-white/[0.06] shadow-[0_2px_16px_rgba(0,0,0,0.3)]">
            <div className="px-5 py-4 border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                    <div className="w-0.5 h-5 bg-blue-500/70 rounded-full" />
                    <div className="flex-1">
                        <h2 className="text-sm font-bold text-white">Mis Eventos</h2>
                        <p className="text-xs text-gray-400 mt-0.5">Estado y métricas de tus eventos activos</p>
                    </div>
                    <BotonExportarCSV
                        datos={datos}
                        columnas={CSV_COLUMNAS_EVENTOS}
                        nombreArchivo="mis_eventos"
                        opciones={CSV_OPCIONES_EVENTOS}
                    />
                </div>
            </div>

            {datos && datos.length > 0 ? (
                <>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm" aria-label="Mis eventos activos">
                            <thead>
                                <tr className="border-b border-white/[0.06] bg-white/[0.015]">
                                    <th className="text-left pl-5 pr-3 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-widest">Evento</th>
                                    <th className="text-left px-3 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-widest hidden sm:table-cell">Fecha</th>
                                    <th className="text-left px-3 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-widest">Estado</th>
                                    <th className="text-left px-3 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-widest hidden md:table-cell">Vendidas</th>
                                    <th className="text-right px-3 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-widest">Ingresos</th>
                                    <th className="text-right pr-5 pl-3 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-widest">Acceso</th>
                                </tr>
                            </thead>
                            <tbody>
                                {datosPaginados.map((ev) => (
                                    <FilaEvento 
                                        key={ev.id} 
                                        evento={ev} 
                                        onRegistrarAcceso={onRegistrarAcceso}
                                        cargandoAcceso={cargandoAcceso}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {totalPaginas > 1 && (
                        <div className="px-5 py-3 border-t border-white/[0.04] flex items-center justify-between">
                            <p className="text-xs text-gray-400">
                                Página {paginaActual} de {totalPaginas}
                                <span className="hidden sm:inline"> · {datos.length} eventos</span>
                            </p>
                            <div className="flex items-center gap-1">
                                <button onClick={() => irPagina(paginaActual - 1)} disabled={paginaActual === 1} aria-label="Anterior"
                                    className="p-1.5 text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                </button>
                                {Array.from({ length: totalPaginas }).map((_, i) => (
                                    <button key={i} onClick={() => irPagina(i + 1)}
                                        className={`w-7 h-7 text-xs font-medium transition-colors ${
                                            paginaActual === i + 1
                                                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                                : 'text-gray-400 hover:text-white hover:bg-white/[0.06]'
                                        }`}>{i + 1}</button>
                                ))}
                                <button onClick={() => irPagina(paginaActual + 1)} disabled={paginaActual === totalPaginas} aria-label="Siguiente"
                                    className="p-1.5 text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                </button>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <div className="text-center py-16">
                    <svg className="w-8 h-8 text-gray-700 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-gray-500 text-sm">No tienes eventos registrados</p>
                </div>
            )}
        </div>
    );
};

export default OrgEventsTable;
