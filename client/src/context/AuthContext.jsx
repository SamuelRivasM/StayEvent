import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../servicios/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [usuario, setUsuario] = useState(null);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        const inicializarAuth = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const respuesta = await api.get('/auth/me');
                    setUsuario(respuesta.data.usuario);
                } catch {
                    localStorage.removeItem('token');
                }
            }
            setCargando(false);
        };

        inicializarAuth();
    }, []);

    const iniciarSesion = (token, datosUsuario) => {
        localStorage.setItem('token', token);
        setUsuario(datosUsuario);
    };

    const cerrarSesion = () => {
        localStorage.removeItem('token');
        setUsuario(null);
    };

    return (
        <AuthContext.Provider value={{ usuario, cargando, iniciarSesion, cerrarSesion }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth debe usarse dentro de AuthProvider');
    }
    return context;
};

export default AuthContext;
