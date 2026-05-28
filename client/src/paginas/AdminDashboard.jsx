import React, { useState, useEffect } from 'react';
import api from '../servicios/api';

const IconUsuarios = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

const IconOrganizadores = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
);

const IconEventoActivo = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
    </svg>
);

const IconEventoTotal = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

const IconCompras = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
);

const IconIngresos = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const Skeleton = () => (
    <div className="w-20 h-7 bg-white/[0.06] animate-pulse rounded-sm" />
);

const TarjetaMetrica = ({ titulo, valor, cargando, icono: Icono, colorFondo, colorIcono, colorValor, formato }) => {
    const valorFormateado = () => {
        if (valor === null || valor === undefined) return '—';
        if (formato === 'currency') {
            return `S/ ${Number(valor).toLocaleString('es-PE', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            })}`;
        }
        return Number(valor).toLocaleString('es-PE');
    };

    return (
        <div className="bg-white/[0.02] border border-white/[0.06] p-5 hover:bg-white/[0.035] transition-colors shadow-[0_2px_12px_rgba(0,0,0,0.3)]">
            <div className={`inline-flex items-center justify-center w-9 h-9 mb-4 ${colorFondo}`}>
                <span className={colorIcono}>
                    <Icono />
                </span>
            </div>
            <div className={`text-2xl font-bold mb-1 ${cargando ? '' : colorValor}`}>
                {cargando ? <Skeleton /> : valorFormateado()}
            </div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest leading-tight">
                {titulo}
            </p>
        </div>
    );
};

const SeccionMetricas = ({ titulo, tarjetas, cargando }) => (
    <div className="mb-8">
        <p className="text-[10px] text-gray-600 uppercase tracking-[0.22em] font-medium mb-4">
            {titulo}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {tarjetas.map((t) => (
                <TarjetaMetrica key={t.titulo} {...t} cargando={cargando} />
            ))}
        </div>
    </div>
);

const AdminDashboard = () => {
    const [metricas, setMetricas] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let activo = true;
        const cargar = async () => {
            try {
                const res = await api.get('/admin/metricas');
                if (activo) setMetricas(res.data);
            } catch (err) {
                if (!activo) return;
                const status = err.response?.status;
                const msg = err.response?.data?.mensaje || err.message;
                console.error('[AdminDashboard] Error al cargar métricas — status:', status, '| msg:', msg);
                setError(
                    status === 403 ? 'Sin permisos para cargar las métricas (403).' :
                    status === 401 ? 'Sesión expirada. Vuelve a iniciar sesión.' :
                    status === 500 ? 'Error interno del servidor (500).' :
                    'No se pudieron cargar las métricas. Verifica tu conexión.'
                );
            } finally {
                if (activo) setCargando(false);
            }
        };
        cargar();
        return () => { activo = false; };
    }, []);

    const seccionUsuarios = [
        {
            titulo: 'Total Usuarios',
            valor: metricas?.usuarios.total,
            icono: IconUsuarios,
            colorFondo: 'bg-blue-500/[0.08]',
            colorIcono: 'text-blue-400',
            colorValor: 'text-white',
        },
        {
            titulo: 'Total Organizadores',
            valor: metricas?.usuarios.organizadores,
            icono: IconOrganizadores,
            colorFondo: 'bg-violet-500/[0.08]',
            colorIcono: 'text-violet-400',
            colorValor: 'text-white',
        },
    ];

    const seccionEventos = [
        {
            titulo: 'Eventos Activos',
            valor: metricas?.eventos.activos,
            icono: IconEventoActivo,
            colorFondo: 'bg-emerald-500/[0.08]',
            colorIcono: 'text-emerald-400',
            colorValor: 'text-white',
        },
        {
            titulo: 'Eventos Totales',
            valor: metricas?.eventos.totales,
            icono: IconEventoTotal,
            colorFondo: 'bg-purple-500/[0.08]',
            colorIcono: 'text-purple-400',
            colorValor: 'text-white',
        },
    ];

    const seccionCompras = [
        {
            titulo: 'Compras Totales',
            valor: metricas?.compras.total,
            icono: IconCompras,
            colorFondo: 'bg-orange-500/[0.08]',
            colorIcono: 'text-orange-400',
            colorValor: 'text-white',
        },
        {
            titulo: 'Ingresos Totales',
            valor: metricas?.compras.ingresos,
            icono: IconIngresos,
            colorFondo: 'bg-emerald-500/[0.08]',
            colorIcono: 'text-emerald-400',
            colorValor: 'text-emerald-400',
            formato: 'currency',
        },
    ];

    return (
        <div className="px-5 py-8 sm:px-8">

            {/* Cabecera */}
            <div className="mb-9">
                <p className="text-xs text-gray-600 uppercase tracking-[0.2em] mb-2">
                    Panel de Administrador
                </p>
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-white leading-tight">
                    Dashboard
                </h1>
                <div className="mt-3 h-px w-12 bg-gradient-to-r from-purple-500 to-transparent" />
            </div>

            {error && (
                <div className="bg-red-500/[0.08] border border-red-500/20 text-red-400 px-4 py-3 text-sm mb-8 flex items-center justify-between gap-4">
                    <span>{error}</span>
                    <button
                        onClick={() => setError('')}
                        className="text-red-400/50 hover:text-red-400 shrink-0 transition-colors"
                    >
                        ✕
                    </button>
                </div>
            )}

            <SeccionMetricas titulo="Usuarios"  tarjetas={seccionUsuarios} cargando={cargando} />

            <div className="h-px bg-white/[0.04] mb-8" />

            <SeccionMetricas titulo="Eventos"   tarjetas={seccionEventos}  cargando={cargando} />

            <div className="h-px bg-white/[0.04] mb-8" />

            <SeccionMetricas titulo="Compras"   tarjetas={seccionCompras}  cargando={cargando} />
        </div>
    );
};

export default AdminDashboard;
