import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    stages: [
        { duration: '30s', target: 100 },
        { duration: '40s', target: 300 },
        { duration: '40s', target: 500 },
        { duration: '40s', target: 800 },
        { duration: '2m', target: 800 },    // sostenido en el pico, tiempo suficiente para ver degradación acumulada
        { duration: '30s', target: 0 },
    ],
    thresholds: {
        http_req_failed: ['rate<0.10'],
        http_req_duration: ['p(95)<3000'],
    },
};

const BACKEND = __ENV.BACKEND_URL || 'aca va el link de la URL para probar';

export default function () {
    const health = http.get(`${BACKEND}/api/health`, {
        tags: { endpoint: 'health', action: 'healthCheck' },
    });
    check(health, {
        'Health responde 200': (res) => res.status === 200,
    });

    const eventos = http.get(`${BACKEND}/api/eventos`, {
        tags: { endpoint: 'eventos', action: 'listEventos' },
    });
    check(eventos, {
        'Eventos responde 200 o 429 (rate limit)': (res) => res.status === 200 || res.status === 429,
    });

    const detalle = http.get(`${BACKEND}/api/eventos/1/detalle`, {
        tags: { endpoint: 'eventos', action: 'detalleEvento' },
    });
    check(detalle, {
        'Detalle evento responde 200, 404 o 429': (res) => [200, 404, 429].includes(res.status),
    });

    sleep(0.2);
}

/*
EJECUCIÓN MANUAL (PowerShell, situado en pruebas-k6/):

$env:K6_WEB_DASHBOARD="true"
$env:K6_WEB_DASHBOARD_EXPORT="reporte-stayevent-stress.html"
$env:BACKEND_URL="aca va el link de la URL para probar"

k6 run stayevent-test-stress.js
*/
