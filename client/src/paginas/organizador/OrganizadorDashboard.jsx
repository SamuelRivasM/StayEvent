import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

import OrgKpiCard from './OrgKpiCard';
import OrgRevenueChart from './OrgRevenueChart';
import OrgDistributionChart from './OrgDistributionChart';
import OrgAttendanceChart from './OrgAttendanceChart';
import OrgEventsTable from './OrgEventsTable';
import OrgActivityFeed from './OrgActivityFeed';
import InsightsPanel from '../dashboard/InsightsPanel';
import api from '../../servicios/api';

// ─── Keyframes ────────────────────────────────────────────────────────────────

const KEYFRAMES = `
    @keyframes fadeSlideIn {
        from { opacity: 0; transform: translateY(8px); }
        to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes toastIn {
        from { opacity: 0; transform: translateY(50px) scale(0.95); }
        to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    .animate-toast {
        animation: toastIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) both;
    }
`;

// ─── Iconos para KPIs ─────────────────────────────────────────────────────────

const IconIngresos = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);
const IconTickets = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
    </svg>
);
const IconCheckin = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);
const IconEventos = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

// ─── Componente ───────────────────────────────────────────────────────────────

const OrganizadorDashboard = () => {
    const { usuario } = useAuth();
    const [cargando, setCargando] = useState(true);
    const [datos, setDatos] = useState(null);
    const [notificacion, setNotificacion] = useState(null);
    const [cargandoAcceso, setCargandoAcceso] = useState(null);
    const [exportandoCSV, setExportandoCSV] = useState(false);

    const [filtroMes, setFiltroMes] = useState('');
    const [filtroAnio, setFiltroAnio] = useState('');
    const [filtroCategoria, setFiltroCategoria] = useState('');
    const [filtroEstadoEvento, setFiltroEstadoEvento] = useState('');
    const [filtroEvento, setFiltroEvento] = useState('');

    const [listaMisEventos, setListaMisEventos] = useState([]);

    const cargarDatos = async (mostrarLoader = true, filtros = {}) => {
        if (mostrarLoader) setCargando(true);
        try {
            const respuesta = await api.get('/eventos/dashboard-organizador', { params: filtros });
            setDatos(respuesta.data);

            // Corrección de filtros inconsistentes en cascada
            const valid = respuesta.data?.filtrosValidos;
            if (valid) {
                if (filtroMes && valid.meses && !valid.meses.includes(Number(filtroMes))) {
                    setFiltroMes('');
                }
                if (filtroCategoria && valid.categorias && !valid.categorias.includes(filtroCategoria)) {
                    setFiltroCategoria('');
                }
                if (filtroEvento && valid.eventos && !valid.eventos.some(e => String(e.id) === String(filtroEvento))) {
                    setFiltroEvento('');
                }
            }
        } catch (err) {
            console.error('Error al cargar datos del dashboard:', err);
            setNotificacion({
                tipo: 'error',
                mensaje: err.response?.data?.mensaje || 'No se pudo conectar con el servidor para actualizar los datos.'
            });
        } finally {
            if (mostrarLoader) setCargando(false);
        }
    };

    useEffect(() => {
        const cargarMisEventos = async () => {
            try {
                const res = await api.get('/eventos/mis-eventos');
                setListaMisEventos(res.data?.eventos || []);
            } catch (err) {
                console.error('[OrganizadorDashboard] Error al cargar la lista de sus eventos:', err);
            }
        };
        cargarMisEventos();
    }, []);

    // Carga de datos automatizada al modificar cualquier filtro
    useEffect(() => {
        const filtros = {};
        if (filtroMes) filtros.mes = filtroMes;
        if (filtroAnio) filtros.anio = filtroAnio;
        if (filtroCategoria) filtros.categoria = filtroCategoria;
        if (filtroEstadoEvento) filtros.estadoEvento = filtroEstadoEvento;
        if (filtroEvento) filtros.eventoId = filtroEvento;
        cargarDatos(true, filtros);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filtroMes, filtroAnio, filtroCategoria, filtroEstadoEvento, filtroEvento]);

    const manejarFiltrar = (e) => {
        if (e) e.preventDefault();
    };

    const manejarLimpiar = () => {
        setFiltroMes('');
        setFiltroAnio('');
        setFiltroCategoria('');
        setFiltroEstadoEvento('');
        setFiltroEvento('');
    };

    const manejarExportarCSV = async () => {
        setExportandoCSV(true);
        try {
            const params = {};
            if (filtroMes) params.mes = filtroMes;
            if (filtroAnio) params.anio = filtroAnio;
            if (filtroCategoria) params.categoria = filtroCategoria;
            if (filtroEstadoEvento) params.estadoEvento = filtroEstadoEvento;
            if (filtroEvento) params.eventoId = filtroEvento;

            const respuesta = await api.get('/compras/export-csv', {
                params,
                responseType: 'blob'
            });

            const blob = new Blob([respuesta.data], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `reporte_organizador_${new Date().toISOString().slice(0, 10)}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Error al exportar CSV:', err);
        } finally {
            setExportandoCSV(false);
        }
    };

    const handleRegistrarAcceso = async (eventoId) => {
        setCargandoAcceso(eventoId);
        try {
            const respuesta = await api.post(`/checkin/registrar-acceso/${eventoId}`);
            setNotificacion({
                tipo: 'success',
                mensaje: respuesta.data.mensaje,
                detalle: respuesta.data.detalle
            });
            // Auto-ocultar notificación
            setTimeout(() => setNotificacion(null), 6000);
            // Recargar datos sin mostrar spinner global, preservando filtros activos
            const filtros = {};
            if (filtroMes) filtros.mes = filtroMes;
            if (filtroAnio) filtros.anio = filtroAnio;
            if (filtroCategoria) filtros.categoria = filtroCategoria;
            if (filtroEstadoEvento) filtros.estadoEvento = filtroEstadoEvento;
            if (filtroEvento) filtros.eventoId = filtroEvento;
            await cargarDatos(false, filtros);
        } catch (err) {
            console.error('Error al registrar acceso:', err);
            setNotificacion({
                tipo: err.response?.status === 400 ? 'info' : 'error',
                mensaje: err.response?.data?.mensaje || 'Error al procesar el registro de entrada.'
            });
            setTimeout(() => setNotificacion(null), 6000);
        } finally {
            setCargandoAcceso(null);
        }
    };

    const { kpis, tendencia30dias, distribucionZonas, eficienciaAsistencia, eventosActivos, actividadReciente } = datos || {};

    const NOMBRES_MESES = {
        1: 'Enero', 2: 'Febrero', 3: 'Marzo', 4: 'Abril', 5: 'Mayo', 6: 'Junio',
        7: 'Julio', 8: 'Agosto', 9: 'Septiembre', 10: 'Octubre', 11: 'Noviembre', 12: 'Diciembre'
    };

    const filtrosValidos = datos?.filtrosValidos || {};
    const aniosDisponibles = filtrosValidos.anios || [2025, 2026, 2027, 2028];
    const mesesDisponibles = filtrosValidos.meses || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const categoriasDisponibles = filtrosValidos.categorias || ['Conciertos', 'Festivales', 'Fiestas / Discoteca'];
    const eventosDisponibles = filtrosValidos.eventos || listaMisEventos;

    const fechaHoy = new Date().toLocaleDateString('es-PE', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });

    return (
        <div className="p-4 sm:p-6 lg:p-8 relative">
            <style>{KEYFRAMES}</style>

            {/* ── Notificaciones flotantes profesionales ── */}
            {notificacion && (
                <div className={`fixed bottom-6 right-6 z-50 shadow-2xl p-4 max-w-md flex items-start gap-3 rounded-md border backdrop-blur-md transition-all duration-300 animate-toast ${
                    notificacion.tipo === 'error' 
                        ? 'bg-red-950/90 border-red-500/30 text-red-200' 
                        : notificacion.tipo === 'info'
                        ? 'bg-amber-950/90 border-amber-500/30 text-amber-200'
                        : 'bg-emerald-950/90 border-emerald-500/30 text-emerald-200'
                }`}>
                    {notificacion.tipo === 'success' && (
                        <svg className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    )}
                    {notificacion.tipo === 'info' && (
                        <svg className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    )}
                    {notificacion.tipo === 'error' && (
                        <svg className="w-5 h-5 text-red-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    )}
                    <div className="flex-1">
                        <h4 className={`text-xs font-bold uppercase tracking-wider ${
                            notificacion.tipo === 'error' ? 'text-red-400' : notificacion.tipo === 'info' ? 'text-amber-400' : 'text-emerald-400'
                        }`}>
                            {notificacion.tipo === 'error' ? 'Error de validación' : notificacion.tipo === 'info' ? 'Aviso' : 'Acceso Autorizado'}
                        </h4>
                        <p className="text-sm mt-1 leading-snug">{notificacion.mensaje}</p>
                        {notificacion.detalle && (
                            <div className="mt-2 text-xs bg-white/[0.04] p-2 rounded border border-white/[0.06] font-mono space-y-1">
                                <div><span className="text-gray-400">Código:</span> {notificacion.detalle.codigo}</div>
                                <div><span className="text-gray-400">Asistente:</span> {notificacion.detalle.asistente}</div>
                                <div><span className="text-gray-400">Personas:</span> {notificacion.detalle.personas}</div>
                            </div>
                        )}
                    </div>
                    <button onClick={() => setNotificacion(null)} className="text-gray-400 hover:text-white transition-colors text-lg font-semibold leading-none">&times;</button>
                </div>
            )}

            {/* ── Header ── */}
            <div
                className="mb-6 sm:mb-8"
                style={{ animation: 'fadeSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1) both' }}
            >
                <div className="flex flex-col sm:flex-row sm:items-end gap-2 sm:gap-4 mb-1">
                    <h1 className="font-display text-xl sm:text-2xl font-bold text-white leading-tight">
                        Panel de Organizador
                    </h1>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold uppercase tracking-[0.18em] rounded-sm w-fit">
                        <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                        Conectado en tiempo real
                    </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                    <p className="text-gray-400 capitalize">{fechaHoy}</p>
                    {usuario?.nombre && (
                        <>
                            <span className="text-gray-400">·</span>
                            <p className="text-gray-400">
                                Bienvenido, <span className="text-white font-medium">{usuario.nombre}</span>
                            </p>
                        </>
                    )}
                </div>
            </div>

            {/* ── Barra de Filtros Premium ── */}
            <div className="mb-6 p-4 bg-gray-900/50 border border-gray-800 rounded-xl backdrop-blur-sm shadow-lg animate-[fadeSlideIn_0.4s_cubic-bezier(0.4,0,0.2,1)_100ms_both]">
                <form onSubmit={manejarFiltrar} className="space-y-4">
                    {/* Fila 1: Filtros Temporales y Categorías */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="min-w-0">
                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Año</label>
                            <div className="relative">
                                <select
                                    value={filtroAnio}
                                    onChange={(e) => setFiltroAnio(e.target.value)}
                                    className="w-full pl-3 pr-10 py-2 bg-gray-800/80 border border-gray-700 hover:border-gray-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-white rounded-lg text-sm focus:outline-none transition-all duration-200 appearance-none max-w-full truncate"
                                >
                                    <option value="">Todos los años</option>
                                    {aniosDisponibles.map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                        <div className="min-w-0">
                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Mes</label>
                            <div className="relative">
                                <select
                                    value={filtroMes}
                                    onChange={(e) => setFiltroMes(e.target.value)}
                                    className="w-full pl-3 pr-10 py-2 bg-gray-800/80 border border-gray-700 hover:border-gray-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-white rounded-lg text-sm focus:outline-none transition-all duration-200 appearance-none max-w-full truncate"
                                >
                                    <option value="">Todos los meses</option>
                                    {mesesDisponibles.map(m => (
                                        <option key={m} value={m}>{NOMBRES_MESES[m] || m}</option>
                                    ))}
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                        <div className="min-w-0">
                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Tipo de Evento</label>
                            <div className="relative">
                                <select
                                    value={filtroCategoria}
                                    onChange={(e) => setFiltroCategoria(e.target.value)}
                                    className="w-full pl-3 pr-10 py-2 bg-gray-800/80 border border-gray-700 hover:border-gray-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-white rounded-lg text-sm focus:outline-none transition-all duration-200 appearance-none max-w-full truncate"
                                >
                                    <option value="">Todos los tipos</option>
                                    {categoriasDisponibles.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                        <div className="min-w-0">
                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Estado Evento</label>
                            <div className="relative">
                                <select
                                    value={filtroEstadoEvento}
                                    onChange={(e) => setFiltroEstadoEvento(e.target.value)}
                                    className="w-full pl-3 pr-10 py-2 bg-gray-800/80 border border-gray-700 hover:border-gray-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-white rounded-lg text-sm focus:outline-none transition-all duration-200 appearance-none max-w-full truncate"
                                >
                                    <option value="">Todos los estados</option>
                                    <option value="activo">Activos</option>
                                    <option value="inactivo">Inactivos</option>
                                    <option value="agotado">Agotados</option>
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Fila 2: Filtros de Selección Específica y Botones */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                        <div className="min-w-0 md:col-span-8">
                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Mi Evento</label>
                            <div className="relative">
                                <select
                                    value={filtroEvento}
                                    onChange={(e) => setFiltroEvento(e.target.value)}
                                    className="w-full pl-3 pr-10 py-2 bg-gray-800/80 border border-gray-700 hover:border-gray-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-white rounded-lg text-sm focus:outline-none transition-all duration-200 appearance-none max-w-full truncate"
                                >
                                    <option value="">Todos mis eventos</option>
                                    {eventosDisponibles.map((ev) => (
                                        <option key={ev.id} value={ev.id}>{ev.titulo}</option>
                                    ))}
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                        <div className="md:col-span-4 flex gap-2 justify-end">
                            <button
                                type="button"
                                onClick={manejarLimpiar}
                                className="flex-1 py-2 px-3 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-sm font-semibold rounded-lg border border-gray-700 hover:border-gray-600 transition-all duration-200 shadow-md"
                            >
                                Limpiar Filtros
                            </button>
                            <button
                                type="button"
                                onClick={manejarExportarCSV}
                                disabled={exportandoCSV || (eventosActivos?.length === 0)}
                                className="flex-1 py-2 px-3 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-lg shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                {exportandoCSV ? 'Exportando…' : 'Descargar CSV'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>

            {/* ── Alerta de Datos Vacíos / Sin Eventos ── */}
            {!cargando && datos && (eventosActivos?.length === 0) && (
                <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 text-amber-200 rounded-xl flex items-center gap-3 shadow-md animate-[fadeSlideIn_0.3s_ease_both]">
                    <svg className="w-5 h-5 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                        <p className="text-sm font-semibold">Sin eventos registrados</p>
                        <p className="text-xs text-amber-300/80 mt-0.5">No se encontraron eventos propios ni ventas que coincidan con los filtros seleccionados en este período.</p>
                    </div>
                </div>
            )}

            {/* ── KPI Cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
                <OrgKpiCard
                    titulo="Ingresos Totales"
                    icono={IconIngresos}
                    colorAccento="#8b5cf6"
                    valor={kpis?.ingresos?.actual}
                    valorAnterior={kpis?.ingresos?.anterior}
                    crecimiento={kpis?.ingresos?.crecimiento}
                    formato="currency"
                    cargando={cargando}
                    delay={0}
                />
                <OrgKpiCard
                    titulo="Entradas Vendidas"
                    icono={IconTickets}
                    colorAccento="#3b82f6"
                    valor={kpis?.tickets?.vendidos}
                    vendidos={kpis?.tickets?.vendidos}
                    capacidad={kpis?.tickets?.capacidad}
                    formato="number"
                    cargando={cargando}
                    delay={60}
                />
                <OrgKpiCard
                    titulo="Tasa de Asistencia"
                    icono={IconCheckin}
                    colorAccento="#34d399"
                    valor={kpis?.checkin?.tasa}
                    formato="percentage"
                    tasa={kpis?.checkin?.tasa}
                    tipo="checkin"
                    subtexto={kpis?.checkin ? `${kpis.checkin.asistentes} check-ins de ${kpis.checkin.vendidos} vendidas` : ''}
                    cargando={cargando}
                    delay={120}
                />
                <OrgKpiCard
                    titulo="Eventos Activos"
                    icono={IconEventos}
                    colorAccento="#f59e0b"
                    valor={eventosActivos?.filter(e => e.estado === 'activo').length}
                    subtexto={eventosActivos ? `${eventosActivos.length} eventos en total` : ''}
                    formato="number"
                    cargando={cargando}
                    delay={180}
                />
            </div>

            {/* ── Gráficos principales (2 cols) ── */}
            <div
                className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8"
                style={{ animation: 'fadeSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1) 200ms both' }}
            >
                <OrgRevenueChart datos={tendencia30dias || []} cargando={cargando} />
                <OrgDistributionChart datos={distribucionZonas || []} cargando={cargando} />
            </div>

            {/* ── Eficiencia de asistencia (ancho completo) ── */}
            <div
                className="mb-6 sm:mb-8"
                style={{ animation: 'fadeSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1) 300ms both' }}
            >
                <OrgAttendanceChart datos={eficienciaAsistencia || []} cargando={cargando} />
            </div>

            {/* ── Tabla de eventos + Insights ── */}
            <div
                className="grid grid-cols-1 lg:grid-cols-5 gap-3 sm:gap-4 mb-6 sm:mb-8"
                style={{ animation: 'fadeSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1) 400ms both' }}
            >
                <div className="lg:col-span-3">
                    <OrgEventsTable
                        datos={eventosActivos || []}
                        cargando={cargando}
                        onRegistrarAcceso={handleRegistrarAcceso}
                        cargandoAcceso={cargandoAcceso}
                    />
                </div>
                <div className="lg:col-span-2">
                    <InsightsPanel eventos={eventosActivos ?? []} />
                </div>
            </div>

            {/* ── Feed de actividad reciente ── */}
            <div style={{ animation: 'fadeSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1) 480ms both' }}>
                <OrgActivityFeed datos={actividadReciente || []} cargando={cargando} />
            </div>
        </div>
    );
};

export default OrganizadorDashboard;
