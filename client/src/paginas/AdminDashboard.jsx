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
import { MOCK_DASHBOARD, MOCK_ALERTAS } from './dashboard/dashboardData';
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
    const [datos, setDatos] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    const [usandoMock, setUsandoMock] = useState(false);

    useEffect(() => {
        let activo = true;

        const cargarDatos = async () => {
            try {
                const res = await api.get('/admin/metricas-dashboard');
                if (activo) {
                    setDatos(res.data);
                    setUsandoMock(false);
                }
            } catch (err) {
                if (!activo) return;

                // Fallback a datos mock si el backend no está disponible
                console.warn(
                    '[AdminDashboard] Backend no disponible, usando datos mock.',
                    err.response?.status || err.message
                );
                setDatos(MOCK_DASHBOARD);
                setUsandoMock(true);
            } finally {
                if (activo) setCargando(false);
            }
        };

        cargarDatos();
        return () => { activo = false; };
    }, []);

    const kpis = datos?.kpis;

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

            {/* ── Error banner ─────────────────────────────────────────── */}
            {error && (
                <div className="bg-red-500/[0.08] border border-red-500/20 text-red-400 px-4 py-3 text-sm mb-6 flex items-center justify-between gap-4">
                    <span>{error}</span>
                    <button
                        onClick={() => setError('')}
                        aria-label="Cerrar"
                        className="text-red-400/50 hover:text-red-400 shrink-0 transition-colors"
                    >
                        ✕
                    </button>
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
                    <InsightsPanel
                        alertas={MOCK_ALERTAS}
                        cargando={cargando}
                    />
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
