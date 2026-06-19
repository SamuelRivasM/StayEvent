import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    stages: [
        { duration: '30s', target: 25 },   // Sube gradualmente a 25 usuarios
        { duration: '30s', target: 50 },   // Sube a 50 usuarios
        { duration: '1m', target: 100 },   // Sube hasta 100 usuarios
        { duration: '1m', target: 100 },   // Mantiene 100 usuarios estables
        { duration: '30s', target: 0 },    // Baja progresivamente a 0
    ],
    thresholds: {
        http_req_failed: ['rate<0.05'],    // Menos del 5% de errores HTTP
        http_req_duration: ['p(95)<3000'], // El 95% de las peticiones deben responder en menos de 3s
    },
};


const FRONTEND = __ENV.FRONTEND_URL || 'http://localhost:3000';
const BACKEND = __ENV.BACKEND_URL || 'http://localhost:5000';

export default function () {
    //Carga del home 
    const home = http.get(`${FRONTEND}/`);
    check(home, {
        'Frontend cargó correctamente (200)': (res) => res.status === 200,
        'Frontend respondió rápido (<3s)': (res) => res.timings.duration < 3000,
    });

    const apiEventos = http.get(`${BACKEND}/api/events`);
    check(apiEventos, {
        'Backend devuelve eventos (200)': (res) => res.status === 200,
        'Backend respondió rápido (<3s)': (res) => res.timings.duration < 3000,
    });

    sleep(1); // Da una pausa entre cada UV
}