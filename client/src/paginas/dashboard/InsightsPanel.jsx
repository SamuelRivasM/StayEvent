import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useInsights } from './useInsights';
import api from '../../servicios/api';

// ─── Iconos ────────────────────────────────────────────────────────────────────

const IconWarning = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
    </svg>
);

const IconInfo = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const IconSuccess = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const IconChevron = () => (
    <svg className="w-3.5 h-3.5 text-gray-400 shrink-0 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
);

// ─── Configuración visual ──────────────────────────────────────────────────────

const TIPO_CONFIG = {
    warning: { Icono: IconWarning, bg: 'bg-amber-500/10',   color: 'text-amber-400',   borde: 'border-l-amber-500/40'   },
    info:    { Icono: IconInfo,    bg: 'bg-blue-500/10',    color: 'text-blue-400',    borde: 'border-l-blue-500/40'    },
    success: { Icono: IconSuccess, bg: 'bg-emerald-500/10', color: 'text-emerald-400', borde: 'border-l-emerald-500/40' },
};

const CONEXION_CONFIG = {
    init:         { dot: 'bg-gray-500',              label: '' },
    conectando:   { dot: 'bg-amber-400 animate-pulse', label: 'Conectando…' },
    reconectando: { dot: 'bg-amber-400 animate-pulse', label: 'Reconectando…' },
    conectado:    { dot: 'bg-emerald-400',            label: 'En vivo' },
    error:        { dot: 'bg-red-500',               label: 'Sin conexión' },
    sin_permiso:  { dot: 'bg-gray-500',              label: 'Sin acceso' },
};

// ─── Subcomponentes ────────────────────────────────────────────────────────────

const Skeleton = () => (
    <div className="bg-white/[0.02] border border-white/[0.06] h-full flex flex-col">
        <div className="px-5 pt-5 pb-4 border-b border-white/[0.04]">
            <div className="flex items-center gap-3">
                <div className="w-0.5 h-5 bg-blue-500/40 rounded-full" />
                <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-28 bg-white/[0.06] animate-pulse rounded-sm" />
                    <div className="h-2.5 w-36 bg-white/[0.04] animate-pulse rounded-sm" />
                </div>
                <div className="w-5 h-5 rounded-full bg-white/[0.06] animate-pulse" />
            </div>
        </div>
        <div className="flex-1 px-3 pb-3 pt-2 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 bg-white/[0.03] animate-pulse rounded-sm" />
            ))}
        </div>
    </div>
);

const EstadoVacio = () => (
    <div className="flex flex-col items-center justify-center py-10 gap-2">
        <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <IconSuccess />
        </div>
        <p className="text-xs text-gray-400">Sin alertas para este filtro</p>
    </div>
);

const EstadoError = ({ estado }) => (
    <div className="flex flex-col items-center justify-center py-10 gap-2">
        <p className="text-xs text-red-400 font-medium">
            {estado === 'sin_permiso' ? 'Acceso no autorizado' : 'Error de conexión — reconectando…'}
        </p>
    </div>
);

const AlertaItem = ({ alerta, index }) => {
    const cfg = TIPO_CONFIG[alerta.tipo] ?? TIPO_CONFIG.info;
    return (
        <div
            role="listitem"
            className={`flex gap-3 p-3.5 border-l-2 ${cfg.borde} bg-white/[0.015] hover:bg-white/[0.03] transition-colors`}
            style={{ animation: `fadeSlideIn 0.3s cubic-bezier(0.4,0,0.2,1) ${index * 60}ms both` }}
        >
            <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0`}>
                <span className={cfg.color}><cfg.Icono /></span>
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-300 leading-relaxed break-words">{alerta.mensaje}</p>
                <p className="text-xs text-gray-500 mt-1.5 font-medium">{alerta.tiempo}</p>
            </div>
        </div>
    );
};

// ─── Combobox de eventos (solo organizador) ────────────────────────────────────

const formatearFecha = (fechaStr) => {
    if (!fechaStr) return '';
    const [y, m, d] = fechaStr.slice(0, 10).split('-');
    return `${d}/${m}/${y}`;
};

const OPTION_STYLE = { backgroundColor: '#111827', color: '#d1d5db' };

const ComboboxEventos = ({ eventos, valor, onChange, cargandoEventos }) => (
    <div className="px-4 pb-3 pt-1">
        <div className="relative">
            <select
                value={valor ?? ''}
                onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
                disabled={cargandoEventos}
                style={{ backgroundColor: '#111827', color: '#d1d5db' }}
                className="w-full appearance-none border border-white/[0.08] text-xs px-3 py-2 pr-8 rounded-sm focus:outline-none focus:border-purple-500/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <option value="" style={OPTION_STYLE}>Todos mis eventos</option>
                {eventos.map((ev) => (
                    <option key={ev.id} value={ev.id} style={OPTION_STYLE}>
                        {ev.titulo} — {formatearFecha(ev.fecha)}
                    </option>
                ))}
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                <IconChevron />
            </div>
        </div>
    </div>
);

// ─── Componente principal ──────────────────────────────────────────────────────

// Mantiene eventos de los últimos 30 días hacia adelante (excluye histórico antiguo)
const CORTE_DIAS = 30;
const fechaCorte = () => {
    const d = new Date();
    d.setDate(d.getDate() - CORTE_DIAS);
    return d;
};

const InsightsPanel = ({ eventos: eventosProp } = {}) => {
    const { usuario } = useAuth();
    const esOrganizador = usuario?.rol === 'organizador';

    const [eventoSeleccionado, setEventoSeleccionado] = useState(null);
    const [eventos, setEventos]                       = useState([]);
    const [cargandoEventos, setCargandoEventos]       = useState(false);

    useEffect(() => {
        if (!esOrganizador) return;

        // Si el padre ya pasó la lista (incluso vacía), usarla directamente sin fetch
        if (Array.isArray(eventosProp)) {
            const corte = fechaCorte();
            setEventos(
                eventosProp.filter(ev => ev.fecha && new Date(ev.fecha) >= corte)
            );
            return;
        }

        // Fetch propio (cuando se usa fuera del dashboard, ej. AdminDashboard no pasa prop)
        setCargandoEventos(true);
        api.get('/eventos/mis-eventos')
            .then((res) => {
                const corte = fechaCorte();
                setEventos(
                    (res.data.eventos || []).filter(ev => ev.fecha && new Date(ev.fecha) >= corte)
                );
            })
            .catch(() => {})
            .finally(() => setCargandoEventos(false));
    }, [esOrganizador, eventosProp]);

    const { alertas, estado } = useInsights(eventoSeleccionado);

    const cnx      = CONEXION_CONFIG[estado] ?? CONEXION_CONFIG.init;
    const cargando = estado === 'init' || estado === 'conectando';
    const sinConex = estado === 'error' || estado === 'sin_permiso';

    if (cargando) return <Skeleton />;

    return (
        <div className="bg-white/[0.02] border border-white/[0.06] h-full flex flex-col">

            {/* Cabecera */}
            <div className="px-5 pt-5 pb-3 border-b border-white/[0.04]">
                <div className="flex items-center gap-3">
                    <div className="w-0.5 h-5 bg-blue-500/70 rounded-full shrink-0" />

                    <div className="flex-1 min-w-0">
                        <h2 className="text-sm font-bold text-white leading-tight">
                            Insights &amp; Alertas
                        </h2>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cnx.dot}`} />
                            <p className="text-xs text-gray-400 truncate">
                                {cnx.label || 'Notificaciones del sistema'}
                            </p>
                        </div>
                    </div>

                    {!sinConex && (
                        <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-purple-500/15 text-xs text-purple-400 font-bold shrink-0">
                            {alertas.length}
                        </span>
                    )}
                </div>
            </div>

            {/* Combobox — solo organizador */}
            {esOrganizador && (
                <ComboboxEventos
                    eventos={eventos}
                    valor={eventoSeleccionado}
                    onChange={setEventoSeleccionado}
                    cargandoEventos={cargandoEventos}
                />
            )}

            {/* Lista de alertas */}
            <div
                role="list"
                aria-label="Lista de alertas"
                className="flex-1 overflow-y-auto px-3 pb-3 pt-1 space-y-2 max-h-[340px]"
            >
                {sinConex
                    ? <EstadoError estado={estado} />
                    : alertas.length === 0
                        ? <EstadoVacio />
                        : alertas.map((a, i) => (
                            <AlertaItem key={a.id} alerta={a} index={i} />
                        ))
                }
            </div>

            {/* Pie */}
            {estado === 'conectado' && (
                <div className="px-5 py-2.5 border-t border-white/[0.04] flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <p className="text-xs text-gray-500">Actualización automática cada 30 s</p>
                </div>
            )}
            {estado === 'reconectando' && (
                <div className="px-5 py-2.5 border-t border-white/[0.04] flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    <p className="text-xs text-amber-500">Reconectando con el servidor…</p>
                </div>
            )}
        </div>
    );
};

export default InsightsPanel;
