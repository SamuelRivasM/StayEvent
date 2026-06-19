import http from 'k6/http';
import { check, sleep } from 'k6';

/*
  Escenario Usuarios autenticándose y consultando su perfil
  Carga Progresiva de 10 a 45 usuarios 
 */

export const options = {
    stages: [
        { duration: '15s', target: 10 },   // Sube gradualmente a 10 usuarios
        { duration: '30s', target: 25 },   // Sube a 25 usuarios
        { duration: '1m', target: 45 },    // Sube hasta 45 usuarios
        { duration: '1m', target: 45 },    // Mantiene 45 usuarios estables
        { duration: '30s', target: 0 },    // Baja progresivamente a 0
    ],
    thresholds: {
        http_req_failed: ['rate<0.10'],                         // 10% de tolerancia por posibles bloqueos de Rate 
        http_req_duration: ['p(95)<3000'],                      // 95% de requests bajo 3 segundos
        'http_req_duration{endpoint:login}': ['p(95)<3000'],
        'http_req_duration{endpoint:profile}': ['p(95)<2000'],
    },
};

// URLs
const FRONTEND = __ENV.FRONTEND_URL || 'https://stayevent-client.onrender.com';
const BACKEND = __ENV.BACKEND_URL || 'https://stayevent-backend.onrender.com';

const ADMIN_CREDENTIALS = {
    email: 'aayat@admin.com',
    password: 'aayat123$',
};

export default function () {
    // carga de la pantalla principal
    const home = http.get(`${FRONTEND}/`, {
        tags: { endpoint: 'frontend', action: 'home' },
    });
    check(home, {
        'Frontend HOME cargó correctamente': (res) => res.status === 200,
    });

    sleep(1);

    // iniciando sesión
    const loginPayload = JSON.stringify({
        email: ADMIN_CREDENTIALS.email,
        password: ADMIN_CREDENTIALS.password,
    });

    const loginParams = {
        headers: {
            'Content-Type': 'application/json',
        },
        tags: {
            endpoint: 'login',
            action: 'authenticate',
        },
    };

    const login = http.post(`${BACKEND}/api/auth/login`, loginPayload, loginParams);

    let token = null;
    let loginSuccess = false;

    check(login, {
        'Login responde correctamente (200)': (res) => res.status === 200,
        'Login retorna token': (res) => {
            try {
                const respBody = JSON.parse(res.body);
                token = respBody.token;
                loginSuccess = !!token;
                return loginSuccess;
            } catch {
                return false;
            }
        },
    });

    sleep(1);

    // solo si fue exitoso el login
    if (loginSuccess && token) {
        const profileParams = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            tags: {
                endpoint: 'profile',
                action: 'getProfile',
            },
        };

        const profile = http.get(`${BACKEND}/api/usuarios/perfil`, profileParams);

        check(profile, {
            'Perfil responde correctamente (200 o 404)': (res) => res.status === 200 || res.status === 404,
            'Perfil respondió rápido': (res) => res.timings.duration < 2000,
        });

        sleep(1);

        // obteniendo lista de eventos
        const eventosAutenticado = http.get(`${BACKEND}/api/eventos`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            tags: {
                endpoint: 'backend',
                action: 'eventosAuth',
            },
        });

        check(eventosAutenticado, {
            'Eventos autenticado responde (200)': (res) => res.status === 200,
        });

        sleep(1);

    }

    sleep(2);
}