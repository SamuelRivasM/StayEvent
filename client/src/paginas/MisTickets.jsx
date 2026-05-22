import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../componentes/Navbar';
import api from '../servicios/api';

const formatearFecha = (fecha) => {
    if (!fecha) return '-';
    const iso = typeof fecha === 'string'
        ? (fecha.includes('T') ? fecha.split('T')[0] : fecha)
        : null;
    if (!iso) return '-';
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-PE', {
        day: 'numeric', month: 'short', year: 'numeric',
    });
};

const formatearPrecio = (precio) => {
    const val = Number(precio);
    if (val === 0) return 'Gratis';
    return `S/ ${val % 1 === 0 ? val : val.toFixed(2)}`;
};

const ESTADO_BADGE = {
    confirmado: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    cancelado: 'text-red-400 bg-red-500/10 border-red-500/20',
    pendiente: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
};

const formatearHora = (hora) => hora ? String(hora).substring(0, 5) : '';

const formatearFechaLarga = (fecha) => {
    if (!fecha) return '-';
    const iso = typeof fecha === 'string'
        ? (fecha.includes('T') ? fecha.split('T')[0] : fecha)
        : null;
    if (!iso) return '-';
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-PE', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
};

const FilaDetalle = ({ label, value }) => (
    <div className="flex justify-between gap-4 text-sm">
        <span className="text-gray-600 flex-shrink-0">{label}</span>
        <span className="text-gray-300 text-right">{value}</span>
    </div>
);

const ModalDetalle = ({ compra, onCerrar }) => (
    <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
        onClick={onCerrar}
    >
        <div
            className="bg-gray-900 border border-white/10 w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
        >
            {/* Cabecera */}
            <div className="flex items-start justify-between gap-3 p-5 border-b border-white/[0.06]">
                <div className="min-w-0">
                    <span className="text-[10px] font-medium tracking-widest uppercase text-gray-600 mb-1 block">
                        {compra.evento_categoria}
                    </span>
                    <h2 className="font-display text-base font-bold text-white leading-snug">
                        {compra.evento_titulo}
                    </h2>
                </div>
                <button
                    onClick={onCerrar}
                    aria-label="Cerrar"
                    className="w-7 h-7 flex-shrink-0 flex items-center justify-center text-gray-500 hover:text-white transition-colors duration-100"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div className="p-5 space-y-5">
                {/* Sección evento */}
                <div>
                    <p className="text-[10px] font-medium tracking-widest uppercase text-gray-600 mb-3">
                        Información del evento
                    </p>
                    <div className="space-y-2.5">
                        <FilaDetalle label="Fecha" value={formatearFechaLarga(compra.evento_fecha)} />
                        {compra.evento_hora && (
                            <FilaDetalle label="Hora" value={formatearHora(compra.evento_hora)} />
                        )}
                        {compra.evento_lugar && (
                            <FilaDetalle label="Lugar" value={compra.evento_lugar} />
                        )}
                        {compra.evento_distrito && (
                            <FilaDetalle label="Distrito" value={compra.evento_distrito} />
                        )}
                    </div>
                    {compra.evento_descripcion && (
                        <div className="mt-3 pt-3 border-t border-white/[0.05]">
                            <p className="text-[10px] font-medium tracking-widest uppercase text-gray-600 mb-1.5">
                                Descripción
                            </p>
                            <p className="text-sm text-gray-400 leading-relaxed">
                                {compra.evento_descripcion}
                            </p>
                        </div>
                    )}
                </div>

                <div className="border-t border-white/[0.06]" />

                {/* Sección compra */}
                <div>
                    <p className="text-[10px] font-medium tracking-widest uppercase text-gray-600 mb-3">
                        Resumen de compra
                    </p>
                    <div className="space-y-2.5">
                        <FilaDetalle label="Zona" value={compra.zona_nombre} />
                        <FilaDetalle
                            label="Cantidad"
                            value={`${compra.cantidad} entrada${compra.cantidad !== 1 ? 's' : ''}`}
                        />
                        <FilaDetalle label="Subtotal" value={formatearPrecio(compra.subtotal)} />
                        <FilaDetalle label="Fecha de compra" value={formatearFecha(compra.fecha_compra)} />
                        <div className="flex justify-between gap-4 text-sm pt-1">
                            <span className="text-gray-600 flex-shrink-0">Estado</span>
                            <span
                                className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 border ${ESTADO_BADGE[compra.estado] || ESTADO_BADGE.pendiente}`}
                            >
                                {compra.estado}
                            </span>
                        </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-white/[0.05]">
                        <p className="text-[10px] font-medium tracking-widest uppercase text-gray-600 mb-1.5">
                            Código de ingreso
                        </p>
                        <p className="font-mono text-sm font-bold text-white tracking-widest">
                            {compra.codigo_ingreso}
                        </p>
                    </div>
                </div>

                <button
                    onClick={onCerrar}
                    className="w-full py-2.5 text-sm font-medium text-gray-400 border border-white/10 hover:text-white hover:border-white/25 transition-all duration-150"
                >
                    Cerrar
                </button>
            </div>
        </div>
    </div>
);

const ModalQR = ({ codigo, onCerrar }) => (
    <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
        onClick={onCerrar}
    >
        <div
            className="bg-gray-900 border border-white/10 p-6 max-w-xs w-full text-center"
            onClick={(e) => e.stopPropagation()}
        >
            <p className="text-[10px] font-medium tracking-widest uppercase text-gray-600 mb-4">
                Código de ingreso
            </p>
            <div className="bg-white p-3 inline-block mb-3">
                <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${codigo}&color=000000&bgcolor=ffffff`}
                    alt={`QR ${codigo}`}
                    width={160}
                    height={160}
                />
            </div>
            <p className="font-mono text-base font-bold text-white tracking-widest mb-5">{codigo}</p>
            <button
                onClick={onCerrar}
                className="w-full py-2 text-sm font-medium text-gray-400 border border-white/10 hover:text-white hover:border-white/25 transition-all duration-150"
            >
                Cerrar
            </button>
        </div>
    </div>
);

const MisTickets = () => {
    const [compras, setCompras] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);
    const [qrCodigo, setQrCodigo] = useState(null);
    const [detalleCompra, setDetalleCompra] = useState(null);

    useEffect(() => {
        const cargar = async () => {
            try {
                const resp = await api.get('/compras/mis-tickets');
                setCompras(resp.data.compras);
            } catch {
                setError('No se pudieron cargar tus tickets. Intenta nuevamente.');
            } finally {
                setCargando(false);
            }
        };
        cargar();
    }, []);

    const abrirQR = useCallback((codigo) => setQrCodigo(codigo), []);
    const cerrarQR = useCallback(() => setQrCodigo(null), []);
    const abrirDetalle = useCallback((compra) => setDetalleCompra(compra), []);
    const cerrarDetalle = useCallback(() => setDetalleCompra(null), []);

    return (
        <div className="min-h-screen bg-gray-950">
            <Navbar />

            <div className="max-w-4xl mx-auto px-5 sm:px-8 pt-28 pb-16">
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mb-8">
                    Mis Tickets
                </h1>

                {cargando && (
                    <div className="flex justify-center py-20">
                        <div className="w-8 h-8 rounded-full border-4 border-purple-500/20 border-t-purple-500 animate-spin" />
                    </div>
                )}

                {!cargando && error && (
                    <p className="text-gray-500 text-sm text-center py-16">{error}</p>
                )}

                {!cargando && !error && compras.length === 0 && (
                    <div className="text-center py-20">
                        <p className="text-gray-600 text-sm mb-3">Aún no tienes tickets.</p>
                        <Link
                            to="/"
                            className="text-sm text-purple-400 hover:text-purple-300 transition-colors duration-150"
                        >
                            Explorar eventos →
                        </Link>
                    </div>
                )}

                {!cargando && !error && compras.length > 0 && (
                    <div className="space-y-3">
                        {compras.map((c) => (
                            <div
                                key={c.id}
                                className="bg-white/[0.03] border border-white/[0.08] p-4 sm:p-5"
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white font-medium text-sm leading-snug mb-1.5 truncate">
                                            {c.evento_titulo}
                                        </p>
                                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                                            <span>{c.zona_nombre}</span>
                                            <span>{c.cantidad} entrada{c.cantidad !== 1 ? 's' : ''}</span>
                                            <span>{formatearPrecio(c.subtotal)}</span>
                                            <span>{formatearFecha(c.fecha_compra)}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <span
                                            className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 border ${ESTADO_BADGE[c.estado] || ESTADO_BADGE.pendiente}`}
                                        >
                                            {c.estado}
                                        </span>
                                        <button
                                            onClick={() => abrirDetalle(c)}
                                            className="px-3 py-1.5 text-xs font-medium text-gray-300 border border-white/15 hover:border-white/30 hover:text-white transition-all duration-150"
                                        >
                                            Ver Detalle
                                        </button>
                                        <button
                                            onClick={() => abrirQR(c.codigo_ingreso)}
                                            className="px-3 py-1.5 text-xs font-medium text-gray-300 border border-white/15 hover:border-white/30 hover:text-white transition-all duration-150"
                                        >
                                            Ver QR
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {detalleCompra && <ModalDetalle compra={detalleCompra} onCerrar={cerrarDetalle} />}
            {qrCodigo && <ModalQR codigo={qrCodigo} onCerrar={cerrarQR} />}
        </div>
    );
};

export default MisTickets;
