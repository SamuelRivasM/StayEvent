import React from 'react';

const AdminCompras = () => (
    <div className="px-5 py-8 sm:px-8">
        <div className="mb-9">
            <p className="text-xs text-gray-600 uppercase tracking-[0.2em] mb-2">
                Panel de Administrador
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white leading-tight">
                Gestión Compras
            </h1>
            <div className="mt-3 h-px w-12 bg-gradient-to-r from-purple-500 to-transparent" />
        </div>

        <div className="bg-white/[0.02] border border-white/[0.06] shadow-[0_2px_16px_rgba(0,0,0,0.4)]">
            <div className="text-center py-32">
                <div className="w-11 h-11 rounded-full bg-white/[0.03] border border-white/[0.07] flex items-center justify-center mx-auto mb-4">
                    <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                </div>
                <p className="text-gray-500 text-sm mb-1">Gestión de Compras</p>
                <p className="text-gray-700 text-xs">Esta sección se implementará próximamente</p>
            </div>
        </div>
    </div>
);

export default AdminCompras;
