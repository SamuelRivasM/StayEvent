// ─── OrgActivityFeed — Feed de actividad reciente (organizador) ───────────────

import React from 'react';
import BotonExportarCSV from '../../componentes/BotonExportarCSV';

// ─── Columnas y formatos para exportación CSV ─────────────────────────────────

const CSV_COLUMNAS_ACTIVIDAD = {
    tipo:     'Tipo',
    usuario:  'Usuario',
    evento:   'Evento',
    cantidad: 'Cantidad',
    monto:    'Monto (S/)',
    fecha:    'Fecha',
};

const CSV_OPCIONES_ACTIVIDAD = {
    formatoColumnas: { monto: 'moneda', fecha: 'fecha' },
};

const formatTiempoRelativo = (fecha) => {
    if (!fecha) return '';
    const ahora = new Date();
    const d = new Date(fecha);
    const diff = Math.floor((ahora - d) / 1000);

    if (diff < 60)    return 'hace un momento';
    if (diff < 3600)  return `hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const formatMoneda = (monto) =>
    monto > 0
        ? `S/ ${Number(monto).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`
        : null;

const TIPO_CONFIG = {
    'Compra de Ticket': {
        color: 'text-purple-400',
        bg: 'bg-purple-500/10',
        icono: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
        ),
    },
    'Check-in QR': {
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
        icono: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M5 13l4 4L19 7" />
            </svg>
        ),
    },
    'Reserva Temporal': {
        color: 'text-amber-400',
        bg: 'bg-amber-500/10',
        icono: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
    },
};

const ItemActividad = React.memo(({ item }) => {
    const config = TIPO_CONFIG[item.tipo] || TIPO_CONFIG['Compra de Ticket'];
    const montoFmt = formatMoneda(item.monto);

    return (
        <div className="flex items-start gap-3 py-3 px-5 hover:bg-white/[0.02] transition-colors group">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${config.bg} ${config.color}`}>
                {config.icono}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <p className="text-sm text-white font-medium leading-snug">
                            <span className="font-normal text-gray-400">{item.tipo}:</span>{' '}
                            {item.usuario}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                            {item.evento}
                            {item.cantidad > 1 && <span> · {item.cantidad} entradas</span>}
                        </p>
                    </div>
                    <div className="text-right shrink-0">
                        {montoFmt && (
                            <p className="text-xs text-white font-semibold tabular-nums">{montoFmt}</p>
                        )}
                        <p className="text-[10px] text-gray-600 mt-0.5">{formatTiempoRelativo(item.fecha)}</p>
                    </div>
                </div>
            </div>
        </div>
    );
});

const OrgActivityFeed = ({ datos, cargando }) => {
    if (cargando) {
        return (
            <div className="bg-white/[0.02] border border-white/[0.06] p-5">
                <div className="h-8 w-40 bg-white/[0.04] animate-pulse rounded-sm mb-4" />
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 bg-white/[0.04] animate-pulse rounded-lg shrink-0" />
                        <div className="flex-1">
                            <div className="h-4 w-3/4 bg-white/[0.04] animate-pulse rounded-sm mb-1" />
                            <div className="h-3 w-1/2 bg-white/[0.03] animate-pulse rounded-sm" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="bg-white/[0.02] border border-white/[0.06] shadow-[0_2px_16px_rgba(0,0,0,0.3)]">
            <div className="px-5 py-4 border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                    <div className="w-0.5 h-5 bg-rose-500/70 rounded-full" />
                    <div className="flex-1">
                        <h2 className="text-sm font-bold text-white">Actividad Reciente</h2>
                        <p className="text-xs text-gray-400 mt-0.5">Últimas transacciones de tus eventos</p>
                    </div>
                    <BotonExportarCSV
                        datos={datos}
                        columnas={CSV_COLUMNAS_ACTIVIDAD}
                        nombreArchivo="actividad_organizador"
                        opciones={CSV_OPCIONES_ACTIVIDAD}
                        compact
                    />
                </div>
            </div>

            {datos && datos.length > 0 ? (
                <div className="divide-y divide-white/[0.04] max-h-[400px] overflow-y-auto">
                    {datos.map((item) => (
                        <ItemActividad key={item.id} item={item} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-12">
                    <svg className="w-8 h-8 text-gray-700 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <p className="text-gray-500 text-sm">Sin actividad reciente</p>
                </div>
            )}
        </div>
    );
};

export default OrgActivityFeed;
