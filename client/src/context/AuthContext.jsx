import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import api from '../servicios/api';

const AuthContext = createContext(null);

const LOGOUT_KEY = 'stay_event_logout';

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

    // Escuchar cierre de sesión desde otras pestañas del mismo navegador
    useEffect(() => {
        const handleStorage = (event) => {
            if (event.key === LOGOUT_KEY && event.newValue) {
                localStorage.removeItem('token');
                setUsuario(null);
            }
        };

        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    const iniciarSesion = (token, datosUsuario) => {
        localStorage.removeItem(LOGOUT_KEY);
        localStorage.setItem('token', token);
        setUsuario(datosUsuario);
    };

    const cerrarSesion = useCallback(() => {
        // Capturar el token ANTES de cualquier modificación a localStorage.
        // El interceptor de axios corre en microtarea (async), por lo que si se
        // elimina el token primero, la llamada sale sin Authorization header
        // y el servidor nunca invalida las sesiones en DB.
        const token = localStorage.getItem('token');

        // Limpiar estado local y señalizar otras pestañas
        localStorage.setItem(LOGOUT_KEY, Date.now().toString());
        localStorage.removeItem('token');
        setUsuario(null);

        // Notificar al servidor pasando el token explícitamente en el header,
        // ya que localStorage ya no lo tiene en este punto
        if (token) {
            api.post('/auth/logout', {}, {
                headers: { Authorization: `Bearer ${token}` }
            }).catch(() => {});
        }
    }, []);

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
