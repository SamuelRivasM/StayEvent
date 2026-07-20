import http from 'k6/http';
import { check, sleep } from 'k6';


/*
  Escenario usuarios entrar a la página principal y luego /eventos
  Carga Progresiva de 10 a 45 usuarios 
 */

export const options = {
    stages: [
        { duration: '15s', target: 10 },   // subida moderada para no activar el Rate Limit de golpe
        { duration: '20s', target: 20 },
        { duration: '15s', target: 0 },
    ],
    thresholds: {
        http_req_failed: ['rate<0.10'],
        http_req_duration: ['p(95)<3000'],
    },
};

const FRONTEND = __ENV.FRONTEND_URL || 'aca va el link de la URL para probar';
const BACKEND = __ENV.BACKEND_URL || 'aca va el link de la URL para probar';

export default function () {

    const health = http.get(`${BACKEND}/api/health`, {
        tags: { endpoint: 'backend', action: 'healthCheck' },
    });
    check(health, {
        'API de StayEvent responde OK (200)': (res) => res.status === 200,
        'API responde estructura correcta': (res) => res.body.includes('Stay Event API funcionando'),
    });

    sleep(1);

    const home = http.get(`${FRONTEND}/`, {
        tags: { endpoint: 'frontend', action: 'home' },
    });
    check(home, {
        'Frontend HOME cargó correctamente (200)': (res) => res.status === 200,
    });

    sleep(1);

    const apiEventos = http.get(`${BACKEND}/api/eventos`, {
        tags: { endpoint: 'backend', action: 'listEventos' },
    });
    check(apiEventos, {
        'Backend devuelve eventos (200 o 429 por Rate Limit)': (res) => res.status === 200 || res.status === 429,
        'Backend respondió rápido': (res) => res.timings.duration < 3000,
    });

    sleep(2);
}

/* 
EJECUCIÓN AUTOMÁTICA 
Primero deben ejecutar el powershell, situarse en el directorio de pruebas y ejecutar lo siguiente:

# esto es para generar el nombre del reporte
$env:K6_WEB_DASHBOARD="true"
$env:K6_WEB_DASHBOARD_EXPORT="reporte-stayevent-login.html"

# le pasamos las urls
$env:FRONTEND_URL="aca va el link de la URL para probar"
$env:BACKEND_URL="aca va el link de la URL para probar"

# ejecutar ks
k6 run archivo.js , obviamente lo cambian según el presente archivo.
*/

