import React, { useState, useEffect, useMemo } from 'react';
import Navbar from '../componentes/Navbar';
import TarjetaEvento from '../componentes/TarjetaEvento';
import ModalCompraTickets from '../componentes/ModalCompraTickets';
import api from '../servicios/api';

const CATEGORIAS = ['Conciertos', 'Festivales', 'Fiestas / Discoteca'];

// Imagenes del carrusel que cambian
const SLIDES = [
    {
        titulo: 'Los mejores\nconciertos del año',
        subtitulo: 'Artistas nacionales e internacionales en vivo en Lima',
        imagen: 'https://www.grupo5.pe/assets/images/bg-1_grupo5.jpg',
        badge: 'Conciertos',
        badgeColor: 'text-white-300 border-white-400/40',
    },
    {
        titulo: 'Festivales\ninolvidables',
        subtitulo: 'Música, arte y cultura en un mismo lugar',
        imagen: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1920&q=80',
        badge: 'Festivales',
        badgeColor: 'text-white-300 border-white-400/40',
    },
    {
        titulo: 'La mejor\nvida nocturna',
        subtitulo: 'Los mejores DJ y clubes de la ciudad en una sola plataforma',
        imagen: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1920&q=80',
        badge: 'Fiestas / Discoteca',
        badgeColor: 'text-white-300 border-white-400/40',
    },
];

const ACENTO_CATEGORIA = {
    'Conciertos':        { barra: 'bg-purple-500', texto: 'text-purple-400' },
    'Festivales':        { barra: 'bg-amber-500',  texto: 'text-amber-400'  },
    'Fiestas / Discoteca': { barra: 'bg-rose-500', texto: 'text-rose-400'  },
};

const FILTRO_PRECIO = [
    { label: 'Cualquier precio', value: '' },
    { label: 'Gratis', value: '0' },
    { label: 'Hasta S/. 50', value: '50' },
    { label: 'Hasta S/. 100', value: '100' },
    { label: 'Hasta S/. 200', value: '200' },
    { label: 'Hasta S/. 500', value: '500' },
];

const FILTRO_INICIAL = { busqueda: '', categoria: '', distrito: '', precioMax: '' };

const PaginaPrincipal = () => {
    const [slideActual, setSlideActual] = useState(0);
    const [eventos, setEventos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);
    const [filtros, setFiltros] = useState(FILTRO_INICIAL);
    const [eventoSeleccionado, setEventoSeleccionado] = useState(null);
    const [seleccionPendiente, setSeleccionPendiente] = useState(null);

    // Restaurar flujo de compra tras redirect de login
    useEffect(() => {
        const pendiente = sessionStorage.getItem('stay_pending_purchase');
        if (!pendiente) return;
        try {
            const datos = JSON.parse(pendiente);
            sessionStorage.removeItem('stay_pending_purchase');
            setEventoSeleccionado(datos.eventoId);
            setSeleccionPendiente(datos);
        } catch {
            sessionStorage.removeItem('stay_pending_purchase');
        }
    }, []);

    // Carrusel automático
    useEffect(() => {
        const timer = setInterval(() => {
            setSlideActual(prev => (prev + 1) % SLIDES.length);
        }, 5500);
        return () => clearInterval(timer);
    }, []);

    // Carga de eventos
    useEffect(() => {
        const fetchEventos = async () => {
            try {
                setCargando(true);
                setError(null);
                const resp = await api.get('/eventos');
                setEventos(resp.data.eventos || []);
            } catch {
                setError('No se pudieron cargar los eventos. Verifica la conexión con el servidor.');
            } finally {
                setCargando(false);
            }
        };
        fetchEventos();
    }, []);

    const distritos = useMemo(() => {
        const set = new Set(eventos.filter(e => e.distrito).map(e => e.distrito));
        return [...set].sort();
    }, [eventos]);

    const eventosFiltrados = useMemo(() => {
        return eventos.filter(ev => {
            if (filtros.busqueda && !ev.titulo.toLowerCase().includes(filtros.busqueda.toLowerCase())) return false;
            if (filtros.categoria && ev.categoria !== filtros.categoria) return false;
            if (filtros.distrito && ev.distrito !== filtros.distrito) return false;
            if (filtros.precioMax !== '' && ev.precio_min != null && Number(ev.precio_min) > Number(filtros.precioMax)) return false;
            return true;
        });
    }, [eventos, filtros]);

    const eventosPorCategoria = useMemo(() =>
        CATEGORIAS.map(cat => ({
            categoria: cat,
            eventos: eventosFiltrados.filter(ev => ev.categoria === cat),
        })).filter(({ eventos }) => eventos.length > 0)
    , [eventosFiltrados]);

    const hayFiltros = Object.values(filtros).some(v => v !== '');
    const setFiltro = (campo, valor) => setFiltros(f => ({ ...f, [campo]: valor }));
    const limpiarFiltros = () => setFiltros(FILTRO_INICIAL);

    const irPrevSlide = () => setSlideActual(p => (p - 1 + SLIDES.length) % SLIDES.length);
    const irNextSlide = () => setSlideActual(p => (p + 1) % SLIDES.length);

    return (
        <div className="min-h-screen bg-gray-950 text-white font-sans">
            <Navbar />

            {/* CARRUSEL */}
            <section className="relative h-screen overflow-hidden">

                {/* Slides */}
                {SLIDES.map((slide, idx) => (
                    <div
                        key={idx}
                        className={`absolute inset-0 transition-opacity duration-1000 ${idx === slideActual ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                    >
                        <img
                            src={slide.imagen}
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover"
                            loading={idx === 0 ? 'eager' : 'lazy'}
                        />
                        {/* Overlay cinematográfico */}
                        <div className="absolute inset-0 bg-black/50" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/40" />
                    </div>
                ))}

                {/* Contenido central */}
                <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6 pt-16">
                    <span className={`inline-block px-3 py-1 border text-xs font-medium tracking-[0.2em] uppercase mb-7 transition-all duration-700 ${SLIDES[slideActual].badgeColor}`}>
                        {SLIDES[slideActual].badge}
                    </span>

                    <h1 className="font-display text-[clamp(2.8rem,8vw,6.5rem)] font-black leading-[1.05] mb-6 whitespace-pre-line tracking-tight">
                        {SLIDES[slideActual].titulo}
                    </h1>

                    <p className="text-base sm:text-lg text-gray-400 mb-10 max-w-lg leading-relaxed">
                        {SLIDES[slideActual].subtitulo}
                    </p>

                    <a
                        href="#eventos"
                        className="inline-flex items-center gap-2.5 px-8 py-3.5 bg-white text-gray-950 text-sm font-semibold tracking-wide hover:bg-gray-100 active:bg-gray-200 transition-colors"
                    >
                        Ver eventos
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </a>
                </div>

                {/* Flechas */}
                <button
                    onClick={irPrevSlide}
                    aria-label="Slide anterior"
                    className="absolute left-5 sm:left-8 top-1/2 -translate-y-1/2 z-20 w-11 h-11 flex items-center justify-center border border-white/20 text-white hover:bg-white/10 active:bg-white/20 transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <button
                    onClick={irNextSlide}
                    aria-label="Slide siguiente"
                    className="absolute right-5 sm:right-8 top-1/2 -translate-y-1/2 z-20 w-11 h-11 flex items-center justify-center border border-white/20 text-white hover:bg-white/10 active:bg-white/20 transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                    </svg>
                </button>

                {/* Dots */}
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
                    {SLIDES.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => setSlideActual(idx)}
                            aria-label={`Ir al slide ${idx + 1}`}
                            className={`transition-all duration-400 rounded-full ${idx === slideActual ? 'w-7 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/30 hover:bg-white/60'}`}
                        />
                    ))}
                </div>

                {/* Barra de progreso del slide */}
                <div className="absolute bottom-0 left-0 right-0 h-px bg-white/10 z-20">
                    <div
                        key={slideActual}
                        className="h-full bg-white/50"
                        style={{ animation: 'slideProgress 5.5s linear forwards' }}
                    />
                </div>
            </section>

            {/* SECCIÓN EVENTOS */}
            <section id="eventos" className="py-16 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">

                    {/* Encabezado */}
                    <div className="mb-8 flex items-end justify-between">
                        <div>
                            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mb-1">
                                Eventos
                            </h2>
                            <p className="text-sm text-gray-400">
                                {cargando
                                    ? 'Cargando...'
                                    : `${eventosFiltrados.length} evento${eventosFiltrados.length !== 1 ? 's' : ''} disponible${eventosFiltrados.length !== 1 ? 's' : ''}`
                                }
                            </p>
                        </div>
                    </div>

                    {/* Filtros */}
                    <div className="bg-gray-900/50 p-4 sm:p-5 mb-10">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">

                            {/* Búsqueda */}
                            <div className="relative">
                                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <input
                                    type="text"
                                    aria-label="Buscar eventos por nombre"
                                    placeholder="Buscar por nombre..."
                                    value={filtros.busqueda}
                                    onChange={e => setFiltro('busqueda', e.target.value)}
                                    className="w-full pl-9 pr-4 py-2.5 bg-gray-800/80 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                                />
                            </div>

                            {/* Categoría */}
                            <div className="relative">
                                <select
                                    aria-label="Filtrar por categoría"
                                    value={filtros.categoria}
                                    onChange={e => setFiltro('categoria', e.target.value)}
                                    className="w-full px-4 py-2.5 bg-gray-800/80 text-sm text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors appearance-none cursor-pointer"
                                >
                                    <option value="">Todas las categorías</option>
                                    {CATEGORIAS.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>

                            {/* Distrito */}
                            <div className="relative">
                                <select
                                    aria-label="Filtrar por distrito"
                                    value={filtros.distrito}
                                    onChange={e => setFiltro('distrito', e.target.value)}
                                    className="w-full px-4 py-2.5 bg-gray-800/80 text-sm text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors appearance-none cursor-pointer"
                                >
                                    <option value="">Todos los distritos</option>
                                    {distritos.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>

                            {/* Precio */}
                            <div className="relative">
                                <select
                                    aria-label="Filtrar por precio máximo"
                                    value={filtros.precioMax}
                                    onChange={e => setFiltro('precioMax', e.target.value)}
                                    className="w-full px-4 py-2.5 bg-gray-800/80 text-sm text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors appearance-none cursor-pointer"
                                >
                                    {FILTRO_PRECIO.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
                                </select>
                                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>

                        {hayFiltros && (
                            <div className="mt-4 pt-3 flex justify-end">
                                <button
                                    onClick={limpiarFiltros}
                                    className="text-sm text-purple-400 hover:text-purple-300 font-medium transition-colors"
                                >
                                    Limpiar todo
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Estado: cargando */}
                    {cargando && (
                        <div className="flex flex-col items-center justify-center py-40 gap-5">
                            <div className="w-10 h-10 rounded-full border-4 border-purple-500/20 border-t-purple-500 animate-spin" />
                            <p className="text-gray-400 text-xs tracking-widest uppercase">Cargando eventos</p>
                        </div>
                    )}

                    {/* Estado: error */}
                    {!cargando && error && (
                        <div className="text-center py-40">
                            <p className="text-gray-400 text-sm max-w-sm mx-auto">{error}</p>
                        </div>
                    )}

                    {/* Estado: sin resultados */}
                    {!cargando && !error && eventosFiltrados.length === 0 && (
                        <div className="text-center py-40">
                            <h3 className="font-display text-xl font-bold text-white mb-3">
                                {hayFiltros ? 'Sin resultados' : 'No hay eventos disponibles'}
                            </h3>
                            <p className="text-gray-400 text-sm mb-8 max-w-xs mx-auto">
                                {hayFiltros
                                    ? 'Ningún evento coincide con los criterios aplicados.'
                                    : 'Aún no hay eventos registrados. Vuelve pronto para ver las novedades.'}
                            </p>
                            {hayFiltros && (
                                <button
                                    onClick={limpiarFiltros}
                                    className="px-6 py-2.5 bg-purple-600 text-sm font-semibold hover:bg-purple-500 transition-colors"
                                >
                                    Limpiar filtros
                                </button>
                            )}
                        </div>
                    )}

                    {/* Galería de eventos por categoría */}
                    {!cargando && !error && eventosFiltrados.length > 0 && (
                        <div className="space-y-16">
                            {eventosPorCategoria.map(({ categoria, eventos: evsCat }) => {
                                const acento = ACENTO_CATEGORIA[categoria] || { barra: 'bg-gray-500', texto: 'text-gray-400' };
                                return (
                                    <div key={categoria}>
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className={`w-1 h-8 shrink-0 ${acento.barra}`} />
                                            <div>
                                                <h3 className="font-display text-xl sm:text-2xl font-bold text-white leading-none">
                                                    {categoria}
                                                </h3>
                                                <p className={`text-xs mt-1 ${acento.texto}`}>
                                                    {evsCat.length} evento{evsCat.length !== 1 ? 's' : ''}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                                            {evsCat.map(evento => (
                                                <TarjetaEvento
                                                    key={evento.id}
                                                    evento={evento}
                                                    onClick={() => setEventoSeleccionado(evento.id)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </section>

            {/* FOOTER */}
            <footer className="border-t border-white/5 py-12 px-4 text-center mt-8">
                <p className="font-display text-xs font-bold tracking-[0.3em] uppercase text-gray-400 mb-2">
                    Stay Event
                </p>
                <p className="text-gray-400 text-xs">
                    &copy; {new Date().getFullYear()} Stay Event. Todos los derechos reservados.
                </p>
            </footer>

            {/* Animación de la barra de progreso del carrusel */}
            <style>{`
                @keyframes slideProgress {
                    from { width: 0%; }
                    to   { width: 100%; }
                }
            `}</style>

            {/* Modal compra de tickets */}
            {eventoSeleccionado && (
                <ModalCompraTickets
                    eventoId={eventoSeleccionado}
                    seleccionInicial={seleccionPendiente}
                    onCerrar={() => {
                        setEventoSeleccionado(null);
                        setSeleccionPendiente(null);
                    }}
                />
            )}
        </div>
    );
};

export default PaginaPrincipal;
