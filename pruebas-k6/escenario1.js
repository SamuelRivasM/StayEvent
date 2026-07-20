import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

export const options = {
    scenarios: {
        default: {
            executor: 'constant-vus',
            vus: 1,
            duration: '4m',
        },
    },
    thresholds: {
        http_req_duration: ['p(95)<3000'],
    },
};

const BACKEND = __ENV.BACKEND_URL || 'aca va el link de la URL para probar';

const requestsByInstance = new Counter('requests_by_instance');
const failedByInstance = new Counter('failed_by_instance');

export default function () {
    const res = http.get(`${BACKEND}/api/health`, {
        tags: { endpoint: 'health', action: 'failoverCheck' },
    });

    const instancia = res.headers['X-Instance-Id'] || 'unknown';

    requestsByInstance.add(1, { instance: instancia });
    if (res.status !== 200) {
        failedByInstance.add(1, { instance: instancia });
    }

    check(res, {
        'Health responde 200': (r) => r.status === 200,
    });

    sleep(1.5);
}

/*
EJECUCIÓN MANUAL (PowerShell, situado en pruebas-k6/):

$env:K6_WEB_DASHBOARD="true"
$env:K6_WEB_DASHBOARD_EXPORT="reporte-escenario1.html"
$env:BACKEND_URL="aca va el link de la URL para probar"

k6 run --out json=escenario1-resultados.json escenario1.js
*/
