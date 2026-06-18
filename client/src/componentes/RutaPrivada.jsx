import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const RUTA_POR_ROL = {
    admin: '/admin',
    usuario: '/',
    organizador: '/organizador',
};

const RutaPrivada = ({ children, rolesPermitidos }) => {
    const { usuario, cargando } = useAuth();

    if (cargando) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="text-gray-500 text-lg">Cargando...</div>
            </div>
        );
    }

    if (!usuario) {
        return <Navigate to="/login" replace />;
    }

    if (rolesPermitidos && !rolesPermitidos.includes(usuario.rol)) {
        return <Navigate to={RUTA_POR_ROL[usuario.rol] || '/login'} replace />;
    }

    return children;
};

export default RutaPrivada;
