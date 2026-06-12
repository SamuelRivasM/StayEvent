import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';

const KEYFRAMES = `
    @keyframes overlayIn {
        from { opacity: 0; }
        to   { opacity: 1; }
    }
`;

const BG_STYLE = {
    background: `
        radial-gradient(ellipse 55% 50% at 12% 38%, rgba(139,92,246,0.055) 0%, transparent 100%),
        radial-gradient(ellipse 45% 55% at 82% 18%, rgba(99,102,241,0.04)  0%, transparent 100%),
        radial-gradient(ellipse 38% 42% at 58% 82%, rgba(168,85,247,0.03)  0%, transparent 100%)
    `,
};

const IconDashboard = () => (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 13a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1v-6z" />
    </svg>
);

const IconUsuarios = () => (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

const IconEventos = () => (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

const IconCompras = () => (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
);

const IconMenu = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
);

const IconClose = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const NAV_ITEMS = [
    { to: '/admin/dashboard', icon: IconDashboard, label: 'Dashboard' },
    { to: '/admin/usuarios', icon: IconUsuarios, label: 'Gestión Usuarios' },
    { to: '/admin/eventos', icon: IconEventos, label: 'Gestión Eventos' },
    { to: '/admin/compras', icon: IconCompras, label: 'Gestión Compras' },
];

const ItemNav = ({ to, icon: Icono, label, onClick }) => (
    <NavLink
        to={to}
        onClick={onClick}
        className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors duration-150 border-l-2 ${isActive
                ? 'text-white bg-white/[0.05] border-purple-500'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.03] border-transparent'
            }`
        }
    >
        <Icono />
        <span>{label}</span>
    </NavLink>
);

const AdminLayout = () => {
    const [sidebarAbierto, setSidebarAbierto] = useState(false);
    const location = useLocation();

    // Cierra sidebar al navegar en mobile
    useEffect(() => {
        setSidebarAbierto(false);
    }, [location.pathname]);

    return (
        <div className="min-h-screen bg-gray-950 text-white font-sans">
            <style>{KEYFRAMES}</style>

            <div
                className="fixed inset-0 pointer-events-none"
                style={{ zIndex: 0, ...BG_STYLE }}
                aria-hidden="true"
            />

            <Navbar />

            <div className="flex pt-16" style={{ position: 'relative', zIndex: 1 }}>

                {/* Sidebar */}
                <aside
                    className={`
                        fixed left-0 top-16 bottom-0 w-52
                        bg-gray-950 border-r border-white/[0.06]
                        flex flex-col z-40
                        transition-transform duration-200 ease-in-out
                        ${sidebarAbierto ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                    `}
                >
                    <div className="px-4 py-5 border-b border-white/[0.06]">
                        <p className="text-xs text-gray-400 uppercase tracking-[0.2em] mb-1">
                            Administración
                        </p>
                        <h2 className="text-sm font-bold text-white">Panel Admin</h2>
                        <div className="mt-2 h-px w-8 bg-gradient-to-r from-purple-500 to-transparent" />
                    </div>

                    <nav className="flex-1 py-3 overflow-y-auto">
                        {NAV_ITEMS.map(({ to, icon, label }) => (
                            <ItemNav key={to} to={to} icon={icon} label={label} />
                        ))}
                    </nav>
                </aside>

                {/* Overlay mobile */}
                {sidebarAbierto && (
                    <div
                        className="md:hidden fixed inset-0 bg-black/60 z-30"
                        style={{ top: '64px', animation: 'overlayIn 0.18s ease' }}
                        onClick={() => setSidebarAbierto(false)}
                    />
                )}

                {/* Contenido principal */}
                <main className="flex-1 min-w-0 md:ml-52 min-h-[calc(100vh-64px)]">

                    {/* Toggle mobile */}
                    <div className="md:hidden px-4 pt-5 pb-0">
                        <button
                            onClick={() => setSidebarAbierto(v => !v)}
                            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-500 border border-white/[0.08] hover:text-white hover:border-white/20 transition-colors"
                        >
                            {sidebarAbierto ? <IconClose /> : <IconMenu />}
                            Menú Admin
                        </button>
                    </div>

                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
