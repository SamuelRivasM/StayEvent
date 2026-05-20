import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
    const { usuario, cerrarSesion } = useAuth();
    const navigate = useNavigate();
    const [menuAbierto, setMenuAbierto] = useState(false);
    const [navVisible, setNavVisible] = useState(true);
    const [scrolled, setScrolled] = useState(false);
    const prevScrollRef = useRef(0);

    useEffect(() => {
        const onScroll = () => {
            const y = window.scrollY;
            setNavVisible(y < prevScrollRef.current || y < 80);
            setScrolled(y > 20);
            prevScrollRef.current = y;
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const handleCerrarSesion = () => {
        cerrarSesion();
        navigate('/');
        setMenuAbierto(false);
    };

    return (
        <nav
            className={`
                fixed top-0 left-0 right-0 z-50
                transition-all duration-300 ease-in-out
                ${navVisible ? 'translate-y-0' : '-translate-y-full'}
                ${scrolled
                    ? 'bg-gray-950/98 backdrop-blur-md border-b border-white/8 shadow-xl shadow-black/40'
                    : 'bg-transparent border-b border-transparent'
                }
            `}
        >
            <div className="max-w-7xl mx-auto px-5 sm:px-8">
                <div className="flex items-center justify-between h-16">

                    {/* Logo */}
                    <Link
                        to="/"
                        className="font-display text-lg font-black tracking-tight text-white hover:text-purple-300 transition-colors duration-200"
                    >
                        Stay Event
                    </Link>

                    {/* Desktop: acciones */}
                    <div className="hidden sm:flex items-center gap-3">
                        {usuario ? (
                            <>
                                {usuario.rol === 'organizador' && (
                                    <Link
                                        to="/organizador/eventos"
                                        className="px-4 py-1.5 text-sm font-medium text-purple-400 hover:text-purple-300 border border-purple-500/30 hover:border-purple-400/50 transition-all duration-200"
                                    >
                                        Gestión Eventos
                                    </Link>
                                )}
                                {usuario.rol === 'usuario' && (
                                    <Link
                                        to="/mis-tickets"
                                        className="px-4 py-1.5 text-sm font-medium text-purple-400 hover:text-purple-300 border border-purple-500/30 hover:border-purple-400/50 transition-all duration-200"
                                    >
                                        Mis Tickets
                                    </Link>
                                )}
                                <div className="flex items-center gap-2.5 px-3 py-1.5 bg-white/5 border border-white/10 text-sm">
                                    <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">
                                        {usuario.nombre?.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="text-gray-300 font-medium">
                                        {usuario.nombre} {usuario.apellido}
                                    </span>
                                </div>
                                <button
                                    onClick={handleCerrarSesion}
                                    className="px-4 py-1.5 text-sm font-medium text-gray-400 border border-white/15 hover:border-white/35 hover:text-white transition-all duration-200"
                                >
                                    Cerrar sesión
                                </button>
                            </>
                        ) : (
                            <>
                                <Link
                                    to="/registro"
                                    className="px-4 py-1.5 text-sm font-medium text-gray-400 hover:text-white transition-colors duration-200"
                                >
                                    Registrarse
                                </Link>
                                <Link
                                    to="/login"
                                    className="px-5 py-1.5 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-500 transition-colors duration-200"
                                >
                                    Iniciar sesión
                                </Link>
                            </>
                        )}
                    </div>

                    {/* Mobile: hamburger */}
                    <button
                        onClick={() => setMenuAbierto(!menuAbierto)}
                        className="sm:hidden p-2 text-gray-400 hover:text-white transition-colors duration-200"
                        aria-label="Abrir menú"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {menuAbierto
                                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            }
                        </svg>
                    </button>
                </div>

                {/* Mobile menu */}
                {menuAbierto && (
                    <div className="sm:hidden border-t border-white/10 py-3 space-y-1 bg-gray-950/98">
                        {usuario ? (
                            <>
                                <div className="px-3 py-2 flex items-center gap-2.5 text-sm">
                                    <div className="w-7 h-7 bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                                        {usuario.nombre?.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="text-gray-300 font-medium">
                                        {usuario.nombre} {usuario.apellido}
                                    </span>
                                </div>
                                {usuario.rol === 'organizador' && (
                                    <Link
                                        to="/organizador/eventos"
                                        onClick={() => setMenuAbierto(false)}
                                        className="block px-3 py-2 text-sm text-purple-400 hover:text-purple-300 hover:bg-white/5 transition-all"
                                    >
                                        Gestión Eventos
                                    </Link>
                                )}
                                {usuario.rol === 'usuario' && (
                                    <Link
                                        to="/mis-tickets"
                                        onClick={() => setMenuAbierto(false)}
                                        className="block px-3 py-2 text-sm text-purple-400 hover:text-purple-300 hover:bg-white/5 transition-all"
                                    >
                                        Mis Tickets
                                    </Link>
                                )}
                                <button
                                    onClick={handleCerrarSesion}
                                    className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                                >
                                    Cerrar sesión
                                </button>
                            </>
                        ) : (
                            <>
                                <Link
                                    to="/registro"
                                    onClick={() => setMenuAbierto(false)}
                                    className="block px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                                >
                                    Registrarse
                                </Link>
                                <Link
                                    to="/login"
                                    onClick={() => setMenuAbierto(false)}
                                    className="block px-3 py-2 text-sm font-semibold text-white bg-purple-600 text-center"
                                >
                                    Iniciar sesión
                                </Link>
                            </>
                        )}
                    </div>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
