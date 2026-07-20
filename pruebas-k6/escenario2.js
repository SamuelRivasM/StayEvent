import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

/*
  Escenario 2 de HA: balanceo de carga en condiciones normales, sin forzar
  ninguna falla (a diferencia de escenario1.js). El objetivo es mostrar que,
  con ambos Droplets sanos, el Load Balancer reparte el trafico entre las
  2 instancias de forma pareja, sin caidas.

  Carga constante y baja (2 VUs, ~1 request cada 1.5s cada uno), 2 minutos.
 */

export const options = {
    scenarios: {
        default: {
            executor: 'constant-vus',
            vus: 2,
            duration: '2m',
        },
    },
    thresholds: {
        http_req_duration: ['p(95)<3000'],
        http_req_failed: ['rate<0.05'],
    },
};

const BACKEND = __ENV.BACKEND_URL || 'aca va el link de la URL para probar';

const requestsByInstance = new Counter('requests_by_instance');

export default function () {
    const res = http.get(`${BACKEND}/api/health`, {
        tags: { endpoint: 'health', action: 'balanceCheck' },
    });

    const instancia = res.headers['X-Instance-Id'] || 'unknown';
    requestsByInstance.add(1, { instance: instancia });

    check(res, {
        'Health responde 200': (r) => r.status === 200,
    });

    sleep(1.5);
}

/*
EJECUCIÓN MANUAL (PowerShell, situado en pruebas-k6/):

$env:K6_WEB_DASHBOARD="true"
$env:K6_WEB_DASHBOARD_EXPORT="reporte-escenario2.html"
$env:BACKEND_URL="aca va el link de la URL para probar"

k6 run --out json=escenario2-resultados.json escenario2.js
*/
