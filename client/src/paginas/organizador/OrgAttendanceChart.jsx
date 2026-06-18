// ─── OrgAttendanceChart — Eficiencia de asistencia (barras agrupadas) ──────────

import React from 'react';
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
    CartesianGrid, Tooltip, Legend, Cell,
} from 'recharts';

const TooltipCustom = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;
    const datos = payload[0]?.payload;
    const tasa = datos.vendidas > 0
        ? Math.round((datos.checkin / datos.vendidas) * 1000) / 10
        : 0;

    return (
        <div className="bg-gray-900 border border-white/[0.10] px-4 py-3 shadow-xl max-w-[220px]">
            <p className="text-xs text-white font-semibold mb-2 truncate">{label}</p>
            {payload.map((entry, i) => (
                <div key={i} className="flex items-center gap-2 mb-1 last:mb-0">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                    <span className="text-xs text-gray-400">{entry.name}:</span>
                    <span className="text-xs text-white font-semibold tabular-nums">
                        {Number(entry.value).toLocaleString('es-PE')}
                    </span>
                </div>
            ))}
            <div className="mt-1.5 pt-1.5 border-t border-white/[0.08]">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider">Tasa:</span>
                <span className={`ml-1.5 text-xs font-bold tabular-nums ${
                    tasa >= 70 ? 'text-emerald-400' : tasa >= 40 ? 'text-amber-400' : 'text-red-400'
                }`}>{tasa}%</span>
            </div>
        </div>
    );
};

const LeyendaCustom = ({ payload }) => (
    <div className="flex items-center justify-center gap-5 mt-2">
        {payload?.map((entry, i) => (
            <div key={i} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
                <span className="text-xs text-gray-400 font-medium">{entry.value}</span>
            </div>
        ))}
    </div>
);

const OrgAttendanceChart = ({ datos, cargando }) => {
    if (cargando) return <div className="h-72 bg-white/[0.02] animate-pulse rounded-sm" />;

    const truncarTitulo = (t) => t && t.length > 22 ? t.slice(0, 20) + '…' : t;

    return (
        <div className="bg-white/[0.02] border border-white/[0.06] p-5" role="region"
            aria-label="Gráfico de eficiencia de asistencia">
            <div className="flex items-center gap-3 mb-5">
                <div className="w-0.5 h-5 bg-amber-500/70 rounded-full" />
                <div>
                    <h2 className="text-sm font-bold text-white">Eficiencia de Asistencia</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Entradas vendidas vs check-in validado</p>
                </div>
            </div>

            <ResponsiveContainer width="100%" height={280}>
                <BarChart data={datos} layout="vertical"
                    margin={{ top: 5, right: 30, left: 5, bottom: 5 }} tabIndex={-1}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 12 }}
                        axisLine={{ stroke: 'rgba(255,255,255,0.06)' }} tickLine={false} />
                    <YAxis type="category" dataKey="evento" tick={{ fill: '#9ca3af', fontSize: 12 }}
                        axisLine={false} tickLine={false} width={140} tickFormatter={truncarTitulo} />
                    <Tooltip content={<TooltipCustom />} cursor={{ fill: 'rgba(139,92,246,0.06)' }} />
                    <Legend content={<LeyendaCustom />} />
                    <Bar dataKey="vendidas" name="Vendidas" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={14} />
                    <Bar dataKey="checkin" name="Check-in" fill="#34d399" radius={[0, 4, 4, 0]} barSize={14} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default OrgAttendanceChart;
