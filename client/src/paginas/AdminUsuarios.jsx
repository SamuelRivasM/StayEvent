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

const labelCls  = 'block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5';
const inputCls  = 'w-full px-4 py-2.5 bg-white/[0.05] text-sm text-white placeholder-gray-600 border border-white/[0.08] focus:outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/30 transition-colors';
const selectCls = 'w-full px-4 py-2.5 bg-gray-800/90 text-sm text-white border border-white/[0.08] focus:outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/30 transition-colors appearance-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';

const FORM_VACIO = { nombre: '', apellido: '', telefono: '', rol: 'usuario', password: '' };

const FILTROS_ROL = [
    { valor: 'todos',       label: 'Todos'         },
    { valor: 'usuario',     label: 'Usuario'       },
    { valor: 'organizador', label: 'Organizador'   },
    { valor: 'admin',       label: 'Administrador' },
];

const formatFecha = (fecha) => {
    if (!fecha) return '—';
    return new Date(fecha).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
};

// ─── Badge de rol ─────────────────────────────────────────────────────────────

const BadgeRol = ({ rol }) => {
    if (rol === 'organizador') return (
        <span className="text-xs px-2.5 py-0.5 font-medium border bg-purple-500/[0.08] text-purple-400 border-purple-500/20">
            Organizador
        </span>
    );
    if (rol === 'admin') return (
        <span className="text-xs px-2.5 py-0.5 font-medium border bg-white/[0.04] text-gray-400 border-white/[0.12]">
            Administrador
        </span>
    );
    return (
        <span className="text-xs px-2.5 py-0.5 font-medium border bg-blue-500/[0.08] text-blue-400 border-blue-500/20">
            Usuario
        </span>
    );
};

// ─── Campo lectura en modal detalle ──────────────────────────────────────────

const CampoDetalle = ({ label, value }) => (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-white/[0.04]">
        <span className="text-xs text-gray-500 uppercase tracking-widest shrink-0">{label}</span>
        <span className="text-sm text-gray-300 text-right break-all">{value || '—'}</span>
    </div>
);

// ─── Fila de tabla ────────────────────────────────────────────────────────────

const FilaUsuario = React.memo(({ numero, usuario, onDetalle, onEditar }) => (
    <tr className="border-b border-white/[0.04] hover:bg-white/[0.025] transition-colors">
        <td className="pl-5 pr-2 py-4 text-gray-600 text-xs tabular-nums text-center w-10">
            {numero}
        </td>
        <td className="px-4 py-4">
            <p className="font-medium text-white leading-snug">
                {usuario.nombre} {usuario.apellido}
            </p>
        </td>
        <td className="px-4 py-4 text-gray-500 text-xs hidden sm:table-cell max-w-[200px] truncate">
            {usuario.email}
        </td>
        <td className="px-4 py-4 text-gray-500 text-xs hidden md:table-cell whitespace-nowrap">
            {usuario.telefono || '—'}
        </td>
        <td className="px-4 py-4">
            <BadgeRol rol={usuario.rol} />
        </td>
        <td className="px-4 py-4 text-gray-500 text-xs hidden lg:table-cell whitespace-nowrap">
            {formatFecha(usuario.created_at)}
        </td>
        <td className="px-5 py-4">
            <div className="flex items-center justify-end gap-1">
                <button
                    onClick={() => onDetalle(usuario)}
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
                {usuario.rol !== 'admin' && (
                    <button
                        onClick={() => onEditar(usuario)}
                        title="Editar usuario"
                        className="p-2 text-gray-600 hover:text-white hover:bg-white/[0.06] transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                    </button>
                )}
            </div>
        </td>
    </tr>
));

// ─── Componente principal ─────────────────────────────────────────────────────

const AdminUsuarios = () => {
    const [usuarios, setUsuarios]       = useState([]);
    const [cargando, setCargando]       = useState(true);
    const [errorPagina, setErrorPagina] = useState('');

    const [busqueda, setBusqueda]   = useState('');
    const [filtroRol, setFiltroRol] = useState('todos');

    const [modalDetalle, setModalDetalle] = useState(null);

    const [modalEditar, setModalEditar] = useState(null);
    const [formulario, setFormulario]   = useState(FORM_VACIO);
    const [guardando, setGuardando]     = useState(false);
    const [errorModal, setErrorModal]   = useState('');

    const [toast, setToast] = useState('');
    const toastTimerRef      = useRef(null);
    const formularioRef      = useRef(formulario);
    formularioRef.current    = formulario;
    const modalEditarRef     = useRef(modalEditar);
    modalEditarRef.current   = modalEditar;

    useEffect(() => () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); }, []);

    const mostrarToast = useCallback((msg) => {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        setToast(msg);
        toastTimerRef.current = setTimeout(() => setToast(''), 3000);
    }, []);

    const cargarUsuarios = useCallback(async () => {
        setCargando(true);
        setErrorPagina('');
        try {
            const { data } = await api.get('/admin/usuarios');
            setUsuarios(data.usuarios || []);
        } catch {
            setErrorPagina('No se pudieron cargar los usuarios. Verifica tu conexión.');
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => { cargarUsuarios(); }, [cargarUsuarios]);

    // Filtrado en tiempo real — combina búsqueda y filtro de rol
    const usuariosFiltrados = useMemo(() => {
        let lista = usuarios;

        if (filtroRol !== 'todos') {
            lista = lista.filter(u => u.rol === filtroRol);
        }

        const q = busqueda.trim().toLowerCase();
        if (q) {
            lista = lista.filter(u =>
                u.nombre?.toLowerCase().includes(q) ||
                u.apellido?.toLowerCase().includes(q) ||
                u.email?.toLowerCase().includes(q) ||
                (u.telefono || '').toLowerCase().includes(q)
            );
        }

        return lista;
    }, [usuarios, busqueda, filtroRol]);

    const hayFiltrosActivos = busqueda !== '' || filtroRol !== 'todos';

    const limpiarFiltros = useCallback(() => {
        setBusqueda('');
        setFiltroRol('todos');
    }, []);

    // ── Detalle ──────────────────────────────────────────────
    const abrirDetalle  = useCallback((u) => setModalDetalle(u), []);
    const cerrarDetalle = useCallback(() => setModalDetalle(null), []);

    // ── Editar ───────────────────────────────────────────────
    const abrirEditar = useCallback((u) => {
        setFormulario({
            nombre:   u.nombre   || '',
            apellido: u.apellido || '',
            telefono: u.telefono || '',
            rol:      u.rol      || 'usuario',
            password: '',
        });
        setErrorModal('');
        setModalEditar(u);
    }, []);

    const cerrarEditar = useCallback(() => {
        setModalEditar(null);
        setFormulario(FORM_VACIO);
        setErrorModal('');
    }, []);

    const manejarCambio = useCallback((e) => {
        const { name, value } = e.target;
        setFormulario(prev => ({ ...prev, [name]: value }));
    }, []);

    const manejarGuardar = useCallback(async (e) => {
        e.preventDefault();
        setErrorModal('');
        const f  = formularioRef.current;
        const id = modalEditarRef.current?.id;
        if (!id) return;

        if (!f.nombre.trim() || !f.apellido.trim() || !f.telefono.trim()) {
            setErrorModal('Nombre, apellido y teléfono son obligatorios.');
            return;
        }

        setGuardando(true);
        try {
            const payload = {
                nombre:   f.nombre.trim(),
                apellido: f.apellido.trim(),
                telefono: f.telefono.trim(),
                rol:      f.rol,
            };
            if (f.password) payload.password = f.password;

            await api.put(`/admin/usuarios/${id}`, payload);
            mostrarToast('Usuario actualizado correctamente.');
            cerrarEditar();
            cargarUsuarios();
        } catch (err) {
            setErrorModal(err.response?.data?.mensaje || 'Error al guardar cambios.');
        } finally {
            setGuardando(false);
        }
    }, [cerrarEditar, cargarUsuarios, mostrarToast]);

    // ─────────────────────────────────────────────────────────

    return (
        <div className="px-5 py-8 sm:px-8">
            <style>{KEYFRAMES}</style>

            {/* Encabezado */}
            <div className="mb-9">
                <p className="text-xs text-gray-600 uppercase tracking-[0.2em] mb-2">
                    Panel de Administrador
                </p>
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-white leading-tight">
                    Gestión de Usuarios
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

                {/* Barra de búsqueda + filtro de rol */}
                {!cargando && usuarios.length > 0 && (
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
                                placeholder="Buscar por nombre, apellido, email o teléfono..."
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

                        {/* Filtro de rol */}
                        <div className="relative sm:w-40">
                            <select
                                value={filtroRol}
                                onChange={e => setFiltroRol(e.target.value)}
                                className="w-full pl-3 pr-8 py-2 bg-gray-900 text-sm text-white border border-white/[0.06] focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/25 transition-colors appearance-none cursor-pointer"
                            >
                                {FILTROS_ROL.map(f => (
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

                ) : usuarios.length === 0 ? (
                    <div className="text-center py-32">
                        <div className="w-11 h-11 rounded-full bg-white/[0.03] border border-white/[0.07] flex items-center justify-center mx-auto mb-4">
                            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <p className="text-gray-500 text-sm">Sin usuarios registrados</p>
                    </div>

                ) : usuariosFiltrados.length === 0 ? (
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
                                    <th className="text-left px-4 py-4 text-xs font-semibold text-gray-600 uppercase tracking-widest">Nombre</th>
                                    <th className="text-left px-4 py-4 text-xs font-semibold text-gray-600 uppercase tracking-widest hidden sm:table-cell">Email</th>
                                    <th className="text-left px-4 py-4 text-xs font-semibold text-gray-600 uppercase tracking-widest hidden md:table-cell">Teléfono</th>
                                    <th className="text-left px-4 py-4 text-xs font-semibold text-gray-600 uppercase tracking-widest">Rol</th>
                                    <th className="text-left px-4 py-4 text-xs font-semibold text-gray-600 uppercase tracking-widest hidden lg:table-cell">Registro</th>
                                    <th className="text-right px-5 py-4 text-xs font-semibold text-gray-600 uppercase tracking-widest">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {usuariosFiltrados.map((u, idx) => (
                                    <FilaUsuario
                                        key={u.id}
                                        numero={idx + 1}
                                        usuario={u}
                                        onDetalle={abrirDetalle}
                                        onEditar={abrirEditar}
                                    />
                                ))}
                            </tbody>
                        </table>

                        {/* Contador de resultados */}
                        <div className="px-5 py-3 border-t border-white/[0.04] flex items-center justify-between">
                            <p className="text-xs text-gray-700">
                                {hayFiltrosActivos
                                    ? `${usuariosFiltrados.length} de ${usuarios.length} usuarios`
                                    : `${usuarios.length} ${usuarios.length === 1 ? 'usuario' : 'usuarios'}`
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

            {/* ── Modal Ver ─────────────────────────────────────────── */}
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
                        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.07]">
                            <div className="flex items-center gap-3">
                                <div className="w-0.5 h-5 bg-purple-500/70 rounded-full" />
                                <h2 className="font-display text-base font-bold text-white">Detalle de usuario</h2>
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

                        <div className="px-6 py-5">
                            {/* Avatar + nombre */}
                            <div className="flex items-center gap-4 mb-5">
                                <div className="w-12 h-12 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                                    <span className="text-lg font-bold text-purple-400">
                                        {modalDetalle.nombre?.[0]?.toUpperCase() || '?'}
                                    </span>
                                </div>
                                <div>
                                    <p className="font-semibold text-white">
                                        {modalDetalle.nombre} {modalDetalle.apellido}
                                    </p>
                                    <p className="text-xs text-gray-600 mt-0.5">{modalDetalle.email}</p>
                                </div>
                            </div>

                            {/* Campos */}
                            <div className="border-t border-white/[0.06] pt-1">
                                {/* Rol — destacado */}
                                <div className="flex items-center justify-between py-2.5 border-b border-white/[0.04]">
                                    <span className="text-xs text-gray-500 uppercase tracking-widest shrink-0">Rol</span>
                                    <BadgeRol rol={modalDetalle.rol} />
                                </div>

                                <CampoDetalle label="Nombre"    value={modalDetalle.nombre} />
                                <CampoDetalle label="Apellido"  value={modalDetalle.apellido} />
                                <CampoDetalle label="Email"     value={modalDetalle.email} />
                                <CampoDetalle label="Teléfono"  value={modalDetalle.telefono} />
                                <CampoDetalle label="Registro"  value={formatFecha(modalDetalle.created_at)} />

                                {Number(modalDetalle.total_compras) > 0 && (
                                    <div className="flex items-center justify-between py-2.5">
                                        <span className="text-xs text-gray-500 uppercase tracking-widest">
                                            Compras confirmadas
                                        </span>
                                        <span className="text-sm font-semibold text-emerald-400">
                                            {Number(modalDetalle.total_compras)}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

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

            {/* ── Modal Editar ──────────────────────────────────────── */}
            {modalEditar && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/75"
                        style={ANIM_OVERLAY}
                        onClick={cerrarEditar}
                    />
                    <div
                        className="relative w-full max-w-lg bg-gray-900 border border-white/[0.09] flex flex-col max-h-[90vh]"
                        style={ANIM_SCALE}
                    >
                        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.07] shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-0.5 h-5 bg-purple-500/70 rounded-full" />
                                <h2 className="font-display text-base font-bold text-white">Editar usuario</h2>
                            </div>
                            <button
                                onClick={cerrarEditar}
                                className="p-1.5 text-gray-600 hover:text-white transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={manejarGuardar} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                            {errorModal && (
                                <div className="bg-red-500/[0.08] border border-red-500/20 text-red-400 px-4 py-3 text-sm">
                                    {errorModal}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelCls}>Nombre *</label>
                                    <input
                                        type="text"
                                        name="nombre"
                                        value={formulario.nombre}
                                        onChange={manejarCambio}
                                        placeholder="Nombre"
                                        maxLength={50}
                                        required
                                        className={inputCls}
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>Apellido *</label>
                                    <input
                                        type="text"
                                        name="apellido"
                                        value={formulario.apellido}
                                        onChange={manejarCambio}
                                        placeholder="Apellido"
                                        maxLength={50}
                                        required
                                        className={inputCls}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className={labelCls}>Teléfono *</label>
                                <input
                                    type="text"
                                    name="telefono"
                                    value={formulario.telefono}
                                    onChange={manejarCambio}
                                    placeholder="+51987654321"
                                    maxLength={20}
                                    required
                                    className={inputCls}
                                />
                            </div>

                            {/* Rol */}
                            <div>
                                <label className={labelCls}>Rol</label>
                                <div className="relative">
                                    <select
                                        name="rol"
                                        value={formulario.rol}
                                        onChange={manejarCambio}
                                        disabled={modalEditar.rol === 'admin'}
                                        className={selectCls}
                                    >
                                        <option value="usuario">Usuario</option>
                                        <option value="organizador">Organizador</option>
                                    </select>
                                    <svg
                                        className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none"
                                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                                {modalEditar.rol === 'admin' && (
                                    <p className="text-xs text-gray-600 mt-1.5">
                                        El rol de administrador no puede modificarse.
                                    </p>
                                )}
                            </div>

                            {/* Contraseña */}
                            <div>
                                <label className={labelCls}>
                                    Nueva contraseña{' '}
                                    <span className="text-gray-700 normal-case font-normal tracking-normal">
                                        (dejar vacío para no cambiar)
                                    </span>
                                </label>
                                <input
                                    type="password"
                                    name="password"
                                    value={formulario.password}
                                    onChange={manejarCambio}
                                    placeholder="Mín. 8 caracteres, incluye $, % o #"
                                    className={inputCls}
                                />
                            </div>
                        </form>

                        <div className="px-6 py-4 border-t border-white/[0.07] flex justify-end gap-3 shrink-0">
                            <button
                                type="button"
                                onClick={cerrarEditar}
                                className="px-5 py-2.5 text-sm text-gray-500 border border-white/[0.10] hover:text-white hover:border-white/25 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                onClick={manejarGuardar}
                                disabled={guardando}
                                className="px-5 py-2.5 text-sm font-semibold bg-purple-600 hover:bg-purple-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {guardando ? 'Guardando...' : 'Guardar cambios'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Toast ─────────────────────────────────────────────── */}
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

export default AdminUsuarios;
