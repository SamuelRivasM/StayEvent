// ─── TicketDistributionChart — Distribución de ventas por categoría (donut) ───
//
// Muestra un gráfico de anillo (donut) con la proporción de tickets vendidos
// por cada categoría de zona (VIP, General, Early Bird, etc.).
// Usa Recharts PieChart con innerRadius para el efecto donut.

import React from 'react';
import {
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Tooltip,
} from 'recharts';

// ─── Paleta de colores ────────────────────────────────────────────────────────

const COLORES = ['#8b5cf6', '#34d399', '#f59e0b', '#3b82f6', '#ec4899', '#6366f1'];

// ─── Tooltip personalizado ────────────────────────────────────────────────────

const TooltipCustom = ({ active, payload }) => {
    if (!active || !payload || payload.length === 0) return null;

    const datos = payload[0].payload;
    const porcentaje = datos.porcentaje;

    return (
        <div className="bg-gray-900 border border-white/[0.10] px-4 py-3 shadow-xl">
            <div className="flex items-center gap-2 mb-1.5">
                <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: payload[0].payload.fill || payload[0].color }}
                />
                <span className="text-xs text-white font-semibold">{datos.categoria}</span>
            </div>
            <div className="text-[11px] text-gray-400 space-y-0.5">
                <p>Tickets: <span className="text-white font-semibold tabular-nums">{datos.tickets.toLocaleString('es-PE')}</span></p>
                <p>Ingresos: <span className="text-white font-semibold tabular-nums">S/ {datos.ingresos.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span></p>
                <p>Proporción: <span className="text-white font-semibold tabular-nums">{porcentaje}%</span></p>
            </div>
        </div>
    );
};

// ─── Componente principal ─────────────────────────────────────────────────────

const TicketDistributionChart = ({ datos, cargando }) => {
    if (cargando) {
        return (
            <div className="h-72 bg-white/[0.02] animate-pulse rounded-sm" />
        );
    }

    // Calcular porcentajes
    const totalTickets = datos.reduce((sum, d) => sum + d.tickets, 0);
    const datosConPorcentaje = datos.map(d => ({
        ...d,
        porcentaje: totalTickets > 0
            ? Math.round((d.tickets / totalTickets) * 1000) / 10
            : 0,
    }));

    return (
        <div className="bg-white/[0.02] border border-white/[0.06] p-5" role="region" aria-label="Gráfico de distribución de ventas por categoría">
            {/* Cabecera */}
            <div className="flex items-center gap-3 mb-5">
                <div className="w-0.5 h-5 bg-emerald-500/70 rounded-full" />
                <div>
                    <h2 className="text-sm font-bold text-white">Distribución de Ventas</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Por categoría de ticket</p>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6">
                {/* Donut */}
                <div className="w-full sm:w-1/2">
                    <ResponsiveContainer width="100%" height={220}>
                        <PieChart tabIndex={-1}>
                            <Pie
                                data={datosConPorcentaje}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={90}
                                dataKey="tickets"
                                stroke="rgba(3,7,18,0.6)"
                                strokeWidth={2}
                            >
                                {datosConPorcentaje.map((_, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={COLORES[index % COLORES.length]}
                                    />
                                ))}
                            </Pie>
                            <Tooltip content={<TooltipCustom />} />
                            {/* Label central */}
                            <text x="50%" y="46%" textAnchor="middle" fill="#ffffff" fontSize="20" fontWeight="700">
                                {totalTickets.toLocaleString('es-PE')}
                            </text>
                            <text x="50%" y="56%" textAnchor="middle" fill="#6b7280" fontSize="12" fontWeight="500">
                                tickets totales
                            </text>
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Leyenda */}
                <div className="w-full sm:w-1/2 space-y-2.5">
                    {datosConPorcentaje.map((item, index) => (
                        <div key={item.categoria} className="flex items-center gap-3">
                            <span
                                className="w-3 h-3 rounded-sm shrink-0"
                                style={{ backgroundColor: COLORES[index % COLORES.length] }}
                            />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-300 font-medium truncate">
                                        {item.categoria}
                                    </span>
                                    <span className="text-xs text-white font-semibold tabular-nums ml-2">
                                        {item.porcentaje}%
                                    </span>
                                </div>
                                <div className="h-1 bg-white/[0.06] rounded-full mt-1 overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{
                                            width: `${item.porcentaje}%`,
                                            backgroundColor: COLORES[index % COLORES.length],
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default TicketDistributionChart;
