// ─── AdminDashboard — Dashboard analítico del administrador ───────────────────
//
// Panel centralizado con:
//   - 4 KPI cards con indicadores de crecimiento
//   - Gráfico de tendencia de ingresos y tickets (30 días)
//   - Panel de insights y alertas inteligentes
//   - Gráfico de barras: Top 5 eventos por recaudación
//   - Gráfico donut: distribución de ventas por categoría
//   - Tabla de actividad global reciente (paginada)
//
// Intenta cargar datos del backend (GET /api/admin/metricas-dashboard).
// Si falla, cae automáticamente a datos mock para visualización inmediata.

import React, { useState, useEffect } from 'react';
import api from '../servicios/api';
import { MOCK_DASHBOARD } from './dashboard/dashboardData';
import KpiCard from './dashboard/KpiCard';
import RevenueChart from './dashboard/RevenueChart';
import TopEventsChart from './dashboard/TopEventsChart';
import TicketDistributionChart from './dashboard/TicketDistributionChart';
import InsightsPanel from './dashboard/InsightsPanel';
import ActivityTable from './dashboard/ActivityTable';

// ─── Animaciones globales del dashboard ───────────────────────────────────────

const KEYFRAMES = `
    @keyframes fadeSlideIn {
        from { opacity: 0; transform: translateY(8px); }
        to   { opacity: 1; transform: translateY(0);   }
    }
    @keyframes pulseGlow {
        0%, 100% { opacity: 0.6; }
        50%      { opacity: 1;   }
    }
`;

// ─── Iconos para las KPI cards ────────────────────────────────────────────────

const IconIngresos = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const IconTickets = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
    </svg>
);

const IconEventos = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

const IconUsuarios = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

// ─── Fecha formateada para el header ──────────────────────────────────────────

const obtenerFechaFormateada = () => {
    const ahora = new Date();
    return ahora.toLocaleDateString('es-PE', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
};

// ─── Componente principal ─────────────────────────────────────────────────────

const AdminDashboard = () => {
    const [filtroMes, setFiltroMes] = useState('');
    const [filtroAnio, setFiltroAnio] = useState('');
    const [filtroCategoria, setFiltroCategoria] = useState('');
    const [filtroEstadoEvento, setFiltroEstadoEvento] = useState('');
    const [filtroEvento, setFiltroEvento] = useState('');
    const [filtroOrganizador, setFiltroOrganizador] = useState('');

    const [listaEventos, setListaEventos] = useState([]);
    const [listaOrganizadores, setListaOrganizadores] = useState([]);

    const [datos, setDatos] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [usandoMock, setUsandoMock] = useState(false);
    const [exportandoCSV, setExportandoCSV] = useState(false);

    const cargarDatos = async (filtros = {}) => {
        setCargando(true);
        try {
            const res = await api.get('/admin/metricas-dashboard', { params: filtros });
            setDatos(res.data);
            setUsandoMock(false);

            // Corrección de filtros inconsistentes en cascada
            const valid = res.data?.filtrosValidos;
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
                if (filtroOrganizador && valid.organizadores && !valid.organizadores.some(o => String(o.id) === String(filtroOrganizador))) {
                    setFiltroOrganizador('');
                }
            }
        } catch (err) {
            console.warn(
                '[AdminDashboard] Backend no disponible, usando datos mock.',
                err.response?.status || err.message
            );
            setDatos(MOCK_DASHBOARD);
            setUsandoMock(true);
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        // Cargar listas de eventos y organizadores iniciales para los dropdowns
        const cargarListasFiltros = async () => {
            try {
                const [resEventos, resUsuarios] = await Promise.all([
                    api.get('/admin/eventos'),
                    api.get('/admin/usuarios')
                ]);
                setListaEventos(resEventos.data?.eventos || []);
                const orgs = (resUsuarios.data?.usuarios || []).filter(u => u.rol === 'organizador');
                setListaOrganizadores(orgs);
            } catch (err) {
                console.error('[AdminDashboard] Error al cargar listas para filtros:', err);
            }
        };
        cargarListasFiltros();
    }, []);

    // Carga de datos automatizada al modificar cualquier filtro
    useEffect(() => {
        const filtros = {};
        if (filtroMes) filtros.mes = filtroMes;
        if (filtroAnio) filtros.anio = filtroAnio;
        if (filtroCategoria) filtros.categoria = filtroCategoria;
        if (filtroEstadoEvento) filtros.estadoEvento = filtroEstadoEvento;
        if (filtroEvento) filtros.eventoId = filtroEvento;
        if (filtroOrganizador) filtros.organizadorId = filtroOrganizador;
        cargarDatos(filtros);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filtroMes, filtroAnio, filtroCategoria, filtroEstadoEvento, filtroEvento, filtroOrganizador]);

    const manejarFiltrar = (e) => {
        if (e) e.preventDefault();
    };

    const manejarLimpiar = () => {
        setFiltroMes('');
        setFiltroAnio('');
        setFiltroCategoria('');
        setFiltroEstadoEvento('');
        setFiltroEvento('');
        setFiltroOrganizador('');
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
            if (filtroOrganizador) params.organizadorId = filtroOrganizador;

            const respuesta = await api.get('/compras/export-csv', {
                params,
                responseType: 'blob'
            });

            const blob = new Blob([respuesta.data], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `reporte_administrador_${new Date().toISOString().slice(0, 10)}.csv`);
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

    const kpis = usandoMock ? MOCK_DASHBOARD.kpis : datos?.kpis;

    const NOMBRES_MESES = {
        1: 'Enero', 2: 'Febrero', 3: 'Marzo', 4: 'Abril', 5: 'Mayo', 6: 'Junio',
        7: 'Julio', 8: 'Agosto', 9: 'Septiembre', 10: 'Octubre', 11: 'Noviembre', 12: 'Diciembre'
    };

    const filtrosValidos = datos?.filtrosValidos || {};
    const aniosDisponibles = filtrosValidos.anios || [2025, 2026, 2027, 2028];
    const mesesDisponibles = filtrosValidos.meses || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const categoriasDisponibles = filtrosValidos.categorias || ['Conciertos', 'Festivales', 'Fiestas / Discoteca'];
    const organizadoresDisponibles = filtrosValidos.organizadores || listaOrganizadores;
    const eventosDisponibles = filtrosValidos.eventos || listaEventos;

    return (
        <div className="px-4 py-8 sm:px-6 lg:px-8">
            <style>{KEYFRAMES}</style>

            {/* ── Cabecera ────────────────────────────────────────────── */}
            <div className="mb-8" style={{ animation: 'fadeSlideIn 0.4s ease both' }}>
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
                    <div>
                        <p className="font-display text-2xl sm:text-3xl font-bold text-white leading-tight">
                            Panel de Administrador
                        </p>
                        <h1 className="font-display text-2xl sm:text-3xl font-bold text-white leading-tight">
                            Dashboard
                        </h1>
                        <div className="mt-3 h-px w-12 bg-gradient-to-r from-purple-500 to-transparent" />
                    </div>

                    {/* Fecha actual + indicador de modo */}
                    <div className="flex items-center gap-3">
                        {usandoMock && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider bg-amber-500/10 text-amber-400 rounded-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" style={{ animation: 'pulseGlow 2s ease infinite' }} />
                                Datos de prueba
                            </span>
                        )}
                        <p className="text-xs text-gray-400 capitalize hidden sm:block">
                            {obtenerFechaFormateada()}
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Barra de Filtros Premium ── */}
            <div className="mb-6 p-4 bg-gray-900/50 border border-gray-800 rounded-xl backdrop-blur-sm shadow-lg animate-[fadeSlideIn_0.4s_ease_both_100ms]">
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
                        <div className="min-w-0 md:col-span-4">
                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Evento Específico</label>
                            <div className="relative">
                                <select
                                    value={filtroEvento}
                                    onChange={(e) => setFiltroEvento(e.target.value)}
                                    className="w-full pl-3 pr-10 py-2 bg-gray-800/80 border border-gray-700 hover:border-gray-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-white rounded-lg text-sm focus:outline-none transition-all duration-200 appearance-none max-w-full truncate"
                                >
                                    <option value="">Todos los eventos</option>
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
                        <div className="min-w-0 md:col-span-4">
                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Organizador</label>
                            <div className="relative">
                                <select
                                    value={filtroOrganizador}
                                    onChange={(e) => setFiltroOrganizador(e.target.value)}
                                    className="w-full pl-3 pr-10 py-2 bg-gray-800/80 border border-gray-700 hover:border-gray-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-white rounded-lg text-sm focus:outline-none transition-all duration-200 appearance-none max-w-full truncate"
                                >
                                    <option value="">Todos los organizadores</option>
                                    {organizadoresDisponibles.map((org) => (
                                        <option key={org.id} value={org.id}>{org.nombre} {org.apellido}</option>
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
                                disabled={exportandoCSV || (kpis && kpis.eventos?.totales === 0)}
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
            {!cargando && kpis && kpis.eventos?.totales === 0 && (
                <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 text-amber-200 rounded-xl flex items-center gap-3 shadow-md animate-[fadeSlideIn_0.3s_ease_both]">
                    <svg className="w-5 h-5 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                        <p className="text-sm font-semibold">Sin resultados</p>
                        <p className="text-xs text-amber-300/80 mt-0.5">No se encontraron eventos ni transacciones que coincidan con los filtros seleccionados en este período.</p>
                    </div>
                </div>
            )}

            {/* ── KPI Cards ───────────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
                <KpiCard
                    titulo="Ingresos Totales"
                    valor={kpis?.ingresos.actual}
                    valorAnterior={kpis?.ingresos.anterior}
                    crecimiento={kpis?.ingresos.crecimiento}
                    icono={IconIngresos}
                    colorAccento="#10b981"
                    formato="currency"
                    cargando={cargando}
                    delay={0}
                />
                <KpiCard
                    titulo="Entradas Vendidas"
                    valor={kpis?.tickets.vendidos}
                    icono={IconTickets}
                    colorAccento="#8b5cf6"
                    cargando={cargando}
                    vendidos={kpis?.tickets.vendidos}
                    capacidad={kpis?.tickets.capacidad}
                    delay={60}
                />
                <KpiCard
                    titulo="Eventos Activos"
                    valor={kpis?.eventos.activos}
                    icono={IconEventos}
                    colorAccento="#f59e0b"
                    cargando={cargando}
                    subtexto={kpis ? `${kpis.eventos.totales} eventos totales` : undefined}
                    delay={120}
                />
                <KpiCard
                    titulo="Usuarios Activos"
                    valor={kpis?.usuarios.total}
                    icono={IconUsuarios}
                    colorAccento="#3b82f6"
                    cargando={cargando}
                    subtexto={
                        kpis
                            ? `+${kpis.usuarios.nuevosEstaSemana} esta semana · ${kpis.usuarios.organizadores} organizadores`
                            : undefined
                    }
                    delay={180}
                />
            </div>

            {/* ── Gráfico de tendencia + Panel de Insights ────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 mb-6">
                <div
                    className="lg:col-span-2 min-w-0 overflow-hidden"
                    style={{ animation: 'fadeSlideIn 0.5s ease 200ms both' }}
                >
                    <RevenueChart
                        datos={datos?.tendencia30dias || []}
                        cargando={cargando}
                    />
                </div>
                <div className="min-w-0" style={{ animation: 'fadeSlideIn 0.5s ease 280ms both' }}>
                    <InsightsPanel />
                </div>
            </div>

            {/* ── Gráfico de barras + Gráfico donut ───────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 mb-6">
                <div className="min-w-0 overflow-hidden" style={{ animation: 'fadeSlideIn 0.5s ease 360ms both' }}>
                    <TopEventsChart
                        datos={datos?.topEventos || []}
                        cargando={cargando}
                    />
                </div>
                <div className="min-w-0 overflow-hidden" style={{ animation: 'fadeSlideIn 0.5s ease 440ms both' }}>
                    <TicketDistributionChart
                        datos={datos?.distribucion || []}
                        cargando={cargando}
                    />
                </div>
            </div>

            {/* ── Tabla de actividad global ────────────────────────────── */}
            <div style={{ animation: 'fadeSlideIn 0.5s ease 520ms both' }}>
                <ActivityTable
                    datos={datos?.actividadReciente || []}
                    cargando={cargando}
                />
            </div>
        </div>
    );
};

export default AdminDashboard;
