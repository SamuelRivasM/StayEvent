// ─── KpiCard — Tarjeta de indicador clave de rendimiento ──────────────────────
//
// Muestra un KPI con:
//   - Icono + título
//   - Valor principal formateado (moneda o número)
//   - Indicador de crecimiento (flecha + porcentaje)
//   - Barra de progreso opcional (ej. tickets vendidos vs capacidad)
//   - Skeleton de carga con animación shimmer

import React from 'react';

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const Skeleton = () => (
    <div className="w-24 h-7 bg-white/[0.06] animate-pulse rounded-sm" />
);

// ─── Indicador de crecimiento ─────────────────────────────────────────────────

const IndicadorCrecimiento = ({ valor }) => {
    if (valor === null || valor === undefined) return null;
    const positivo = valor >= 0;
    return (
        <span className={`inline-flex items-center gap-1 text-xs font-semibold tabular-nums ${
            positivo ? 'text-emerald-400' : 'text-red-400'
        }`}>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                    d={positivo
                        ? 'M5 15l7-7 7 7'
                        : 'M19 9l-7 7-7-7'
                    }
                />
            </svg>
            {Math.abs(valor)}%
        </span>
    );
};

// ─── Barra de progreso ────────────────────────────────────────────────────────

const BarraProgreso = ({ vendidos, capacidad }) => {
    if (!capacidad || capacidad === 0) return null;
    const porcentaje = Math.min((vendidos / capacidad) * 100, 100);
    return (
        <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
                <span>{vendidos.toLocaleString('es-PE')} vendidos</span>
                <span>{capacidad.toLocaleString('es-PE')} capacidad</span>
            </div>
            <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                        width: `${porcentaje}%`,
                        background: porcentaje > 85
                            ? 'linear-gradient(90deg, #f59e0b, #ef4444)'
                            : 'linear-gradient(90deg, #8b5cf6, #a78bfa)',
                    }}
                />
            </div>
        </div>
    );
};

// ─── Componente principal ─────────────────────────────────────────────────────

const KpiCard = ({
    titulo,
    valor,
    valorAnterior,
    crecimiento,
    icono: Icono,
    colorAccento,
    formato,
    cargando,
    vendidos,
    capacidad,
    subtexto,
    delay = 0,
}) => {
    const formatearValor = () => {
        if (valor === null || valor === undefined) return '—';
        if (formato === 'currency') {
            return `S/ ${Number(valor).toLocaleString('es-PE', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            })}`;
        }
        return Number(valor).toLocaleString('es-PE');
    };

    const animStyle = {
        animation: `fadeSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1) ${delay}ms both`,
    };

    return (
        <div
            className="bg-white/[0.02] border border-white/[0.06] px-5 py-5 relative overflow-hidden hover:bg-white/[0.035] transition-all duration-200 group"
            style={animStyle}
        >
            {/* Gradiente de acento */}
            <div
                className="absolute inset-0 pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity"
                style={{
                    background: `linear-gradient(135deg, ${colorAccento}12 0%, transparent 60%)`,
                }}
            />

            <div className="relative">
                {/* Cabecera: icono + título */}
                <div className="flex items-center gap-2.5 mb-3">
                    <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${colorAccento}15` }}
                    >
                        <span style={{ color: colorAccento }}>
                            <Icono />
                        </span>
                    </div>
                    <span className="text-xs text-gray-400 uppercase tracking-[0.18em] font-semibold leading-tight">
                        {titulo}
                    </span>
                </div>

                {/* Valor principal */}
                <div className="flex items-end gap-3 mb-1">
                    {cargando ? (
                        <Skeleton />
                    ) : (
                        <>
                            <span className="text-2xl font-bold text-white tabular-nums leading-none">
                                {formatearValor()}
                            </span>
                            <IndicadorCrecimiento valor={crecimiento} />
                        </>
                    )}
                </div>

                {/* Subtexto */}
                {!cargando && subtexto && (
                    <p className="text-xs text-gray-400 mt-1">{subtexto}</p>
                )}

                {/* Valor anterior */}
                {!cargando && valorAnterior !== undefined && formato === 'currency' && (
                    <p className="text-xs text-gray-400 mt-1 tabular-nums">
                        Mes anterior: S/ {Number(valorAnterior).toLocaleString('es-PE', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        })}
                    </p>
                )}

                {/* Barra de progreso */}
                {!cargando && capacidad > 0 && (
                    <BarraProgreso vendidos={vendidos} capacidad={capacidad} />
                )}
            </div>
        </div>
    );
};

export default KpiCard;
