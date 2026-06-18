import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const PaginaOrganizador = () => {
    const { usuario, cerrarSesion } = useAuth();
    const navigate = useNavigate();

    const manejarCierreSesion = () => {
        cerrarSesion();
        navigate('/login', { replace: true });
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
            <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md text-center">
                <h1 className="text-2xl font-bold text-gray-800 mb-2">Panel de Organizador</h1>
                <p className="text-gray-500 mb-2">
                    Bienvenido, <span className="font-medium text-gray-700">{usuario?.nombre}</span>
                </p>
                <span className="inline-block bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full mb-6">
                    Rol: organizador
                </span>
                <p className="text-gray-400 text-sm mb-6">Esta sección está en construcción.</p>
                <button
                    onClick={manejarCierreSesion}
                    className="bg-gray-800 hover:bg-gray-900 text-white font-semibold px-6 py-2 rounded-lg transition-colors text-sm"
                >
                    Cerrar Sesión
                </button>
            </div>
        </div>
    );
};

export default PaginaOrganizador;
