import React, { useState, useEffect, useCallback, useRef } from 'react';
import Navbar from '../componentes/Navbar';
import api from '../servicios/api';

const CATEGORIAS = ['Conciertos', 'Festivales', 'Fiestas / Discoteca'];

const FORM_VACIO = {
    titulo: '', descripcion: '', categoria: '', fecha: '',
    hora: '', distrito: '', lugar: '', imagen_url: '', imagen_mapa: '',
};

const ZONA_VACIA = { nombre: '', precio: '', stock: '' };

const labelCls = 'block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5';
const inputCls = 'w-full px-4 py-2.5 bg-white/[0.05] text-sm text-white placeholder-gray-600 border border-white/[0.08] focus:outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/30 transition-colors';
const selectCls = 'w-full px-4 py-2.5 bg-gray-800/90 text-sm text-white border border-white/[0.08] focus:outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/30 transition-colors appearance-none cursor-pointer';

const KEYFRAMES = `
    @keyframes slideInRight {
        from { transform: translateX(28px); opacity: 0; }
        to   { transform: translateX(0);    opacity: 1; }
    }
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
const ANIM_SCALE = { animation: 'fadeScaleIn 0.18s cubic-bezier(0.4, 0, 0.2, 1)', willChange: 'transform, opacity' };

const fechaHoy = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const Campo = React.memo(({ label, name, type = 'text', value, onChange, placeholder, ...rest }) => (
    <div>
        <label className={labelCls}>{label}</label>
        <input
            type={type}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className={inputCls}
            {...rest}
        />
    </div>
));

const GestionEventos = () => {
    const [eventos, setEventos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [errorPagina, setErrorPagina] = useState('');

    const [modalAbierto, setModalAbierto] = useState(false);
    const [eventoEditando, setEventoEditando] = useState(null);
    const [formulario, setFormulario] = useState(FORM_VACIO);
    const [zonas, setZonas] = useState([]);
    const [guardando, setGuardando] = useState(false);
    const [errorModal, setErrorModal] = useState('');

    const [confirmando, setConfirmando] = useState(null);
    const [toast, setToast] = useState('');
    const toastTimerRef = useRef(null);

    const formularioRef = useRef(formulario);
    formularioRef.current = formulario;
    const eventoEditandoRef = useRef(eventoEditando);
    eventoEditandoRef.current = eventoEditando;
    const confirmandoRef = useRef(confirmando);
    confirmandoRef.current = confirmando;
    const zonasRef = useRef(zonas);
    zonasRef.current = zonas;

    const cargarDatos = useCallback(async () => {
        setCargando(true);
        setErrorPagina('');
        try {
            const respEventos = await api.get('/eventos/mis-eventos');
            setEventos(respEventos.data.eventos || []);
        } catch {
            setErrorPagina('No se pudieron cargar los eventos. Verifica tu conexión.');
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => { cargarDatos(); }, [cargarDatos]);

    useEffect(() => () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); }, []);

    const mostrarToast = useCallback((mensaje) => {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        setToast(mensaje);
        toastTimerRef.current = setTimeout(() => setToast(''), 3000);
    }, []);

    const cerrarModal = useCallback(() => {
        setModalAbierto(false);
        setEventoEditando(null);
        setFormulario(FORM_VACIO);
        setZonas([]);
        setErrorModal('');
    }, []);

    const abrirCrear = useCallback(() => {
        setEventoEditando(null);
        setFormulario(FORM_VACIO);
        setZonas([]);
        setErrorModal('');
        setModalAbierto(true);
    }, []);

    const abrirEditar = useCallback((evento) => {
        setEventoEditando(evento);
        setFormulario({
            titulo: evento.titulo || '',
            descripcion: evento.descripcion || '',
            categoria: evento.categoria || '',
            fecha: evento.fecha ? evento.fecha.split('T')[0] : '',
            hora: evento.hora || '',
            distrito: evento.distrito || '',
            lugar: evento.lugar || '',
            imagen_url: evento.imagen_url || '',
            imagen_mapa: evento.imagen_mapa || '',
        });
        setZonas((evento.zonas || []).map(z => ({
            nombre: z.nombre || '',
            precio: z.precio?.toString() || '',
            stock: z.stock?.toString() || '',
        })));
        setErrorModal('');
        setModalAbierto(true);
    }, []);

    const manejarCambio = useCallback((e) => {
        const { name, value } = e.target;
        setFormulario(prev => ({ ...prev, [name]: value }));
    }, []);

    const agregarZona = useCallback(() => {
        setZonas(prev => prev.length < 5 ? [...prev, { ...ZONA_VACIA }] : prev);
    }, []);

    const actualizarZona = useCallback((idx, field, value) => {
        setZonas(prev => prev.map((z, i) => i === idx ? { ...z, [field]: value } : z));
    }, []);

    const eliminarZona = useCallback((idx) => {
        setZonas(prev => prev.filter((_, i) => i !== idx));
    }, []);

    const manejarGuardar = useCallback(async (e) => {
        e.preventDefault();
        setErrorModal('');

        const hoy = fechaHoy();
        if (formularioRef.current.fecha && formularioRef.current.fecha < hoy) {
            setErrorModal('La fecha del evento no puede ser anterior a hoy.');
            return;
        }

        for (const zona of zonasRef.current) {
            const precio = parseFloat(zona.precio);
            const stock = parseInt(zona.stock, 10);
            if (isNaN(precio) || precio <= 0) {
                setErrorModal('El precio de cada zona debe ser mayor a 0.');
                return;
            }
            if (isNaN(stock) || stock <= 0) {
                setErrorModal('La capacidad de cada zona debe ser mayor a 0.');
                return;
            }
        }

        setGuardando(true);
        try {
            const payload = { ...formularioRef.current, zonas: zonasRef.current };
            if (eventoEditandoRef.current) {
                await api.put(`/eventos/${eventoEditandoRef.current.id}`, payload);
                mostrarToast('Evento actualizado correctamente.');
            } else {
                await api.post('/eventos', payload);
                mostrarToast('Evento creado correctamente.');
            }
            cerrarModal();
            cargarDatos();
        } catch (err) {
            setErrorModal(err.response?.data?.mensaje || 'Error al guardar el evento.');
        } finally {
            setGuardando(false);
        }
    }, [cerrarModal, cargarDatos, mostrarToast]);

    const confirmarCambioEstado = useCallback((evento) => {
        if (!evento.activo) {
            const fechaEvento = evento.fecha ? evento.fecha.split('T')[0] : '';
            if (fechaEvento < fechaHoy()) {
                setErrorPagina('No se puede activar un evento cuya fecha ya pasó.');
                return;
            }
        }
        setConfirmando({ tipo: 'estado', evento });
    }, []);
    const confirmarEliminar = useCallback((evento) => setConfirmando({ tipo: 'eliminar', evento }), []);
    const cancelarConfirmacion = useCallback(() => setConfirmando(null), []);

    const ejecutarConfirmado = useCallback(async () => {
        const actual = confirmandoRef.current;
        if (!actual) return;
        const { tipo, evento } = actual;
        setConfirmando(null);
        try {
            if (tipo === 'estado') {
                await api.patch(`/eventos/${evento.id}/estado`);
            } else {
                await api.delete(`/eventos/${evento.id}`);
            }
            cargarDatos();
        } catch {
            setErrorPagina(`No se pudo ${tipo === 'eliminar' ? 'eliminar' : 'cambiar el estado de'} el evento.`);
        }
    }, [cargarDatos]);

    return (
        <div className="min-h-screen bg-gray-950 text-white font-sans">

            <style>{KEYFRAMES}</style>

            <div
                className="fixed inset-0 pointer-events-none"
                style={{
                    zIndex: 0,
                    background: `
                        radial-gradient(ellipse 55% 50% at 12% 38%, rgba(139,92,246,0.055) 0%, transparent 100%),
                        radial-gradient(ellipse 45% 55% at 82% 18%, rgba(99,102,241,0.04)  0%, transparent 100%),
                        radial-gradient(ellipse 38% 42% at 58% 82%, rgba(168,85,247,0.03)  0%, transparent 100%)
                    `
                }}
                aria-hidden="true"
            />

            <Navbar />

            <main className="relative pt-24 pb-16 px-4 sm:px-6 lg:px-8" style={{ zIndex: 1 }}>
                <div className="max-w-7xl mx-auto">

                    <div className="mb-10 flex items-end justify-between gap-4">
                        <div>
                            <p className="text-xs text-gray-600 uppercase tracking-[0.2em] mb-2">Panel de Organizador</p>
                            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white leading-tight">
                                Gestión de Eventos
                            </h1>
                            <div className="mt-3 h-px w-12 bg-gradient-to-r from-purple-500 to-transparent" />
                        </div>
                        <button
                            onClick={abrirCrear}
                            className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-sm font-semibold transition-colors shrink-0 shadow-[0_0_20px_rgba(139,92,246,0.2)] hover:shadow-[0_0_28px_rgba(139,92,246,0.35)]"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Nuevo evento
                        </button>
                    </div>

                    {errorPagina && (
                        <div className="bg-red-500/[0.08] border border-red-500/20 text-red-400 px-4 py-3 text-sm mb-6 flex items-center justify-between gap-4">
                            <span>{errorPagina}</span>
                            <button onClick={() => setErrorPagina('')} className="text-red-400/50 hover:text-red-400 shrink-0 transition-colors">✕</button>
                        </div>
                    )}

                    <div className="bg-white/[0.02] border border-white/[0.06] shadow-[0_2px_16px_rgba(0,0,0,0.4)]">
                        {cargando ? (
                            <div className="flex items-center justify-center py-32">
                                <div className="w-8 h-8 rounded-full border-4 border-purple-500/20 border-t-purple-500 animate-spin" />
                            </div>
                        ) : eventos.length === 0 ? (
                            <div className="text-center py-32">
                                <div className="w-11 h-11 rounded-full bg-white/[0.03] border border-white/[0.07] flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <p className="text-gray-500 text-sm mb-1">Sin eventos aún</p>
                                <p className="text-gray-700 text-xs mb-6">Crea tu primer evento para comenzar</p>
                                <button
                                    onClick={abrirCrear}
                                    className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-sm font-semibold transition-colors"
                                >
                                    Crear evento
                                </button>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-white/[0.06] bg-white/[0.015]">
                                            <th className="text-left px-5 py-4 text-xs font-semibold text-gray-600 uppercase tracking-widest">Evento</th>
                                            <th className="text-left px-4 py-4 text-xs font-semibold text-gray-600 uppercase tracking-widest hidden sm:table-cell">Fecha</th>
                                            <th className="text-left px-4 py-4 text-xs font-semibold text-gray-600 uppercase tracking-widest hidden md:table-cell">Categoría</th>
                                            <th className="text-right px-4 py-4 text-xs font-semibold text-gray-600 uppercase tracking-widest hidden md:table-cell">Zonas</th>
                                            <th className="text-center px-4 py-4 text-xs font-semibold text-gray-600 uppercase tracking-widest">Estado</th>
                                            <th className="text-right px-5 py-4 text-xs font-semibold text-gray-600 uppercase tracking-widest">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {eventos.map(evento => (
                                            <FilaEvento
                                                key={evento.id}
                                                evento={evento}
                                                onEditar={abrirEditar}
                                                onCambioEstado={confirmarCambioEstado}
                                                onEliminar={confirmarEliminar}
                                            />
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Modal crear/editar */}
            {modalAbierto && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/75"
                        style={ANIM_OVERLAY}
                        onClick={cerrarModal}
                    />
                    <div
                        className="relative w-full max-w-2xl max-h-[90vh] bg-gray-900 border border-white/[0.09] flex flex-col"
                        style={ANIM_SCALE}
                    >
                        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.07] shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-0.5 h-5 bg-purple-500/70 rounded-full" />
                                <h2 className="font-display text-base font-bold text-white">
                                    {eventoEditando ? 'Editar evento' : 'Nuevo evento'}
                                </h2>
                            </div>
                            <button
                                onClick={cerrarModal}
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

                            <Campo label="Título *" name="titulo" value={formulario.titulo} onChange={manejarCambio} placeholder="Nombre del evento" required />

                            <div>
                                <label className={labelCls}>Categoría *</label>
                                <div className="relative">
                                    <select name="categoria" value={formulario.categoria} onChange={manejarCambio} required className={selectCls}>
                                        <option value="">Seleccionar categoría</option>
                                        {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                    <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <Campo label="Fecha *" name="fecha" type="date" value={formulario.fecha} onChange={manejarCambio} required min={fechaHoy()} />
                                <Campo label="Hora *" name="hora" type="time" value={formulario.hora} onChange={manejarCambio} required />
                            </div>

                            <Campo label="Lugar *" name="lugar" value={formulario.lugar} onChange={manejarCambio} placeholder="Nombre del local o venue" required />
                            <Campo label="Distrito" name="distrito" value={formulario.distrito} onChange={manejarCambio} placeholder="Ej: Miraflores" />

                            {/* Zonas del evento */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className={labelCls} style={{ marginBottom: 0 }}>Zonas del evento</label>
                                    <button
                                        type="button"
                                        onClick={agregarZona}
                                        disabled={zonas.length >= 5}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-purple-500/30 text-purple-400 hover:bg-purple-500/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                        Agregar zona
                                    </button>
                                </div>

                                {zonas.length === 0 ? (
                                    <p className="text-xs text-gray-600 py-3 border border-dashed border-white/[0.06] text-center">
                                        Sin zonas definidas
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        <div className="grid grid-cols-[1fr_88px_72px_32px] gap-2 px-1">
                                            <span className="text-[10px] text-gray-600 uppercase tracking-widest">Nombre</span>
                                            <span className="text-[10px] text-gray-600 uppercase tracking-widest">Precio S/.</span>
                                            <span className="text-[10px] text-gray-600 uppercase tracking-widest">Cap.</span>
                                            <span />
                                        </div>
                                        {zonas.map((zona, idx) => (
                                            <div key={idx} className="grid grid-cols-[1fr_88px_72px_32px] gap-2 items-center">
                                                <input
                                                    type="text"
                                                    value={zona.nombre}
                                                    onChange={e => actualizarZona(idx, 'nombre', e.target.value)}
                                                    placeholder="Ej: VIP"
                                                    maxLength={50}
                                                    className={inputCls}
                                                />
                                                <input
                                                    type="number"
                                                    value={zona.precio}
                                                    onChange={e => actualizarZona(idx, 'precio', e.target.value)}
                                                    onKeyDown={e => e.key === '-' && e.preventDefault()}
                                                    placeholder="0.00"
                                                    min="0.01"
                                                    step="0.01"
                                                    className={inputCls}
                                                />
                                                <input
                                                    type="number"
                                                    value={zona.stock}
                                                    onChange={e => actualizarZona(idx, 'stock', e.target.value)}
                                                    onKeyDown={e => e.key === '-' && e.preventDefault()}
                                                    placeholder="1"
                                                    min="1"
                                                    className={inputCls}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => eliminarZona(idx)}
                                                    className="flex items-center justify-center w-8 h-8 text-gray-600 hover:text-red-400 hover:bg-red-500/[0.06] transition-colors"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {zonas.length >= 5 && (
                                    <p className="text-xs text-yellow-600/70 mt-1.5">Máximo 5 zonas por evento.</p>
                                )}
                            </div>

                            <Campo label="URL de imagen" name="imagen_url" value={formulario.imagen_url} onChange={manejarCambio} placeholder="https://..." />
                            <Campo label="URL de imagen del mapa" name="imagen_mapa" value={formulario.imagen_mapa} onChange={manejarCambio} placeholder="https://..." />

                            <div>
                                <label className={labelCls}>Descripción</label>
                                <textarea
                                    name="descripcion"
                                    value={formulario.descripcion}
                                    onChange={manejarCambio}
                                    rows={4}
                                    placeholder="Descripción del evento..."
                                    className={`${inputCls} resize-none`}
                                />
                            </div>
                        </form>

                        <div className="px-6 py-4 border-t border-white/[0.07] flex justify-end gap-3 shrink-0">
                            <button
                                type="button"
                                onClick={cerrarModal}
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
                                {guardando ? 'Guardando...' : eventoEditando ? 'Guardar cambios' : 'Crear evento'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Diálogo de confirmación */}
            {confirmando && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                    <div
                        className="absolute inset-0 bg-black/75"
                        style={ANIM_OVERLAY}
                        onClick={cancelarConfirmacion}
                    />
                    <div
                        className="relative bg-gray-900 border border-white/[0.09] p-6 w-full max-w-sm shadow-[0_16px_40px_rgba(0,0,0,0.7)]"
                        style={ANIM_SCALE}
                    >
                        <h3 className="font-display font-bold text-white mb-2">
                            {confirmando.tipo === 'eliminar' ? 'Eliminar evento' : 'Cambiar estado'}
                        </h3>
                        <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                            {confirmando.tipo === 'eliminar'
                                ? `¿Eliminar "${confirmando.evento.titulo}"? Esta acción no se puede deshacer.`
                                : `¿${confirmando.evento.activo ? 'Desactivar' : 'Activar'} "${confirmando.evento.titulo}"?`
                            }
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={cancelarConfirmacion}
                                className="px-4 py-2 text-sm text-gray-500 border border-white/[0.10] hover:text-white hover:border-white/25 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={ejecutarConfirmado}
                                className={`px-4 py-2 text-sm font-semibold transition-colors ${confirmando.tipo === 'eliminar'
                                    ? 'bg-red-600 hover:bg-red-500'
                                    : 'bg-purple-600 hover:bg-purple-500'
                                    }`}
                            >
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast */}
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

const FilaEvento = React.memo(({ evento, onEditar, onCambioEstado, onEliminar }) => (
    <tr className="border-b border-white/[0.04] hover:bg-white/[0.025] transition-colors">
        <td className="px-5 py-4">
            <p className="font-medium text-white leading-snug">{evento.titulo}</p>
            <p className="text-gray-600 text-xs mt-0.5">{evento.lugar}</p>
        </td>
        <td className="px-4 py-4 text-gray-500 text-xs hidden sm:table-cell whitespace-nowrap">
            {new Date(evento.fecha).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
        </td>
        <td className="px-4 py-4 hidden md:table-cell">
            <span className="text-xs text-gray-600 border border-white/[0.08] px-2 py-0.5">{evento.categoria}</span>
        </td>
        <td className="px-4 py-4 text-right text-xs hidden md:table-cell">
            {evento.zonas && evento.zonas.length > 0
                ? <span className="text-purple-400/80">{evento.zonas.length} zona{evento.zonas.length !== 1 ? 's' : ''}</span>
                : <span className="text-gray-700">—</span>
            }
        </td>
        <td className="px-4 py-4 text-center">
            <button
                onClick={() => onCambioEstado(evento)}
                className={`text-xs px-3 py-1 font-medium transition-colors border ${evento.activo
                    ? 'bg-emerald-500/[0.08] text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/15'
                    : 'bg-transparent text-gray-600 border-white/[0.08] hover:bg-white/[0.04]'
                    }`}
            >
                {evento.activo ? 'Activo' : 'Inactivo'}
            </button>
        </td>
        <td className="px-5 py-4">
            <div className="flex items-center justify-end gap-1">
                <button
                    onClick={() => onEditar(evento)}
                    title="Editar"
                    className="p-2 text-gray-600 hover:text-white hover:bg-white/[0.06] transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                </button>
                <button
                    onClick={() => onEliminar(evento)}
                    title="Eliminar"
                    className="p-2 text-gray-600 hover:text-red-400 hover:bg-red-500/[0.06] transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            </div>
        </td>
    </tr>
));

export default GestionEventos;