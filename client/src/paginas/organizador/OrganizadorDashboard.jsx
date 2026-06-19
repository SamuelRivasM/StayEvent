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

    const cargarDatos = async (mostrarLoader = true) => {
        if (mostrarLoader) setCargando(true);
        try {
            const respuesta = await api.get('/eventos/dashboard-organizador');
            setDatos(respuesta.data);
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
        cargarDatos(true);
    }, []);

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
            // Recargar datos sin mostrar spinner global
            await cargarDatos(false);
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
