import http from 'k6/http';
import { check, sleep } from 'k6';

/*
  Escenario Usuarios autenticándose y consultando su perfil
  Carga Progresiva de 10 a 45 usuarios 
 */

export const options = {
    stages: [
        { duration: '15s', target: 10 },
        { duration: '30s', target: 25 },
        { duration: '1m', target: 45 },
        { duration: '1m', target: 45 },
        { duration: '30s', target: 0 },
    ],
    thresholds: {
        http_req_failed: ['rate<0.10'],
        http_req_duration: ['p(95)<3000'],
        'http_req_duration{endpoint:login}': ['p(95)<3000'],
        'http_req_duration{endpoint:profile}': ['p(95)<2000'],
    },
};

const FRONTEND = __ENV.FRONTEND_URL || 'aca va el link de la URL para probar';
const BACKEND = __ENV.BACKEND_URL || 'aca va el link de la URL para probar';

const ADMIN_CREDENTIALS = {
    email: 'Escribir aqui una credencial verdadera para testear',
    password: 'Escribir aqui una credencial verdadera para testear',
};

export default function () {
    const home = http.get(`${FRONTEND}/`, {
        tags: { endpoint: 'frontend', action: 'home' },
    });
    check(home, {
        'Frontend HOME cargó correctamente': (res) => res.status === 200,
    });

    sleep(1);

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