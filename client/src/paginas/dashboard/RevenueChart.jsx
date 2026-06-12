// ─── RevenueChart — Gráfico de tendencia de ingresos y tickets (30 días) ──────
//
// Usa Recharts para renderizar un gráfico de líneas con dos series:
//   1. Ingresos diarios (línea con área degradada púrpura)
//   2. Tickets vendidos (línea esmeralda, eje Y secundario)
//
// Incluye tooltip personalizado en dark mode y leyenda interactiva.

import React from 'react';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
} from 'recharts';

// ─── Tooltip personalizado ────────────────────────────────────────────────────

const TooltipCustom = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;

    const formatFecha = (fecha) => {
        const d = new Date(fecha);
        return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
    };

    return (
        <div className="bg-gray-900 border border-white/[0.10] px-4 py-3 shadow-xl">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2 font-semibold">
                {formatFecha(label)}
            </p>
            {payload.map((entry, i) => (
                <div key={i} className="flex items-center gap-2 mb-1 last:mb-0">
                    <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-xs text-gray-400">{entry.name}:</span>
                    <span className="text-xs text-white font-semibold tabular-nums">
                        {entry.name === 'Ingresos'
                            ? `S/ ${Number(entry.value).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`
                            : Number(entry.value).toLocaleString('es-PE')
                        }
                    </span>
                </div>
            ))}
        </div>
    );
};

// ─── Leyenda personalizada ────────────────────────────────────────────────────

const LeyendaCustom = ({ payload }) => (
    <div className="flex items-center justify-center gap-5 mt-2">
        {payload?.map((entry, i) => (
            <div key={i} className="flex items-center gap-2">
                <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: entry.color }}
                />
                <span className="text-[11px] text-gray-500 font-medium">{entry.value}</span>
            </div>
        ))}
    </div>
);

// ─── Componente principal ─────────────────────────────────────────────────────

const RevenueChart = ({ datos, cargando }) => {
    if (cargando) {
        return (
            <div className="h-72 bg-white/[0.02] animate-pulse rounded-sm" />
        );
    }

    // Formatear labels del eje X (día y mes abreviado)
    const formatXAxis = (fecha) => {
        const d = new Date(fecha);
        return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
    };

    return (
        <div className="bg-white/[0.02] border border-white/[0.06] p-5">
            {/* Cabecera */}
            <div className="flex items-center gap-3 mb-5">
                <div className="w-0.5 h-5 bg-purple-500/70 rounded-full" />
                <div>
                    <h3 className="text-sm font-bold text-white">Tendencia de Ingresos</h3>
                    <p className="text-[10px] text-gray-600 mt-0.5">Últimos 30 días</p>
                </div>
            </div>

            {/* Gráfico */}
            <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={datos} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <defs>
                        <linearGradient id="gradIngresos" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="gradTickets" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#34d399" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#34d399" stopOpacity={0.0} />
                        </linearGradient>
                    </defs>

                    <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.04)"
                        vertical={false}
                    />

                    <XAxis
                        dataKey="dia"
                        tickFormatter={formatXAxis}
                        tick={{ fill: '#6b7280', fontSize: 10 }}
                        axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                        tickLine={false}
                        interval="preserveStartEnd"
                        minTickGap={40}
                    />

                    <YAxis
                        yAxisId="ingresos"
                        tick={{ fill: '#6b7280', fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => `S/${(v / 1000).toFixed(0)}k`}
                        width={55}
                    />

                    <YAxis
                        yAxisId="tickets"
                        orientation="right"
                        tick={{ fill: '#6b7280', fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        width={40}
                    />

                    <Tooltip content={<TooltipCustom />} cursor={{ stroke: 'rgba(139,92,246,0.2)' }} />
                    <Legend content={<LeyendaCustom />} />

                    <Area
                        yAxisId="ingresos"
                        type="monotone"
                        dataKey="ingresos"
                        name="Ingresos"
                        stroke="#8b5cf6"
                        strokeWidth={2}
                        fill="url(#gradIngresos)"
                        dot={false}
                        activeDot={{ r: 4, fill: '#8b5cf6', strokeWidth: 0 }}
                    />

                    <Area
                        yAxisId="tickets"
                        type="monotone"
                        dataKey="tickets"
                        name="Tickets"
                        stroke="#34d399"
                        strokeWidth={1.5}
                        strokeDasharray="5 3"
                        fill="url(#gradTickets)"
                        dot={false}
                        activeDot={{ r: 3, fill: '#34d399', strokeWidth: 0 }}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

export default RevenueChart;
