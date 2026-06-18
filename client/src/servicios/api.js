import axios from 'axios';

const api = axios.create({
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000,
});

// Request interceptor - añade token de autenticación
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        console.error('Error en request:', error.message);
        return Promise.reject(error);
    }
);

// Response interceptor - maneja errores de respuesta
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Detectar si es un error de red (sin respuesta del servidor)
        if (!error.response) {
            if (error.code === 'ECONNABORTED') {
                const nuevError = new Error('Solicitud expirada. El servidor tardó demasiado en responder.');
                nuevError.timeout = true;
                return Promise.reject(nuevError);
            }

            const nuevoError = new Error('Error de conexión. Verifica tu conexión a internet.');
            nuevoError.network = true;
            return Promise.reject(nuevoError);
        }

        // Manejar diferentes códigos de estado
        const { status, data } = error.response;

        // Token expirado o no autorizado
        if (status === 401) {
            const esEndpointLogout = error.config?.url?.includes('/auth/logout');
            if (!esEndpointLogout) {
                // Notificar a otras pestañas antes de cerrar sesión
                localStorage.setItem('stay_event_logout', Date.now().toString());
                localStorage.removeItem('token');
                localStorage.removeItem('usuario');

                // Redirigir a login
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }
            }
        }

        // Validación fallida
        if (status === 400) {
            error.validationError = true;
        }

        // No encontrado
        if (status === 404) {
            error.notFound = true;
        }

        // Error del servidor
        if (status >= 500) {
            console.error('Error del servidor:', status, data);
            error.serverError = true;
        }

        return Promise.reject(error);
    }
);

export default api;
