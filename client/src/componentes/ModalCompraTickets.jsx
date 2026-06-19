import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../servicios/api';

const SESSION_KEY = 'stay_pending_purchase';
const DURACION_MS = 200;

const GRADIENTE_CATEGORIA = {
    'Conciertos': 'from-violet-950 via-purple-900 to-gray-900',
    'Festivales': 'from-amber-950 via-orange-900 to-gray-900',
    'Fiestas / Discoteca': 'from-rose-950 via-pink-900 to-gray-900',
};

const formatearFechaLarga = (fecha) => {
    if (!fecha) return 'Fecha por confirmar';
    const iso = typeof fecha === 'string'
        ? (fecha.includes('T') ? fecha.split('T')[0] : fecha)
        : null;
    if (!iso) return 'Fecha por confirmar';
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-PE', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
};

const formatearHora = (hora) => hora ? String(hora).substring(0, 5) : '';

const formatearPrecio = (precio) => {
    const val = Number(precio);
    if (val === 0) return 'Gratis';
    return `S/ ${val % 1 === 0 ? val : val.toFixed(2)}`;
};

const aplicarFormatoTarjeta = (valor) => {
    const digits = valor.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(.{4})(?=.)/g, '$1 ');
};

const aplicarFormatoExpiracion = (valor) => {
    const digits = valor.replace(/\D/g, '').slice(0, 4);
    if (digits.length > 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
};

const ModalCompraTickets = ({ eventoId, onCerrar, seleccionInicial }) => {
    const [datos, setDatos] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);
    const [zonaSeleccionada, setZonaSeleccionada] = useState(null);
    const [cantidad, setCantidad] = useState(1);
    const [infoExpandida, setInfoExpandida] = useState(false);
    const [errorValidacion, setErrorValidacion] = useState('');
    const [visible, setVisible] = useState(false);

    const [paso, setPaso] = useState(1);
    const [pago, setPago] = useState({ numeroTarjeta: '', titular: '', expiracion: '', cvv: '' });
    const [erroresPago, setErroresPago] = useState({});
    const [confirmado, setConfirmado] = useState(false);
    const [procesando, setProcesando] = useState(false);
    const [errorCompra, setErrorCompra] = useState('');
    const [codigoIngreso, setCodigoIngreso] = useState('');

    // ── Estado de reserva temporal (Ticket Holding) ──
    const [reservaId, setReservaId] = useState(null);
    const [tiempoRestante, setTiempoRestante] = useState(0);
    const [reservaExpirada, setReservaExpirada] = useState(false);
    const [creandoReserva, setCreandoReserva] = useState(false);

    const { usuario } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const t = setTimeout(() => setVisible(true), 16);
        return () => clearTimeout(t);
    }, []);

    // Cancelar reserva activa al cerrar el modal
    const cancelarReservaActiva = useCallback(async (idReserva) => {
        if (!idReserva) return;
        try {
            await api.delete(`/reservas/${idReserva}`);
        } catch { /* silencioso */ }
    }, []);

    const cerrar = useCallback(() => {
        if (reservaId && !confirmado) {
            cancelarReservaActiva(reservaId);
        }
        setVisible(false);
        setTimeout(onCerrar, DURACION_MS);
    }, [onCerrar, reservaId, confirmado, cancelarReservaActiva]);

    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') cerrar(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [cerrar]);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    useEffect(() => {
        const cargar = async () => {
            try {
                setCargando(true);
                const resp = await api.get(`/eventos/${eventoId}/detalle`);
                setDatos(resp.data);
            } catch {
                setError('No se pudo cargar el evento. Intenta nuevamente.');
            } finally {
                setCargando(false);
            }
        };
        cargar();
    }, [eventoId]);

    // Pre-seleccionar zona y saltar a checkout tras restaurar flujo post-login
    useEffect(() => {
        if (!seleccionInicial || !datos?.zonas) return;
        const zona = datos.zonas.find(z => z.id === seleccionInicial.zonaId);
        if (!zona || zona.stock <= 0) return;
        setZonaSeleccionada(zona);
        setCantidad(Math.min(seleccionInicial.cantidad || 1, zona.stock));
        if (seleccionInicial.irACheckout) setPaso(2);
    }, [seleccionInicial, datos]);

    // Auth Guard: si el paso 2 (checkout/pago) se muestra sin sesión activa,
    // forzar redirección a login y limpiar historial para evitar bypass
    useEffect(() => {
        if (paso === 2 && !usuario) {
            setPaso(1);
            sessionStorage.removeItem(SESSION_KEY);
            navigate('/login', { replace: true });
        }
    }, [paso, usuario, navigate]);

    const seleccionarZona = useCallback((zona) => {
        if (zona.stock <= 0) return;
        setZonaSeleccionada(zona);
        setCantidad(1);
        setErrorValidacion('');
    }, []);

    const incrementar = useCallback(() => {
        if (!zonaSeleccionada) return;
        setCantidad(p => Math.min(p + 1, zonaSeleccionada.stock));
    }, [zonaSeleccionada]);

    const decrementar = useCallback(() => {
        setCantidad(p => Math.max(p - 1, 1));
    }, []);

    const toggleInfo = useCallback(() => setInfoExpandida(p => !p), []);

    const subtotal = useMemo(
        () => zonaSeleccionada ? Number(zonaSeleccionada.precio) * cantidad : 0,
        [zonaSeleccionada, cantidad]
    );

    // ── Countdown timer de la reserva ──
    useEffect(() => {
        if (!reservaId || confirmado || reservaExpirada) return;
        if (tiempoRestante <= 0) {
            setReservaExpirada(true);
            setErrorCompra('Tu reserva ha expirado. Intenta nuevamente.');
            cancelarReservaActiva(reservaId);
            setReservaId(null);
            return;
        }
        const timer = setInterval(() => {
            setTiempoRestante(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [reservaId, tiempoRestante, confirmado, reservaExpirada, cancelarReservaActiva]);

    const formatearTiempo = (segs) => {
        const m = Math.floor(segs / 60);
        const s = segs % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleSiguiente = useCallback(async () => {
        if (!zonaSeleccionada) {
            setErrorValidacion('Selecciona una zona para continuar.');
            return;
        }
        setErrorValidacion('');

        if (!usuario) {
            sessionStorage.setItem(SESSION_KEY, JSON.stringify({
                eventoId,
                zonaId: zonaSeleccionada.id,
                cantidad,
                irACheckout: true,
            }));
            // Usar replace para evitar que el usuario retroceda al modal sin auth
            navigate('/login', { replace: true });
            return;
        }

        // Crear reserva temporal
        setCreandoReserva(true);
        setErrorCompra('');
        try {
            const resp = await api.post('/reservas', {
                evento_id: eventoId,
                zona_id: zonaSeleccionada.id,
                cantidad,
            });
            const { reserva } = resp.data;
            setReservaId(reserva.id);
            setReservaExpirada(false);

            // Calcular segundos restantes
            const expiraEn = new Date(reserva.expira_en).getTime();
            const ahora = Date.now();
            const segsRestantes = Math.max(0, Math.floor((expiraEn - ahora) / 1000));
            setTiempoRestante(segsRestantes);

            setPaso(2);
        } catch (err) {
            const msg = err.response?.data?.mensaje || 'Error al reservar. Intenta nuevamente.';
            setErrorValidacion(msg);
        } finally {
            setCreandoReserva(false);
        }
    }, [zonaSeleccionada, usuario, eventoId, cantidad, navigate]);

    const volverAPaso1 = useCallback(() => {
        // Cancelar reserva al volver
        if (reservaId) {
            cancelarReservaActiva(reservaId);
            setReservaId(null);
            setTiempoRestante(0);
        }
        setPaso(1);
        setErroresPago({});
        setErrorCompra('');
        setReservaExpirada(false);
    }, [reservaId, cancelarReservaActiva]);

    const handlePagoChange = useCallback((e) => {
        const { name, value } = e.target;
        let formatted = value;
        if (name === 'numeroTarjeta') formatted = aplicarFormatoTarjeta(value);
        if (name === 'expiracion') formatted = aplicarFormatoExpiracion(value);
        if (name === 'cvv') formatted = value.replace(/\D/g, '').slice(0, 4);
        if (name === 'titular') formatted = value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚüÜñÑ '-]/g, '').slice(0, 50);
        setPago(p => ({ ...p, [name]: formatted }));
        setErroresPago(prev => ({ ...prev, [name]: '' }));
    }, []);

    const validarFormularioPago = useCallback(() => {
        const errors = {};
        const digits = pago.numeroTarjeta.replace(/\s/g, '');
        if (digits.length < 13 || digits.length > 16) errors.numeroTarjeta = 'Número de tarjeta inválido.';
        const titularTrim = pago.titular.trim();
        if (!titularTrim) {
            errors.titular = 'El nombre del titular es obligatorio.';
        } else if (titularTrim.length < 2) {
            errors.titular = 'El nombre debe tener al menos 2 caracteres.';
        } else if (titularTrim.length > 50) {
            errors.titular = 'El nombre no puede superar los 50 caracteres.';
        } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ' -]+$/.test(titularTrim)) {
            errors.titular = 'Solo se permiten letras, espacios, apóstrofes y guiones.';
        }
        const partes = pago.expiracion.split('/');
        const mm = Number(partes[0]);
        const yy = partes[1];
        if (!yy || isNaN(mm) || mm < 1 || mm > 12 || yy.length < 2) errors.expiracion = 'Fecha inválida (MM/AA).';
        if (pago.cvv.length < 3) errors.cvv = 'CVV inválido.';
        return errors;
    }, [pago]);

    const handleConfirmar = useCallback(async (e) => {
        e.preventDefault();

        if (reservaExpirada || !reservaId) {
            setErrorCompra('Tu reserva ha expirado. Vuelve a seleccionar tus entradas.');
            return;
        }

        const errors = validarFormularioPago();
        if (Object.keys(errors).length > 0) {
            setErroresPago(errors);
            return;
        }
        setProcesando(true);
        setErrorCompra('');
        try {
            const resp = await api.post(`/reservas/${reservaId}/confirmar`);
            setCodigoIngreso(resp.data.codigo_ingreso);
            setConfirmado(true);
            sessionStorage.removeItem(SESSION_KEY);
        } catch (err) {
            const msg = err.response?.data?.mensaje || 'Error al procesar la compra. Intenta nuevamente.';
            setErrorCompra(msg);
        } finally {
            setProcesando(false);
        }
    }, [validarFormularioPago, reservaId, reservaExpirada]);

    const { evento, zonas, isSoldOut } = datos || {};

    const gradiente = useMemo(
        () => GRADIENTE_CATEGORIA[evento?.categoria] || 'from-gray-900 to-gray-950',
        [evento?.categoria]
    );

    const cardPreviewNumero = pago.numeroTarjeta || '•••• •••• •••• ••••';

    const subtotalFmt = Number(zonaSeleccionada?.precio) === 0
        ? 'Gratis'
        : `S/ ${subtotal % 1 === 0 ? subtotal : subtotal.toFixed(2)}`;

    const inputClass = (campo) =>
        `w-full px-3.5 py-2.5 bg-white/5 border text-sm text-white placeholder-gray-700 focus:outline-none focus:ring-1 transition-colors duration-100 ${erroresPago[campo]
            ? 'border-red-500/60 focus:ring-red-500/50 focus:border-red-500/60'
            : 'border-white/10 focus:border-purple-500 focus:ring-purple-500'
        }`;

    return (
        <div
            className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6"
            role="dialog"
            aria-modal="true"
            aria-label={evento?.titulo ? `Compra de entradas — ${evento.titulo}` : 'Compra de entradas'}
        >
            <div
                className={`absolute inset-0 bg-black/80 transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`}
                onClick={cerrar}
            />

            <div
                className={`
                    relative w-full bg-gray-900 flex flex-col will-change-transform
                    h-[95vh] rounded-t-2xl
                    md:max-w-4xl md:h-auto md:max-h-[90vh] md:rounded-none
                    transition-[transform,opacity] duration-200
                    ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full md:translate-y-3'}
                `}
            >
                <div className="md:hidden flex-shrink-0 flex justify-center pt-3 pb-1">
                    <div className="w-10 h-1 rounded-full bg-white/15" />
                </div>

                <button
                    onClick={cerrar}
                    aria-label="Cerrar"
                    className="absolute top-4 right-4 z-20 w-8 h-8 flex items-center justify-center text-gray-500 hover:text-white bg-gray-900/80 transition-colors duration-100"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {cargando && (
                    <div className="flex items-center justify-center flex-1">
                        <div className="w-8 h-8 rounded-full border-4 border-purple-500/20 border-t-purple-500 animate-spin" />
                    </div>
                )}

                {!cargando && error && (
                    <div className="flex flex-col items-center justify-center flex-1 gap-3">
                        <p className="text-gray-400 text-sm">{error}</p>
                        <button onClick={cerrar} className="text-sm text-purple-400 hover:text-purple-300 transition-colors duration-100">
                            Cerrar
                        </button>
                    </div>
                )}

                {!cargando && !error && evento && (
                    <>
                        {/* ── PASO 1: Selección de zona ── */}
                        {paso === 1 && (
                            <div className="flex flex-col md:flex-row flex-1 min-h-0">
                                <div className="md:w-5/12 flex-shrink-0">
                                    <div className="relative h-[260px] sm:h-72 md:h-full overflow-hidden">
                                        {evento.imagen_mapa ? (
                                            <img src={evento.imagen_mapa} alt="Mapa del evento" className="absolute inset-0 w-full h-full object-contain md:object-cover" loading="eager" decoding="async" />
                                        ) : evento.imagen_url ? (
                                            <img src={evento.imagen_url} alt={evento.titulo} className="absolute inset-0 w-full h-full object-cover" loading="eager" decoding="async" />
                                        ) : (
                                            <div className={`absolute inset-0 bg-gradient-to-br ${gradiente}`} />
                                        )}
                                        <div className="hidden md:block absolute inset-y-0 right-0 w-16 bg-gradient-to-r from-transparent to-gray-900" />
                                        <div className="md:hidden absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-gray-900 to-transparent" />
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto">
                                    <div className="p-4 sm:p-5 md:p-8 md:pl-6">
                                        <div className="mb-4 pr-8">
                                            <span className="text-xs font-medium tracking-widest uppercase text-gray-400 mb-1.5 block">{evento.categoria}</span>
                                            <h2 id="modal-titulo" className="font-display text-lg sm:text-xl md:text-2xl font-bold text-white leading-tight mb-2.5">
                                                {evento.titulo}
                                            </h2>
                                            <div className="space-y-1">
                                                <p className="text-sm text-gray-400 capitalize">
                                                    {formatearFechaLarga(evento.fecha)}
                                                    {evento.hora && <span className="text-gray-400 normal-case"> · {formatearHora(evento.hora)}</span>}
                                                </p>
                                                {evento.lugar && (
                                                    <p className="text-sm text-gray-400 flex items-start gap-1.5">
                                                        <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        </svg>
                                                        <span>{evento.lugar}{evento.distrito && <span className="text-gray-400">, {evento.distrito}</span>}</span>
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="border-t border-white/5 mb-4" />

                                        {/* ── Badge Entradas Agotadas ── */}
                                        {isSoldOut ? (
                                            <div className="mb-4">
                                                <div className="flex items-center justify-center gap-2.5 py-4 px-5 border border-red-500/20 bg-red-500/5 rounded-lg">
                                                    <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                                    </svg>
                                                    <span className="text-sm font-semibold text-red-400 uppercase tracking-wider">Entradas Agotadas</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="mb-4">
                                                    <p className="text-xs font-medium tracking-widest uppercase text-gray-400 mb-2.5">Zonas disponibles</p>
                                                    {zonas && zonas.length > 0 ? (
                                                        <div className="space-y-1.5 sm:space-y-2">
                                                            {zonas.map((zona) => (
                                                                <ZonaBtn
                                                                    key={zona.id}
                                                                    zona={zona}
                                                                    agotado={zona.stock <= 0}
                                                                    activa={zonaSeleccionada?.id === zona.id}
                                                                    onSeleccionar={seleccionarZona}
                                                                />
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="text-sm text-gray-400">No hay zonas disponibles.</p>
                                                    )}
                                                </div>

                                                {zonaSeleccionada && (
                                                    <div className="mb-4">
                                                        <p className="text-xs font-medium tracking-widest uppercase text-gray-400 mb-2.5">Cantidad</p>
                                                        <div className="flex items-center gap-4 sm:gap-5">
                                                            <div className="flex items-center border border-white/10">
                                                                <button onClick={decrementar} disabled={cantidad <= 1} aria-label="Reducir cantidad" className="w-10 h-10 flex items-center justify-center text-white hover:bg-white/5 active:bg-white/10 transition-colors duration-100 disabled:opacity-25 disabled:cursor-not-allowed">
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
                                                                </button>
                                                                <span className="w-10 text-center text-white font-semibold text-sm select-none">{cantidad}</span>
                                                                <button onClick={incrementar} disabled={cantidad >= zonaSeleccionada.stock} aria-label="Aumentar cantidad" className="w-10 h-10 flex items-center justify-center text-white hover:bg-white/5 active:bg-white/10 transition-colors duration-100 disabled:opacity-25 disabled:cursor-not-allowed">
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12M6 12h12" /></svg>
                                                                </button>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-gray-400 leading-none mb-1">{zonaSeleccionada.nombre} × {cantidad}</p>
                                                                <p className="text-xl font-bold text-white leading-none">
                                                                    {Number(zonaSeleccionada.precio) === 0 ? 'Gratis' : `S/ ${subtotal % 1 === 0 ? subtotal : subtotal.toFixed(2)}`}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {errorValidacion && <p className="text-xs text-red-400 mb-4 -mt-1">{errorValidacion}</p>}

                                                <div className="flex flex-col sm:flex-row gap-2.5 mb-4 sm:mb-5">
                                                    <button
                                                        onClick={handleSiguiente}
                                                        disabled={creandoReserva}
                                                        className="flex-1 px-6 py-3 bg-white text-gray-950 text-sm font-semibold hover:bg-gray-100 active:bg-gray-200 transition-colors duration-100 disabled:opacity-60 disabled:cursor-not-allowed"
                                                    >
                                                        {creandoReserva ? 'Reservando…' : usuario ? 'Siguiente' : 'Continuar con login'}
                                                    </button>
                                                    <button onClick={toggleInfo} className="sm:flex-none px-5 py-3 border border-white/10 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors duration-100 flex items-center justify-center gap-2">
                                                        Más información
                                                        <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${infoExpandida ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </>
                                        )}

                                        <div className={`overflow-hidden transition-[max-height,opacity] duration-200 ${infoExpandida ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                            <div className="border-t border-white/5 pt-4 space-y-3 sm:space-y-4 pb-4">
                                                {evento.descripcion && (
                                                    <div>
                                                        <p className="text-xs font-medium tracking-widest uppercase text-gray-400 mb-1.5">Descripción</p>
                                                        <p className="text-sm text-gray-400 leading-relaxed">{evento.descripcion}</p>
                                                    </div>
                                                )}
                                                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                                                    {evento.hora && <div><p className="text-xs font-medium tracking-widest uppercase text-gray-400 mb-1">Hora</p><p className="text-sm text-gray-400">{formatearHora(evento.hora)}</p></div>}
                                                    {evento.categoria && <div><p className="text-xs font-medium tracking-widest uppercase text-gray-400 mb-1">Categoría</p><p className="text-sm text-gray-400">{evento.categoria}</p></div>}
                                                    {evento.distrito && <div><p className="text-xs font-medium tracking-widest uppercase text-gray-400 mb-1">Distrito</p><p className="text-sm text-gray-400">{evento.distrito}</p></div>}
                                                    {evento.direccion && <div><p className="text-xs font-medium tracking-widest uppercase text-gray-400 mb-1">Dirección</p><p className="text-sm text-gray-400">{evento.direccion}</p></div>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── PASO 2: Checkout con Ticket Holding ── */}
                        {paso === 2 && !confirmado && (
                            <div className="flex-1 overflow-y-auto">
                                <div className="p-4 sm:p-5 md:p-8">
                                    {/* Header con timer y botón volver */}
                                    <div className="flex items-center justify-between mb-5">
                                        <button onClick={volverAPaso1} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors duration-100">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                            </svg>
                                            Volver
                                        </button>

                                        {/* Countdown Timer */}
                                        {reservaId && !reservaExpirada && (
                                            <div className={`flex items-center gap-2 px-3 py-1.5 border text-xs font-semibold tabular-nums ${
                                                tiempoRestante <= 60
                                                    ? 'border-red-500/30 bg-red-500/10 text-red-400'
                                                    : tiempoRestante <= 180
                                                        ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                                                        : 'border-purple-500/30 bg-purple-500/10 text-purple-400'
                                            }`}>
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <span>{formatearTiempo(tiempoRestante)}</span>
                                                <span className="hidden sm:inline text-[10px] opacity-70 uppercase tracking-wider">restantes</span>
                                            </div>
                                        )}

                                        {reservaExpirada && (
                                            <span className="flex items-center gap-1.5 px-3 py-1.5 border border-red-500/30 bg-red-500/10 text-red-400 text-xs font-semibold">
                                                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                                                Reserva expirada
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex flex-col md:flex-row gap-6 lg:gap-10">

                                        {/* Formulario — arriba en mobile, izquierda en desktop */}
                                        <form
                                            id="form-pago"
                                            onSubmit={handleConfirmar}
                                            noValidate
                                            className="flex-1 order-2 md:order-1 space-y-3.5"
                                        >
                                            <p className="text-xs font-medium tracking-widest uppercase text-gray-400 mb-1">Datos de pago</p>

                                            {/* Tarjeta visual */}
                                            <div aria-hidden="true" className="relative w-full max-w-[280px] aspect-[1.7/1] rounded-xl overflow-hidden bg-gradient-to-br from-purple-950 via-purple-900 to-gray-900 p-4 mb-2 select-none border border-white/10">
                                                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(168,85,247,0.15),transparent_60%)]" />
                                                <div className="relative flex flex-col h-full justify-between">
                                                    <div className="flex justify-between items-start">
                                                        <span className="text-xs font-bold tracking-[0.2em] uppercase text-white/30">Stay Event</span>
                                                        <div className="flex">
                                                            <div className="w-4 h-4 rounded-full bg-white/20" />
                                                            <div className="w-4 h-4 rounded-full bg-white/10 -ml-2" />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <p className="font-mono text-[13px] text-white/60 tracking-widest mb-2 leading-none">{cardPreviewNumero}</p>
                                                        <div className="flex justify-between items-end">
                                                            <div>
                                                                <p className="text-xs text-white/25 uppercase tracking-wider mb-0.5">Titular</p>
                                                                <p className="text-[11px] text-white/60 font-medium uppercase tracking-wide leading-none">
                                                                    {pago.titular || 'NOMBRE TITULAR'}
                                                                </p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-xs text-white/25 uppercase tracking-wider mb-0.5">Expira</p>
                                                                <p className="text-[11px] text-white/60 font-mono leading-none">{pago.expiracion || 'MM/AA'}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Número de tarjeta */}
                                            <div>
                                                <label htmlFor="pago-numero-tarjeta" className="block text-xs text-gray-400 mb-1.5">Número de tarjeta</label>
                                                <input
                                                    id="pago-numero-tarjeta"
                                                    type="text"
                                                    name="numeroTarjeta"
                                                    value={pago.numeroTarjeta}
                                                    onChange={handlePagoChange}
                                                    placeholder="0000 0000 0000 0000"
                                                    inputMode="numeric"
                                                    autoComplete="cc-number"
                                                    className={inputClass('numeroTarjeta')}
                                                />
                                                {erroresPago.numeroTarjeta && <p className="text-xs text-red-400 mt-1">{erroresPago.numeroTarjeta}</p>}
                                            </div>

                                            {/* Nombre titular */}
                                            <div>
                                                <label htmlFor="pago-titular" className="block text-xs text-gray-400 mb-1.5">Nombre del titular</label>
                                                <input
                                                    id="pago-titular"
                                                    type="text"
                                                    name="titular"
                                                    value={pago.titular}
                                                    onChange={handlePagoChange}
                                                    placeholder="Como aparece en la tarjeta"
                                                    autoComplete="cc-name"
                                                    className={inputClass('titular')}
                                                />
                                                {erroresPago.titular && <p className="text-xs text-red-400 mt-1">{erroresPago.titular}</p>}
                                            </div>

                                            {/* Expiración + CVV */}
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label htmlFor="pago-expiracion" className="block text-xs text-gray-400 mb-1.5">Fecha de expiración</label>
                                                    <input
                                                        id="pago-expiracion"
                                                        type="text"
                                                        name="expiracion"
                                                        value={pago.expiracion}
                                                        onChange={handlePagoChange}
                                                        placeholder="MM/AA"
                                                        inputMode="numeric"
                                                        autoComplete="cc-exp"
                                                        maxLength={5}
                                                        className={inputClass('expiracion')}
                                                    />
                                                    {erroresPago.expiracion && <p className="text-xs text-red-400 mt-1">{erroresPago.expiracion}</p>}
                                                </div>
                                                <div>
                                                    <label htmlFor="pago-cvv" className="block text-xs text-gray-400 mb-1.5">CVV</label>
                                                    <input
                                                        id="pago-cvv"
                                                        type="password"
                                                        name="cvv"
                                                        value={pago.cvv}
                                                        onChange={handlePagoChange}
                                                        placeholder="•••"
                                                        inputMode="numeric"
                                                        autoComplete="cc-csc"
                                                        maxLength={4}
                                                        className={inputClass('cvv')}
                                                    />
                                                    {erroresPago.cvv && <p className="text-xs text-red-400 mt-1">{erroresPago.cvv}</p>}
                                                </div>
                                            </div>

                                            {/* Botón confirmar — solo mobile */}
                                            <button
                                                type="submit"
                                                disabled={procesando || reservaExpirada}
                                                className="w-full md:hidden px-6 py-3 bg-white text-gray-950 text-sm font-semibold hover:bg-gray-100 active:bg-gray-200 transition-colors duration-100 mt-1 disabled:opacity-60 disabled:cursor-not-allowed"
                                            >
                                                {procesando ? 'Procesando…' : reservaExpirada ? 'Reserva expirada' : 'Confirmar reserva'}
                                            </button>
                                        </form>

                                        {/* Resumen del pedido — arriba mobile (order-1), derecha desktop */}
                                        <div className="md:w-64 flex-shrink-0 order-1 md:order-2">
                                            <p className="text-xs font-medium tracking-widest uppercase text-gray-400 mb-3">Resumen del pedido</p>
                                            <div className="bg-white/[0.03] border border-white/[0.08] p-4 space-y-3">
                                                <div>
                                                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Evento</p>
                                                    <p className="text-sm text-white font-medium leading-snug">{evento.titulo}</p>
                                                </div>
                                                <div className="border-t border-white/5 pt-3 space-y-2">
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-gray-400">Zona</span>
                                                        <span className="text-gray-300">{zonaSeleccionada?.nombre}</span>
                                                    </div>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-gray-400">Cantidad</span>
                                                        <span className="text-gray-300">{cantidad} entrada{cantidad !== 1 ? 's' : ''}</span>
                                                    </div>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-gray-400">P. unitario</span>
                                                        <span className="text-gray-300">{formatearPrecio(zonaSeleccionada?.precio)}</span>
                                                    </div>
                                                </div>
                                                <div className="border-t border-white/5 pt-3 flex justify-between items-center">
                                                    <span className="text-sm font-semibold text-white">Total</span>
                                                    <span className="text-lg font-bold text-white">{subtotalFmt}</span>
                                                </div>
                                            </div>

                                            {/* Botón confirmar — solo desktop */}
                                            <button
                                                type="submit"
                                                form="form-pago"
                                                disabled={procesando || reservaExpirada}
                                                className="w-full hidden md:block mt-3 px-6 py-3 bg-white text-gray-950 text-sm font-semibold hover:bg-gray-100 active:bg-gray-200 transition-colors duration-100 disabled:opacity-60 disabled:cursor-not-allowed"
                                            >
                                                {procesando ? 'Procesando…' : reservaExpirada ? 'Reserva expirada' : 'Confirmar reserva'}
                                            </button>

                                            {errorCompra && (
                                                <p className="text-xs text-red-400 mt-2 text-center">{errorCompra}</p>
                                            )}

                                            <div className="flex items-center justify-center gap-1.5 mt-3">
                                                <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                                </svg>
                                                <p className="text-xs text-gray-400">Demostración — sin cobros reales</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── CONFIRMADO ── */}
                        {confirmado && (
                            <div className="flex-1 overflow-y-auto">
                                <div className="flex flex-col items-center justify-center p-8 text-center min-h-full">
                                    <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-5">
                                        <svg className="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <h3 className="font-display text-xl font-bold text-white mb-1.5">¡Reserva confirmada!</h3>
                                    <p className="text-sm text-gray-400 mb-6 max-w-xs leading-relaxed">
                                        Presenta este QR en la entrada del evento.
                                    </p>

                                    <div className="bg-white p-3 mb-3">
                                        <img
                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${codigoIngreso}&color=000000&bgcolor=ffffff`}
                                            alt={`QR ${codigoIngreso}`}
                                            width={160}
                                            height={160}
                                        />
                                    </div>
                                    <p className="font-mono text-base font-bold text-white tracking-widest mb-6">{codigoIngreso}</p>

                                    <div className="bg-white/[0.03] border border-white/[0.08] p-4 w-full max-w-xs text-left space-y-2 mb-6">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-400">Evento</span>
                                            <span className="text-gray-300 text-right ml-4 max-w-[160px] truncate">{evento.titulo}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-400">Zona</span>
                                            <span className="text-gray-300">{zonaSeleccionada?.nombre}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-400">Entradas</span>
                                            <span className="text-gray-300">{cantidad}</span>
                                        </div>
                                        <div className="border-t border-white/5 pt-2 flex justify-between text-sm font-semibold">
                                            <span className="text-white">Total</span>
                                            <span className="text-white">{subtotalFmt}</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={cerrar}
                                        className="px-8 py-2.5 bg-white text-gray-950 text-sm font-semibold hover:bg-gray-100 transition-colors duration-100"
                                    >
                                        Volver al inicio
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

const ZonaBtn = React.memo(({ zona, agotado, activa, onSeleccionar }) => (
    <button
        onClick={() => onSeleccionar(zona)}
        disabled={agotado}
        className={`w-full flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 border text-left transition-colors duration-100
            ${agotado
                ? 'border-white/5 bg-transparent cursor-not-allowed opacity-40'
                : activa
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
            }`}
    >
        <div className="flex items-center gap-2.5 sm:gap-3">
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors duration-100 ${activa ? 'border-purple-500' : 'border-gray-600'}`}>
                {activa && <div className="w-2 h-2 rounded-full bg-purple-500" />}
            </div>
            <div>
                <p className={`text-sm font-medium leading-none mb-0.5 ${agotado ? 'text-gray-600' : 'text-white'}`}>{zona.nombre}</p>
                {!agotado && <p className="text-xs text-gray-400 leading-none">{zona.stock} disponible{zona.stock !== 1 ? 's' : ''}</p>}
            </div>
        </div>
        <div className="text-right flex-shrink-0 ml-3">
            {agotado ? (
                <span className="text-xs font-medium text-red-400/50 uppercase tracking-wider">Agotado</span>
            ) : (
                <span className={`text-sm font-bold ${activa ? 'text-purple-300' : 'text-white'}`}>{formatearPrecio(zona.precio)}</span>
            )}
        </div>
    </button>
));

ModalCompraTickets.propTypes = {
    eventoId: PropTypes.number.isRequired,
    onCerrar: PropTypes.func.isRequired,
    seleccionInicial: PropTypes.shape({
        zonaId: PropTypes.number,
        cantidad: PropTypes.number,
    }),
};

ModalCompraTickets.defaultProps = {
    seleccionInicial: null,
};

export default ModalCompraTickets;
