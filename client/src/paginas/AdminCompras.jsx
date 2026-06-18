import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';

// ─── Animaciones ──────────────────────────────────────────────────────────────

const KEYFRAMES = `
    @keyframes fadeScaleIn {
        from { opacity: 0; transform: scale(0.97); }
        to   { opacity: 1; transform: scale(1);    }
    }
    @keyframes overlayIn {
        from { opacity: 0; }
        to   { opacity: 1; }
    }
    @keyframes toastIn {
        from { opacity: 0; transform: translateY(10px); }
        to   { opacity: 1; transform: translateY(0);    }
    }
    @keyframes shimmer {
        0%   { background-position: -400px 0; }
        100% { background-position: 400px 0;  }
    }
`;

const ANIM_OVERLAY = { animation: 'overlayIn 0.18s ease', willChange: 'opacity' };
const ANIM_SCALE   = { animation: 'fadeScaleIn 0.18s cubic-bezier(0.4, 0, 0.2, 1)', willChange: 'transform, opacity' };

// ─── Datos mockeados (multi-mes, multi-año) ───────────────────────────────────

const COMPRAS_MOCK = [
    // ── Noviembre 2025 ──
    { id: 2001, email: 'pedro.sanchez@gmail.com',     nombre: 'Pedro Sánchez',     evento: 'Festival Luces de Lima',       cantidad: 2,  total: 180.00,  fecha: '2025-11-05T19:30:00' },
    { id: 2002, email: 'rosa.martinez@outlook.com',   nombre: 'Rosa Martínez',     evento: 'Concierto Bad Bunny',          cantidad: 4,  total: 960.00,  fecha: '2025-11-12T10:15:00' },
    { id: 2003, email: 'luis.herrera@yahoo.com',       nombre: 'Luis Herrera',      evento: 'Festival Luces de Lima',       cantidad: 1,  total: 90.00,   fecha: '2025-11-18T14:45:00' },

    // ── Diciembre 2025 ──
    { id: 2004, email: 'ana.quispe@gmail.com',         nombre: 'Ana Quispe',        evento: 'Fiesta Año Nuevo Premium',     cantidad: 6,  total: 1500.00, fecha: '2025-12-01T09:00:00' },
    { id: 2005, email: 'carlos.ramirez@gmail.com',     nombre: 'Carlos Ramírez',    evento: 'Concierto Bad Bunny',          cantidad: 2,  total: 480.00,  fecha: '2025-12-10T16:20:00' },
    { id: 2006, email: 'maria.silva@yahoo.com',        nombre: 'María Silva',       evento: 'Fiesta Año Nuevo Premium',     cantidad: 4,  total: 1000.00, fecha: '2025-12-22T11:30:00' },
    { id: 2007, email: 'jorge.huamani@gmail.com',      nombre: 'Jorge Huamaní',     evento: 'Mercado Navideño Artesanal',   cantidad: 3,  total: 45.00,   fecha: '2025-12-24T08:10:00' },

    // ── Febrero 2026 ──
    { id: 2008, email: 'valentina.rojas@gmail.com',    nombre: 'Valentina Rojas',   evento: 'Stand Up Comedy Night',        cantidad: 2,  total: 80.00,   fecha: '2026-02-03T20:00:00' },
    { id: 2009, email: 'fernando.diaz@outlook.com',    nombre: 'Fernando Díaz',     evento: 'Expo Arte Digital',            cantidad: 1,  total: 30.00,   fecha: '2026-02-14T12:00:00' },
    { id: 2010, email: 'camila.torres@gmail.com',      nombre: 'Camila Torres',     evento: 'Stand Up Comedy Night',        cantidad: 5,  total: 200.00,  fecha: '2026-02-14T20:30:00' },
    { id: 2011, email: 'diego.vargas@outlook.com',     nombre: 'Diego Vargas',      evento: 'Expo Arte Digital',            cantidad: 2,  total: 60.00,   fecha: '2026-02-21T15:45:00' },

    // ── Marzo 2026 ──
    { id: 2012, email: 'sofia.gutierrez@yahoo.com',    nombre: 'Sofía Gutiérrez',   evento: 'Tomorrowland Perú 2026',       cantidad: 3,  total: 510.00,  fecha: '2026-03-01T10:00:00' },
    { id: 2013, email: 'ricardo.paredes@hotmail.com',  nombre: 'Ricardo Paredes',   evento: 'Tech Meetup Lima 2026',        cantidad: 1,  total: 0.00,    fecha: '2026-03-08T09:30:00' },
    { id: 2014, email: 'lucia.mendoza@outlook.com',    nombre: 'Lucía Mendoza',     evento: 'Tomorrowland Perú 2026',       cantidad: 2,  total: 340.00,  fecha: '2026-03-15T14:20:00' },

    // ── Mayo 2026 ──
    { id: 2015, email: 'andres.castro@hotmail.com',    nombre: 'Andrés Castro',     evento: 'Concierto Coldplay Lima',      cantidad: 4,  total: 1200.00, fecha: '2026-05-02T09:45:00' },
    { id: 2016, email: 'isabella.flores@gmail.com',    nombre: 'Isabella Flores',   evento: 'Festival Selvámonos',          cantidad: 2,  total: 170.00,  fecha: '2026-05-10T11:00:00' },
    { id: 2017, email: 'carlos.ramirez@gmail.com',     nombre: 'Carlos Ramírez',    evento: 'Concierto Coldplay Lima',      cantidad: 2,  total: 600.00,  fecha: '2026-05-18T15:12:00' },
    { id: 2018, email: 'pedro.sanchez@gmail.com',      nombre: 'Pedro Sánchez',     evento: 'Festival Selvámonos',          cantidad: 1,  total: 85.00,   fecha: '2026-05-20T17:30:00' },
    { id: 2019, email: 'ana.quispe@gmail.com',         nombre: 'Ana Quispe',        evento: 'Concierto Coldplay Lima',      cantidad: 3,  total: 900.00,  fecha: '2026-05-25T14:30:00' },
    { id: 2020, email: 'valentina.rojas@gmail.com',    nombre: 'Valentina Rojas',   evento: 'Stand Up Comedy Night',        cantidad: 2,  total: 80.00,   fecha: '2026-05-27T20:00:00' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MESES_ES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const formatFechaHora = (fecha) => {
    if (!fecha) return '—';
    return new Date(fecha).toLocaleString('es-PE', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
};

const formatMoneda = (monto) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(monto);

/** Extrae periodos únicos (mes-año) ordenados cronológicamente de más reciente a más antiguo */
const extraerPeriodos = (compras) => {
    const mapa = new Map();
    for (const c of compras) {
        const d = new Date(c.fecha);
        const clave = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
        if (!mapa.has(clave)) {
            mapa.set(clave, {
                valor: clave,
                label: `${MESES_ES[d.getMonth()]} ${d.getFullYear()}`,
                year: d.getFullYear(),
                month: d.getMonth(),
            });
        }
    }
    return [...mapa.values()].sort((a, b) => {
        if (b.year !== a.year) return b.year - a.year;
        return b.month - a.month;
    });
};

/** Filtra compras por periodo "YYYY-MM" */
const filtrarPorPeriodo = (compras, periodo) => {
    if (periodo === 'todos') return compras;
    const [y, m] = periodo.split('-').map(Number);
    return compras.filter((c) => {
        const d = new Date(c.fecha);
        return d.getFullYear() === y && d.getMonth() === m;
    });
};

/** Calcula los KPIs a partir de un subconjunto de compras */
const calcularKPIs = (lista) => {
    const totalIngresos    = lista.reduce((s, c) => s + c.total, 0);
    const ticketsVendidos  = lista.reduce((s, c) => s + c.cantidad, 0);

    // Evento top por volumen (cantidad de tickets)
    const volumenPorEvento = {};
    const ingresoPorEvento = {};
    for (const c of lista) {
        volumenPorEvento[c.evento] = (volumenPorEvento[c.evento] || 0) + c.cantidad;
        ingresoPorEvento[c.evento] = (ingresoPorEvento[c.evento] || 0) + c.total;
    }

    let eventoTopVolumen  = '—';
    let maxVolumen        = 0;
    for (const [ev, vol] of Object.entries(volumenPorEvento)) {
        if (vol > maxVolumen) { maxVolumen = vol; eventoTopVolumen = ev; }
    }

    let eventoTopIngreso  = '—';
    let maxIngreso        = 0;
    for (const [ev, ing] of Object.entries(ingresoPorEvento)) {
        if (ing > maxIngreso) { maxIngreso = ing; eventoTopIngreso = ev; }
    }

    return { totalIngresos, ticketsVendidos, eventoTopVolumen, maxVolumen, eventoTopIngreso, maxIngreso };
};

// ─── Exportar CSV ─────────────────────────────────────────────────────────────

const exportarCSV = (compras) => {
    const encabezados = ['ID', 'Cliente', 'Email', 'Evento', 'Cantidad', 'Total (USD)', 'Fecha'];
    const filas = compras.map((c) => [
        c.id,
        `"${c.nombre}"`,
        c.email,
        `"${c.evento}"`,
        c.cantidad,
        c.total.toFixed(2),
        formatFechaHora(c.fecha),
    ]);
    const csv = [encabezados.join(','), ...filas.map((f) => f.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href     = url;
    link.download = `compras_stayevent_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

// ─── Skeleton Loader ──────────────────────────────────────────────────────────

const shimmerStyle = {
    backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.04) 50%, rgba(255,255,255,0) 100%)',
    backgroundSize: '400px 100%',
    backgroundRepeat: 'no-repeat',
    animation: 'shimmer 1.8s ease-in-out infinite',
};

const SkeletonKPI = () => (
    <div className="bg-white/[0.02] border border-white/[0.06] px-4 py-4">
        <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-white/[0.06]" />
            <div className="w-20 h-2.5 rounded bg-white/[0.04]" style={shimmerStyle} />
        </div>
        <div className="w-28 h-6 rounded bg-white/[0.04]" style={shimmerStyle} />
    </div>
);

const SkeletonRow = () => (
    <tr className="border-b border-white/[0.04]">
        <td className="pl-5 pr-2 py-4"><div className="w-12 h-4 rounded bg-white/[0.04] mx-auto" style={shimmerStyle} /></td>
        <td className="px-4 py-4">
            <div className="w-32 h-4 rounded bg-white/[0.04] mb-1.5" style={shimmerStyle} />
            <div className="w-44 h-3 rounded bg-white/[0.04]" style={shimmerStyle} />
        </td>
        <td className="px-4 py-4 hidden md:table-cell"><div className="w-40 h-4 rounded bg-white/[0.04]" style={shimmerStyle} /></td>
        <td className="px-4 py-4 hidden lg:table-cell"><div className="w-8 h-4 rounded bg-white/[0.04] mx-auto" style={shimmerStyle} /></td>
        <td className="px-4 py-4"><div className="w-16 h-4 rounded bg-white/[0.04] ml-auto" style={shimmerStyle} /></td>
        <td className="px-5 py-4"><div className="w-8 h-8 rounded bg-white/[0.04] ml-auto" style={shimmerStyle} /></td>
    </tr>
);

// ─── Campo lectura en modal detalle ──────────────────────────────────────────

const CampoDetalle = ({ label, value, highlight }) => (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-white/[0.04]">
        <span className="text-xs text-gray-500 uppercase tracking-widest shrink-0">{label}</span>
        <span className={`text-sm text-right break-all ${highlight ? 'font-semibold text-white' : 'text-gray-300'}`}>
            {value || '—'}
        </span>
    </div>
);

// ─── Fila de tabla ────────────────────────────────────────────────────────────

const FilaCompra = React.memo(({ compra, onDetalle }) => (
    <tr className="border-b border-white/[0.04] hover:bg-white/[0.025] transition-colors">
        <td className="pl-5 pr-2 py-4 text-gray-400 text-sm tabular-nums text-center w-16 font-mono">
            #{compra.id}
        </td>
        <td className="px-4 py-4">
            <p className="font-medium text-white text-sm leading-snug">{compra.nombre}</p>
            <p className="text-sm text-gray-400 mt-0.5 truncate max-w-[200px]">{compra.email}</p>
        </td>
        <td className="px-4 py-4 text-gray-400 text-sm hidden md:table-cell max-w-[220px] truncate">
            {compra.evento}
        </td>
        <td className="px-4 py-4 text-gray-400 text-sm text-center hidden lg:table-cell tabular-nums">
            {compra.cantidad}
        </td>
        <td className="px-4 py-4 text-right tabular-nums">
            <span className="text-sm font-semibold text-white">{formatMoneda(compra.total)}</span>
        </td>
        <td className="px-5 py-4">
            <div className="flex items-center justify-end">
                <button
                    onClick={() => onDetalle(compra)}
                    title="Ver detalle"
                    className="p-2 text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                </button>
            </div>
        </td>
    </tr>
));

// ─── Componente principal ─────────────────────────────────────────────────────

const AdminCompras = () => {
    const [compras, setCompras]           = useState([]);
    const [cargando, setCargando]         = useState(true);
    const [mostrarSkeleton, setMostrarSkeleton] = useState(false);

    const [busqueda, setBusqueda]         = useState('');
    const [periodoSel, setPeriodoSel]     = useState('todos');

    const [modalDetalle, setModalDetalle] = useState(null);

    const [toast, setToast]     = useState('');
    const toastTimerRef         = useRef(null);

    useEffect(() => () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); }, []);

    const mostrarToast = useCallback((msg) => {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        setToast(msg);
        toastTimerRef.current = setTimeout(() => setToast(''), 3000);
    }, []);

    // Skeleton diferido (se muestra tras 250ms para evitar parpadeos en redes rápidas)
    useEffect(() => {
        const skeletonTimer = setTimeout(() => {
            setMostrarSkeleton(true);
        }, 250);

        const timer = setTimeout(() => {
            setCompras(COMPRAS_MOCK);
            setCargando(false);
            clearTimeout(skeletonTimer);
            setMostrarSkeleton(false);
        }, 50);

        return () => {
            clearTimeout(timer);
            clearTimeout(skeletonTimer);
        };
    }, []);

    // Periodos disponibles extraídos de los datos
    const periodos = useMemo(() => extraerPeriodos(compras), [compras]);

    // ── Pipeline de filtrado: primero por periodo, luego por texto ────────
    const comprasPorPeriodo = useMemo(
        () => filtrarPorPeriodo(compras, periodoSel),
        [compras, periodoSel],
    );

    const comprasFiltradas = useMemo(() => {
        const q = busqueda.trim().toLowerCase();
        if (!q) return comprasPorPeriodo;
        return comprasPorPeriodo.filter((c) =>
            String(c.id).includes(q) ||
            c.nombre?.toLowerCase().includes(q) ||
            c.email?.toLowerCase().includes(q) ||
            c.evento?.toLowerCase().includes(q)
        );
    }, [comprasPorPeriodo, busqueda]);

    // KPIs calculados sobre el periodo (antes del filtro de texto)
    const kpis = useMemo(() => calcularKPIs(comprasPorPeriodo), [comprasPorPeriodo]);

    const hayFiltrosActivos = busqueda !== '' || periodoSel !== 'todos';

    const limpiarFiltros = useCallback(() => {
        setBusqueda('');
        setPeriodoSel('todos');
    }, []);

    // ── Modal ─────────────────────────────────────────────────
    const abrirDetalle  = useCallback((c) => setModalDetalle(c), []);
    const cerrarDetalle = useCallback(() => setModalDetalle(null), []);

    // ── Exportar ──────────────────────────────────────────────
    const handleExportar = useCallback(() => {
        if (comprasFiltradas.length === 0) return;
        exportarCSV(comprasFiltradas);
        mostrarToast('Archivo CSV exportado correctamente.');
    }, [comprasFiltradas, mostrarToast]);

    // ──────────────────────────────────────────────────────────

    return (
        <div className="px-5 py-8 sm:px-8">
            <style>{KEYFRAMES}</style>

            {/* ── Encabezado ─────────────────────────────────────── */}
            <div className="mb-9">
                <p className="text-xs text-gray-400 uppercase tracking-[0.2em] mb-2">
                    Panel de Administrador
                </p>
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-white leading-tight">
                    Gestión de Compras
                </h1>
                <div className="mt-3 h-px w-12 bg-gradient-to-r from-purple-500 to-transparent" />
            </div>

            {/* ── KPI Cards ──────────────────────────────────────── */}
            {mostrarSkeleton ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                    {Array.from({ length: 4 }).map((_, i) => <SkeletonKPI key={i} />)}
                </div>
            ) : (!cargando && compras.length > 0) ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                    {/* Ingresos Totales */}
                    <div className="bg-white/[0.02] border border-white/[0.06] px-4 py-4 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.07] to-transparent pointer-events-none" />
                        <div className="relative">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                <h3 className="text-xs text-gray-500 uppercase tracking-widest font-semibold">
                                    Ingresos Totales
                                </h3>
                            </div>
                            <p className="text-lg font-semibold text-white tabular-nums">{formatMoneda(kpis.totalIngresos)}</p>
                        </div>
                    </div>

                    {/* Tickets Vendidos */}
                    <div className="bg-white/[0.02] border border-white/[0.06] px-4 py-4 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/[0.07] to-transparent pointer-events-none" />
                        <div className="relative">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                                <h3 className="text-xs text-gray-500 uppercase tracking-widest font-semibold">
                                    Tickets Vendidos
                                </h3>
                            </div>
                            <p className="text-lg font-semibold text-white tabular-nums">{kpis.ticketsVendidos}</p>
                        </div>
                    </div>

                    {/* Evento Top (Volumen) */}
                    <div className="bg-white/[0.02] border border-white/[0.06] px-4 py-4 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.07] to-transparent pointer-events-none" />
                        <div className="relative">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                <h3 className="text-xs text-gray-500 uppercase tracking-widest font-semibold">
                                    Evento Top (Volumen)
                                </h3>
                            </div>
                            <p className="text-sm font-bold text-white leading-snug truncate">
                                {kpis.eventoTopVolumen}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5 tabular-nums">
                                {kpis.maxVolumen} ticket{kpis.maxVolumen !== 1 ? 's' : ''}
                            </p>
                        </div>
                    </div>

                    {/* Evento Top (Ingresos) */}
                    <div className="bg-white/[0.02] border border-white/[0.06] px-4 py-4 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.07] to-transparent pointer-events-none" />
                        <div className="relative">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                <h3 className="text-xs text-gray-500 uppercase tracking-widest font-semibold">
                                    Evento Top (Ingresos)
                                </h3>
                            </div>
                            <p className="text-sm font-bold text-white leading-snug truncate">
                                {kpis.eventoTopIngreso}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5 tabular-nums">
                                {formatMoneda(kpis.maxIngreso)}
                            </p>
                        </div>
                    </div>
                </div>
            ) : null}

            {/* ── Tabla contenedora ──────────────────────────────── */}
            <div className="bg-white/[0.02] border border-white/[0.06] shadow-[0_2px_16px_rgba(0,0,0,0.4)]">

                {/* ── Barra de herramientas ──────────────────────── */}
                {!cargando && compras.length > 0 && (
                    <div className="px-5 py-3.5 border-b border-white/[0.05] flex flex-col sm:flex-row gap-3">
                        {/* Búsqueda */}
                        <div className="relative flex-1">
                            <svg
                                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                                fill="none" stroke="currentColor" viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                id="search-compras"
                                type="text"
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                placeholder="Buscar por ID, cliente o evento..."
                                aria-label="Buscar compras"
                                className="w-full pl-9 pr-8 py-2 bg-white/[0.04] text-sm text-white placeholder-gray-500 border border-white/[0.06] focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/25 transition-colors"
                            />
                            {busqueda && (
                                <button
                                    onClick={() => setBusqueda('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-400 transition-colors"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            )}
                        </div>

                        {/* Filtro de periodo (fecha) */}
                        <div className="relative sm:w-48">
                            <svg
                                className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
                                fill="none" stroke="currentColor" viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <select
                                id="filter-periodo"
                                value={periodoSel}
                                onChange={(e) => setPeriodoSel(e.target.value)}
                                aria-label="Filtrar por periodo"
                                className="w-full pl-8 pr-8 py-2 bg-gray-900 text-sm text-white border border-white/[0.06] focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/25 transition-colors appearance-none cursor-pointer"
                            >
                                <option value="todos" className="bg-gray-800 text-white">
                                    Histórico / Todos
                                </option>
                                {periodos.map((p) => (
                                    <option key={p.valor} value={p.valor} className="bg-gray-800 text-white">
                                        {p.label}
                                    </option>
                                ))}
                            </select>
                            <svg
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
                                fill="none" stroke="currentColor" viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>

                        {/* Botón Exportar CSV */}
                        <button
                            id="btn-exportar-csv"
                            onClick={handleExportar}
                            disabled={comprasFiltradas.length === 0}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-300 border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="hidden sm:inline">Exportar CSV</span>
                            <span className="sm:hidden">CSV</span>
                        </button>
                    </div>
                )}

                {/* ── Contenido de la tabla ───────────────────────── */}
                {mostrarSkeleton ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-white/[0.06] bg-white/[0.015]">
                                    <th className="pl-5 pr-2 py-4 text-center text-xs font-semibold text-gray-400 uppercase tracking-widest w-16">ID</th>
                                    <th className="text-left px-4 py-4 text-xs font-semibold text-gray-400 uppercase tracking-widest">Cliente</th>
                                    <th className="text-left px-4 py-4 text-xs font-semibold text-gray-400 uppercase tracking-widest hidden md:table-cell">Evento</th>
                                    <th className="text-center px-4 py-4 text-xs font-semibold text-gray-400 uppercase tracking-widest hidden lg:table-cell">Cant.</th>
                                    <th className="text-right px-4 py-4 text-xs font-semibold text-gray-400 uppercase tracking-widest">Total</th>
                                    <th className="text-right px-5 py-4 text-xs font-semibold text-gray-400 uppercase tracking-widest w-20">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
                            </tbody>
                        </table>
                    </div>
                ) : cargando ? null : compras.length === 0 ? (
                    <div className="text-center py-32">
                        <div className="w-11 h-11 rounded-full bg-white/[0.03] border border-white/[0.07] flex items-center justify-center mx-auto mb-4">
                            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                        <p className="text-gray-500 text-sm">Sin compras registradas</p>
                    </div>

                ) : comprasFiltradas.length === 0 ? (
                    <div className="text-center py-24">
                        <svg className="w-8 h-8 text-gray-700 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <p className="text-gray-500 text-sm mb-1">Sin resultados</p>
                        <p className="text-gray-700 text-xs">Prueba con otro término o cambia el periodo</p>
                        {hayFiltrosActivos && (
                            <button
                                onClick={limpiarFiltros}
                                className="mt-4 text-xs text-purple-400/70 hover:text-purple-400 transition-colors"
                            >
                                Limpiar filtros
                            </button>
                        )}
                    </div>

                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-white/[0.06] bg-white/[0.015]">
                                    <th className="pl-5 pr-2 py-4 text-center text-xs font-semibold text-gray-400 uppercase tracking-widest w-16">ID</th>
                                    <th className="text-left px-4 py-4 text-xs font-semibold text-gray-400 uppercase tracking-widest">Cliente</th>
                                    <th className="text-left px-4 py-4 text-xs font-semibold text-gray-400 uppercase tracking-widest hidden md:table-cell">Evento</th>
                                    <th className="text-center px-4 py-4 text-xs font-semibold text-gray-400 uppercase tracking-widest hidden lg:table-cell">Cant.</th>
                                    <th className="text-right px-4 py-4 text-xs font-semibold text-gray-400 uppercase tracking-widest">Total</th>
                                    <th className="text-right px-5 py-4 text-xs font-semibold text-gray-400 uppercase tracking-widest w-20">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {comprasFiltradas.map((c) => (
                                    <FilaCompra key={c.id} compra={c} onDetalle={abrirDetalle} />
                                ))}
                            </tbody>
                        </table>

                        {/* Footer: contador */}
                        <div className="px-5 py-3 border-t border-white/[0.04] flex items-center justify-between">
                            <p className="text-xs text-gray-400">
                                {hayFiltrosActivos
                                    ? `${comprasFiltradas.length} de ${compras.length} compras`
                                    : `${compras.length} ${compras.length === 1 ? 'compra' : 'compras'}`
                                }
                            </p>
                            {hayFiltrosActivos && (
                                <button
                                    onClick={limpiarFiltros}
                                    className="text-xs text-gray-400 hover:text-gray-400 transition-colors"
                                >
                                    Limpiar filtros
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ── Modal Ver Detalle ──────────────────────────────── */}
            {modalDetalle && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/75"
                        style={ANIM_OVERLAY}
                        onClick={cerrarDetalle}
                    />
                    <div
                        className="relative w-full max-w-md bg-gray-900 border border-white/[0.09]"
                        style={ANIM_SCALE}
                    >
                        {/* Cabecera del modal */}
                        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.07]">
                            <div className="flex items-center gap-3">
                                <div className="w-0.5 h-5 bg-purple-500/70 rounded-full" />
                                <h2 className="font-display text-base font-bold text-white">
                                    Detalle de compra
                                </h2>
                            </div>
                            <button
                                onClick={cerrarDetalle}
                                className="p-1.5 text-gray-400 hover:text-white transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Cuerpo */}
                        <div className="px-6 py-5">
                            {/* Encabezado con avatar + ID */}
                            <div className="flex items-center gap-4 mb-5">
                                <div className="w-12 h-12 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                                    <span className="text-lg font-bold text-purple-400">
                                        {modalDetalle.nombre?.[0]?.toUpperCase() || '?'}
                                    </span>
                                </div>
                                <div>
                                    <p className="font-semibold text-white">{modalDetalle.nombre}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">{modalDetalle.email}</p>
                                </div>
                                <span className="ml-auto text-xs text-gray-400 font-mono">#{modalDetalle.id}</span>
                            </div>

                            {/* Campos */}
                            <div className="border-t border-white/[0.06] pt-1">
                                <CampoDetalle label="Evento"   value={modalDetalle.evento} highlight />
                                <CampoDetalle label="Cantidad" value={`${modalDetalle.cantidad} ticket${modalDetalle.cantidad !== 1 ? 's' : ''}`} />
                                <CampoDetalle label="Total"    value={formatMoneda(modalDetalle.total)} highlight />
                                <CampoDetalle label="Fecha"    value={formatFechaHora(modalDetalle.fecha)} />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-white/[0.07] flex justify-end">
                            <button
                                onClick={cerrarDetalle}
                                className="px-5 py-2.5 text-sm text-gray-500 border border-white/[0.10] hover:text-white hover:border-white/25 transition-colors"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Toast ─────────────────────────────────────────── */}
            {toast && (
                <div
                    className="fixed bottom-6 right-6 z-[60] flex items-center gap-3 px-4 py-3 bg-gray-900 border border-white/[0.09] shadow-[0_8px_24px_rgba(0,0,0,0.5)] text-sm"
                    style={{ animation: 'toastIn 0.2s cubic-bezier(0.4, 0, 0.2, 1)', willChange: 'transform, opacity' }}
                >
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    <span className="text-gray-200">{toast}</span>
                </div>
            )}
        </div>
    );
};

export default AdminCompras;
