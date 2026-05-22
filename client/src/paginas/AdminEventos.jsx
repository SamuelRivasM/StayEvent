import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import api from '../servicios/api';

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
`;

const ANIM_OVERLAY = { animation: 'overlayIn 0.18s ease', willChange: 'opacity' };
const ANIM_SCALE   = { animation: 'fadeScaleIn 0.18s cubic-bezier(0.4, 0, 0.2, 1)', willChange: 'transform, opacity' };

const FILTROS_CAT = [
    { valor: 'todos',               label: 'Todas las categorías' },
    { valor: 'Conciertos',          label: 'Conciertos'           },
    { valor: 'Festivales',          label: 'Festivales'           },
    { valor: 'Fiestas / Discoteca', label: 'Fiestas / Discoteca'  },
];

const FILTROS_ESTADO = [
    { valor: 'todos',    label: 'Todos los estados' },
    { valor: 'activo',   label: 'Activos'           },
    { valor: 'inactivo', label: 'Inactivos'         },
];

const formatFecha = (fecha) => {
    if (!fecha) return '—';
    return new Date(fecha).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatHora = (hora) => {
    if (!hora) return '—';
    return String(hora).substring(0, 5);
};

// ─── Badge estado ──────────────────────────────────────────────────────────────

const BadgeEstado = ({ activo }) =>
    activo ? (
        <span className="text-xs px-2.5 py-0.5 font-medium border bg-emerald-500/[0.08] text-emerald-400 border-emerald-500/20">
            Activo
        </span>
    ) : (
        <span className="text-xs px-2.5 py-0.5 font-medium border bg-red-500/[0.08] text-red-400 border-red-500/20">
            Inactivo
        </span>
    );

// ─── Imagen con fallback ───────────────────────────────────────────────────────

const ImagenEvento = ({ src, alt }) => {
    const [err, setErr] = useState(false);
    if (!src || err) return (
        <div className="w-full h-28 bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
        </div>
    );
    return (
        <img
            src={src}
            alt={alt}
            onError={() => setErr(true)}
            className="w-full h-28 object-cover"
        />
    );
};

// ─── Campo detalle ─────────────────────────────────────────────────────────────

const CampoDetalle = ({ label, value }) => (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-white/[0.04]">
        <span className="text-xs text-gray-500 uppercase tracking-widest shrink-0">{label}</span>
        <span className="text-sm text-gray-300 text-right break-all">{value || '—'}</span>
    </div>
);

// ─── Fila evento ───────────────────────────────────────────────────────────────

const FilaEvento = React.memo(({ numero, evento, onDetalle, onCambiarEstado }) => (
    <tr className="border-b border-white/[0.04] hover:bg-white/[0.025] transition-colors">
        <td className="pl-5 pr-2 py-4 text-gray-600 text-xs tabular-nums text-center w-10">
            {numero}
        </td>
        <td className="px-4 py-4">
            <p className="font-medium text-white leading-snug max-w-[180px] truncate" title={evento.titulo}>
                {evento.titulo}
            </p>
        </td>
        <td className="px-4 py-4 text-gray-400 text-xs hidden sm:table-cell whitespace-nowrap">
            {evento.categoria || '—'}
        </td>
        <td className="px-4 py-4 text-gray-400 text-xs hidden md:table-cell whitespace-nowrap">
            {evento.org_nombre ? `${evento.org_nombre} ${evento.org_apellido}` : '—'}
        </td>
        <td className="px-4 py-4 text-gray-500 text-xs hidden lg:table-cell whitespace-nowrap">
            {formatFecha(evento.fecha)}
        </td>
        <td className="px-4 py-4 text-gray-500 text-xs hidden xl:table-cell whitespace-nowrap">
            {evento.distrito || '—'}
        </td>
        <td className="px-4 py-4">
            <BadgeEstado activo={evento.activo} />
        </td>
        <td className="px-5 py-4">
            <div className="flex items-center justify-end gap-1">
                <button
                    onClick={() => onDetalle(evento)}
                    title="Ver detalle"
                    className="p-2 text-gray-600 hover:text-white hover:bg-white/[0.06] transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                </button>
                {evento.activo ? (
                    <button
                        onClick={() => onCambiarEstado(evento)}
                        title="Desactivar evento"
                        className="p-2 text-gray-600 hover:text-red-400 hover:bg-red-500/[0.06] transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                    </button>
                ) : (
                    <button
                        onClick={() => onCambiarEstado(evento)}
                        title="Reactivar evento"
                        className="p-2 text-gray-600 hover:text-emerald-400 hover:bg-emerald-500/[0.06] transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </button>
                )}
            </div>
        </td>
    </tr>
));

// ─── Componente principal ──────────────────────────────────────────────────────

const AdminEventos = () => {
    const [eventos, setEventos]         = useState([]);
    const [cargando, setCargando]       = useState(true);
    const [errorPagina, setErrorPagina] = useState('');

    const [busqueda, setBusqueda]         = useState('');
    const [filtroCat, setFiltroCat]       = useState('todos');
    const [filtroEstado, setFiltroEstado] = useState('todos');

    const [modalDetalle, setModalDetalle] = useState(null);
    const [confirmar, setConfirmar]       = useState(null);
    const [procesando, setProcesando]     = useState(false);

    const [toast, setToast] = useState('');
    const toastTimerRef     = useRef(null);

    useEffect(() => () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); }, []);

    const mostrarToast = useCallback((msg) => {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        setToast(msg);
        toastTimerRef.current = setTimeout(() => setToast(''), 3000);
    }, []);

    const cargarEventos = useCallback(async () => {
        setCargando(true);
        setErrorPagina('');
        try {
            const { data } = await api.get('/admin/eventos');
            setEventos(data.eventos || []);
        } catch {
            setErrorPagina('No se pudieron cargar los eventos. Verifica tu conexión.');
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => { cargarEventos(); }, [cargarEventos]);

    const eventosFiltrados = useMemo(() => {
        let lista = eventos;

        if (filtroCat !== 'todos') {
            lista = lista.filter(e => e.categoria === filtroCat);
        }
        if (filtroEstado !== 'todos') {
            lista = lista.filter(e => filtroEstado === 'activo' ? e.activo : !e.activo);
        }

        const q = busqueda.trim().toLowerCase();
        if (q) {
            lista = lista.filter(e =>
                e.titulo?.toLowerCase().includes(q) ||
                e.distrito?.toLowerCase().includes(q) ||
                e.lugar?.toLowerCase().includes(q) ||
                `${e.org_nombre || ''} ${e.org_apellido || ''}`.toLowerCase().includes(q)
            );
        }

        return lista;
    }, [eventos, busqueda, filtroCat, filtroEstado]);

    const hayFiltrosActivos = busqueda !== '' || filtroCat !== 'todos' || filtroEstado !== 'todos';

    const limpiarFiltros = useCallback(() => {
        setBusqueda('');
        setFiltroCat('todos');
        setFiltroEstado('todos');
    }, []);

    const abrirDetalle  = useCallback((e) => setModalDetalle(e), []);
    const cerrarDetalle = useCallback(() => setModalDetalle(null), []);

    const iniciarCambioEstado = useCallback((e) => setConfirmar(e), []);
    const cancelarConfirmar   = useCallback(() => setConfirmar(null), []);

    const ejecutarCambioEstado = useCallback(async () => {
        if (!confirmar) return;
        setProcesando(true);
        try {
            const { data } = await api.patch(`/admin/eventos/${confirmar.id}/estado`);
            mostrarToast(data.mensaje || (confirmar.activo ? 'Evento desactivado.' : 'Evento reactivado.'));
            setConfirmar(null);
            cargarEventos();
        } catch (err) {
            mostrarToast(err.response?.data?.mensaje || 'Error al cambiar el estado.');
            setConfirmar(null);
        } finally {
            setProcesando(false);
        }
    }, [confirmar, mostrarToast, cargarEventos]);

    return (
        <div className="px-5 py-8 sm:px-8">
            <style>{KEYFRAMES}</style>

            {/* Encabezado */}
            <div className="mb-9">
                <p className="text-xs text-gray-600 uppercase tracking-[0.2em] mb-2">
                    Panel de Administrador
                </p>
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-white leading-tight">
                    Gestión de Eventos
                </h1>
                <div className="mt-3 h-px w-12 bg-gradient-to-r from-purple-500 to-transparent" />
            </div>

            {/* Banner de error */}
            {errorPagina && (
                <div className="bg-red-500/[0.08] border border-red-500/20 text-red-400 px-4 py-3 text-sm mb-6 flex items-center justify-between gap-4">
                    <span>{errorPagina}</span>
                    <button
                        onClick={() => setErrorPagina('')}
                        className="text-red-400/50 hover:text-red-400 shrink-0 transition-colors"
                    >✕</button>
                </div>
            )}

            {/* Tabla */}
            <div className="bg-white/[0.02] border border-white/[0.06] shadow-[0_2px_16px_rgba(0,0,0,0.4)]">

                {/* Barra búsqueda + filtros */}
                {!cargando && eventos.length > 0 && (
                    <div className="px-5 py-3.5 border-b border-white/[0.05] flex flex-col sm:flex-row gap-3">
                        {/* Búsqueda */}
                        <div className="relative flex-1">
                            <svg
                                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none"
                                fill="none" stroke="currentColor" viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                value={busqueda}
                                onChange={e => setBusqueda(e.target.value)}
                                placeholder="Buscar por título, distrito, lugar u organizador..."
                                className="w-full pl-9 pr-8 py-2 bg-white/[0.04] text-sm text-white placeholder-gray-600 border border-white/[0.06] focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/25 transition-colors"
                            />
                            {busqueda && (
                                <button
                                    onClick={() => setBusqueda('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            )}
                        </div>

                        {/* Filtro categoría */}
                        <div className="relative sm:w-48">
                            <select
                                value={filtroCat}
                                onChange={e => setFiltroCat(e.target.value)}
                                className="w-full pl-3 pr-8 py-2 bg-gray-900 text-sm text-white border border-white/[0.06] focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/25 transition-colors appearance-none cursor-pointer"
                            >
                                {FILTROS_CAT.map(f => (
                                    <option key={f.valor} value={f.valor} className="bg-gray-800 text-white">{f.label}</option>
                                ))}
                            </select>
                            <svg
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600 pointer-events-none"
                                fill="none" stroke="currentColor" viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>

                        {/* Filtro estado */}
                        <div className="relative sm:w-44">
                            <select
                                value={filtroEstado}
                                onChange={e => setFiltroEstado(e.target.value)}
                                className="w-full pl-3 pr-8 py-2 bg-gray-900 text-sm text-white border border-white/[0.06] focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/25 transition-colors appearance-none cursor-pointer"
                            >
                                {FILTROS_ESTADO.map(f => (
                                    <option key={f.valor} value={f.valor} className="bg-gray-800 text-white">{f.label}</option>
                                ))}
                            </select>
                            <svg
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600 pointer-events-none"
                                fill="none" stroke="currentColor" viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                )}

                {/* Contenido */}
                {cargando ? (
                    <div className="flex items-center justify-center py-32">
                        <div className="w-8 h-8 rounded-full border-4 border-purple-500/20 border-t-purple-500 animate-spin" />
                    </div>

                ) : eventos.length === 0 ? (
                    <div className="text-center py-32">
                        <div className="w-11 h-11 rounded-full bg-white/[0.03] border border-white/[0.07] flex items-center justify-center mx-auto mb-4">
                            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <p className="text-gray-500 text-sm">Sin eventos registrados</p>
                    </div>

                ) : eventosFiltrados.length === 0 ? (
                    <div className="text-center py-24">
                        <svg className="w-8 h-8 text-gray-700 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <p className="text-gray-500 text-sm mb-1">Sin resultados</p>
                        <p className="text-gray-700 text-xs">Prueba con otro término o cambia el filtro</p>
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
                                    <th className="pl-5 pr-2 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-widest w-10">N°</th>
                                    <th className="text-left px-4 py-4 text-xs font-semibold text-gray-600 uppercase tracking-widest">Evento</th>
                                    <th className="text-left px-4 py-4 text-xs font-semibold text-gray-600 uppercase tracking-widest hidden sm:table-cell">Categoría</th>
                                    <th className="text-left px-4 py-4 text-xs font-semibold text-gray-600 uppercase tracking-widest hidden md:table-cell">Organizador</th>
                                    <th className="text-left px-4 py-4 text-xs font-semibold text-gray-600 uppercase tracking-widest hidden lg:table-cell">Fecha</th>
                                    <th className="text-left px-4 py-4 text-xs font-semibold text-gray-600 uppercase tracking-widest hidden xl:table-cell">Distrito</th>
                                    <th className="text-left px-4 py-4 text-xs font-semibold text-gray-600 uppercase tracking-widest">Estado</th>
                                    <th className="text-right px-5 py-4 text-xs font-semibold text-gray-600 uppercase tracking-widest">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {eventosFiltrados.map((ev, idx) => (
                                    <FilaEvento
                                        key={ev.id}
                                        numero={idx + 1}
                                        evento={ev}
                                        onDetalle={abrirDetalle}
                                        onCambiarEstado={iniciarCambioEstado}
                                    />
                                ))}
                            </tbody>
                        </table>

                        {/* Contador de resultados */}
                        <div className="px-5 py-3 border-t border-white/[0.04] flex items-center justify-between">
                            <p className="text-xs text-gray-700">
                                {hayFiltrosActivos
                                    ? `${eventosFiltrados.length} de ${eventos.length} eventos`
                                    : `${eventos.length} ${eventos.length === 1 ? 'evento' : 'eventos'}`
                                }
                            </p>
                            {hayFiltrosActivos && (
                                <button
                                    onClick={limpiarFiltros}
                                    className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
                                >
                                    Limpiar filtros
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ── Modal Detalle ──────────────────────────────────────────── */}
            {modalDetalle && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/75"
                        style={ANIM_OVERLAY}
                        onClick={cerrarDetalle}
                    />
                    <div
                        className="relative w-full max-w-lg bg-gray-900 border border-white/[0.09] flex flex-col max-h-[90vh]"
                        style={ANIM_SCALE}
                    >
                        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.07] shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-0.5 h-5 bg-purple-500/70 rounded-full" />
                                <h2 className="font-display text-base font-bold text-white">Detalle de evento</h2>
                            </div>
                            <button
                                onClick={cerrarDetalle}
                                className="p-1.5 text-gray-600 hover:text-white transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 py-5">
                            {/* Estado — destacado */}
                            <div className="flex items-center justify-between py-2.5 border-b border-white/[0.04]">
                                <span className="text-xs text-gray-500 uppercase tracking-widest shrink-0">Estado</span>
                                <BadgeEstado activo={modalDetalle.activo} />
                            </div>

                            <CampoDetalle label="Título"      value={modalDetalle.titulo} />
                            <CampoDetalle label="Descripción" value={modalDetalle.descripcion} />
                            <CampoDetalle label="Categoría"   value={modalDetalle.categoria} />
                            <CampoDetalle label="Fecha"       value={formatFecha(modalDetalle.fecha)} />
                            <CampoDetalle label="Hora"        value={formatHora(modalDetalle.hora)} />
                            <CampoDetalle label="Distrito"    value={modalDetalle.distrito} />
                            <CampoDetalle label="Lugar"       value={modalDetalle.lugar} />
                            <CampoDetalle label="Dirección"   value={modalDetalle.direccion} />
                            <CampoDetalle label="Organizador" value={
                                modalDetalle.org_nombre
                                    ? `${modalDetalle.org_nombre} ${modalDetalle.org_apellido}`
                                    : null
                            } />

                            {Number(modalDetalle.total_compras) > 0 && (
                                <div className="flex items-center justify-between py-2.5 border-b border-white/[0.04]">
                                    <span className="text-xs text-gray-500 uppercase tracking-widest">Compras totales</span>
                                    <span className="text-sm font-semibold text-emerald-400">
                                        {Number(modalDetalle.total_compras)}
                                    </span>
                                </div>
                            )}

                            {/* Imágenes */}
                            {(modalDetalle.imagen_url || modalDetalle.imagen_mapa) && (
                                <div className="mt-4 grid grid-cols-2 gap-3">
                                    {modalDetalle.imagen_url && (
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase tracking-widest mb-1.5">Imagen evento</p>
                                            <ImagenEvento src={modalDetalle.imagen_url} alt="Imagen evento" />
                                        </div>
                                    )}
                                    {modalDetalle.imagen_mapa && (
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase tracking-widest mb-1.5">Imagen mapa</p>
                                            <ImagenEvento src={modalDetalle.imagen_mapa} alt="Imagen mapa" />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="px-6 py-4 border-t border-white/[0.07] flex justify-end shrink-0">
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

            {/* ── Modal Confirmar estado ────────────────────────────────── */}
            {confirmar && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/75"
                        style={ANIM_OVERLAY}
                        onClick={cancelarConfirmar}
                    />
                    <div
                        className="relative w-full max-w-sm bg-gray-900 border border-white/[0.09] p-6"
                        style={ANIM_SCALE}
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-0.5 h-5 bg-purple-500/70 rounded-full" />
                            <h2 className="font-display text-base font-bold text-white">
                                {confirmar.activo ? 'Desactivar evento' : 'Reactivar evento'}
                            </h2>
                        </div>

                        <p className="text-sm text-gray-400 mb-1 font-medium truncate">
                            "{confirmar.titulo}"
                        </p>
                        <p className="text-xs text-gray-600 mb-6">
                            {confirmar.activo
                                ? 'El evento dejará de ser visible en la plataforma.'
                                : 'El evento volverá a ser visible en la plataforma.'
                            }
                        </p>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={cancelarConfirmar}
                                disabled={procesando}
                                className="px-4 py-2 text-sm text-gray-500 border border-white/[0.10] hover:text-white hover:border-white/25 transition-colors disabled:opacity-40"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={ejecutarCambioEstado}
                                disabled={procesando}
                                className={`px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                                    confirmar.activo
                                        ? 'bg-red-600 hover:bg-red-500 text-white'
                                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                }`}
                            >
                                {procesando ? 'Procesando...' : confirmar.activo ? 'Desactivar' : 'Reactivar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Toast ──────────────────────────────────────────────────── */}
            {toast && (
                <div
                    className="fixed bottom-6 right-6 z-[70] flex items-center gap-3 px-4 py-3 bg-gray-900 border border-white/[0.09] shadow-[0_8px_24px_rgba(0,0,0,0.5)] text-sm"
                    style={{ animation: 'toastIn 0.2s cubic-bezier(0.4, 0, 0.2, 1)', willChange: 'transform, opacity' }}
                >
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    <span className="text-gray-200">{toast}</span>
                </div>
            )}
        </div>
    );
};

export default AdminEventos;
