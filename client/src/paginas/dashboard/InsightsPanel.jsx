// ─── InsightsPanel — Panel de alertas inteligentes del sistema ─────────────────
//
// Muestra una lista de alertas automáticas del sistema para el administrador,
// clasificadas por severidad (warning, info, success) con iconos y timestamps.
// Soporta máximo 5 alertas visibles con scroll interno.

import React from 'react';

// ─── Iconos por tipo de alerta ────────────────────────────────────────────────

const IconWarning = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
    </svg>
);

const IconInfo = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const IconSuccess = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

// ─── Configuración de estilos por tipo ────────────────────────────────────────

const TIPO_CONFIG = {
    warning: {
        icono:   IconWarning,
        bgIcono: 'bg-amber-500/10',
        color:   'text-amber-400',
        borde:   'border-l-amber-500/40',
    },
    info: {
        icono:   IconInfo,
        bgIcono: 'bg-blue-500/10',
        color:   'text-blue-400',
        borde:   'border-l-blue-500/40',
    },
    success: {
        icono:   IconSuccess,
        bgIcono: 'bg-emerald-500/10',
        color:   'text-emerald-400',
        borde:   'border-l-emerald-500/40',
    },
};

// ─── Componente de alerta individual ──────────────────────────────────────────

const AlertaItem = ({ alerta, index }) => {
    const config = TIPO_CONFIG[alerta.tipo] || TIPO_CONFIG.info;
    const Icono = config.icono;

    return (
        <div
            className={`flex gap-3 p-3.5 border-l-2 ${config.borde} bg-white/[0.015] hover:bg-white/[0.03] transition-colors`}
            style={{
                animation: `fadeSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) ${index * 80}ms both`,
            }}
        >
            {/* Icono */}
            <div className={`w-8 h-8 rounded-lg ${config.bgIcono} flex items-center justify-center shrink-0`}>
                <span className={config.color}>
                    <Icono />
                </span>
            </div>

            {/* Contenido */}
            <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-300 leading-relaxed">
                    {alerta.mensaje}
                </p>
                <p className="text-[10px] text-gray-600 mt-1.5 font-medium">
                    {alerta.tiempo}
                </p>
            </div>
        </div>
    );
};

// ─── Componente principal ─────────────────────────────────────────────────────

const InsightsPanel = ({ alertas, cargando }) => {
    if (cargando) {
        return (
            <div className="bg-white/[0.02] border border-white/[0.06] p-5 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-16 bg-white/[0.03] animate-pulse rounded-sm" />
                ))}
            </div>
        );
    }

    return (
        <div className="bg-white/[0.02] border border-white/[0.06] h-full flex flex-col">
            {/* Cabecera */}
            <div className="px-5 pt-5 pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-0.5 h-5 bg-blue-500/70 rounded-full" />
                    <div className="flex-1">
                        <h3 className="text-sm font-bold text-white">Insights & Alertas</h3>
                        <p className="text-[10px] text-gray-600 mt-0.5">Notificaciones del sistema</p>
                    </div>
                    {/* Badge de cantidad */}
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-purple-500/15 text-[10px] text-purple-400 font-bold">
                        {alertas.length}
                    </span>
                </div>
            </div>

            {/* Lista de alertas */}
            <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2 max-h-[380px]">
                {alertas.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-xs text-gray-600">Sin alertas pendientes</p>
                    </div>
                ) : (
                    alertas.map((alerta, index) => (
                        <AlertaItem key={alerta.id} alerta={alerta} index={index} />
                    ))
                )}
            </div>
        </div>
    );
};

export default InsightsPanel;
