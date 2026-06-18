// ─── TopEventsChart — Top 5 eventos por recaudación (barras horizontales) ─────
//
// Muestra un ranking visual de los eventos con mayor recaudación usando
// Recharts BarChart en orientación horizontal con tooltip detallado.

import React from 'react';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Cell,
} from 'recharts';

// ─── Paleta de colores ────────────────────────────────────────────────────────

const COLORES_BARRAS = ['#8b5cf6', '#a78bfa', '#7c3aed', '#6d28d9', '#c084fc'];

// ─── Tooltip personalizado ────────────────────────────────────────────────────

const TooltipCustom = ({ active, payload }) => {
    if (!active || !payload || payload.length === 0) return null;

    const datos = payload[0].payload;
    return (
        <div className="bg-gray-900 border border-white/[0.10] px-4 py-3 shadow-xl">
            <p className="text-xs text-white font-semibold mb-1.5 max-w-[200px] truncate">
                {datos.titulo}
            </p>
            <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-purple-400 shrink-0" />
                <span className="text-xs text-gray-400">Recaudación:</span>
                <span className="text-xs text-white font-semibold tabular-nums">
                    S/ {Number(datos.recaudacion).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                </span>
            </div>
            <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                <span className="text-xs text-gray-400">Asistencia:</span>
                <span className="text-xs text-white font-semibold tabular-nums">
                    {datos.asistencia.toLocaleString('es-PE')} tickets
                </span>
            </div>
        </div>
    );
};

// ─── Componente principal ─────────────────────────────────────────────────────

const TopEventsChart = ({ datos, cargando }) => {
    if (cargando) {
        return (
            <div className="h-72 bg-white/[0.02] animate-pulse rounded-sm" />
        );
    }

    // Truncar títulos largos para el eje Y
    const formatTitulo = (titulo) => {
        if (!titulo) return '';
        return titulo.length > 20 ? titulo.slice(0, 18) + '…' : titulo;
    };

    return (
        <div className="bg-white/[0.02] border border-white/[0.06] p-5" role="region" aria-label="Gráfico de top 5 eventos por recaudación">
            {/* Cabecera */}
            <div className="flex items-center gap-3 mb-5">
                <div className="w-0.5 h-5 bg-amber-500/70 rounded-full" />
                <div>
                    <h2 className="text-sm font-bold text-white">Top Eventos</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Mayor recaudación</p>
                </div>
            </div>

            {/* Gráfico */}
            <ResponsiveContainer width="100%" height={260}>
                <BarChart
                    data={datos}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 5, bottom: 5 }}
                    tabIndex={-1}
                >
                    <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.04)"
                        horizontal={false}
                    />

                    <XAxis
                        type="number"
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                        axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                        tickLine={false}
                        tickFormatter={(v) => `S/${(v / 1000).toFixed(0)}k`}
                    />

                    <YAxis
                        type="category"
                        dataKey="titulo"
                        tick={{ fill: '#9ca3af', fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                        width={130}
                        tickFormatter={formatTitulo}
                    />

                    <Tooltip
                        content={<TooltipCustom />}
                        cursor={{ fill: 'rgba(139,92,246,0.06)' }}
                    />

                    <Bar
                        dataKey="recaudacion"
                        radius={[0, 4, 4, 0]}
                        barSize={20}
                    >
                        {datos.map((_, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={COLORES_BARRAS[index % COLORES_BARRAS.length]}
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default TopEventsChart;
