// ─── Datos Mock — Dashboard Analítico ─────────────────────────────────────────
//
// Datos de prueba en formato idéntico al que devuelve GET /api/admin/metricas-dashboard.
// Se usan como fallback si el backend no está disponible.
// Todos los montos están en Soles peruanos (PEN).

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Genera un array con los últimos N días en formato 'YYYY-MM-DD' */
const generarUltimos30Dias = () => {
    const dias = [];
    const hoy = new Date();
    for (let i = 29; i >= 0; i--) {
        const d = new Date(hoy);
        d.setDate(hoy.getDate() - i);
        dias.push(d.toISOString().slice(0, 10));
    }
    return dias;
};

const diasMock = generarUltimos30Dias();

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_DASHBOARD = {
    kpis: {
        ingresos: {
            actual:      28750.00,
            anterior:    24200.00,
            crecimiento: 18.8,
        },
        tickets: {
            vendidos:  1842,
            capacidad: 3500,
        },
        eventos: {
            activos: 12,
            totales: 34,
        },
        usuarios: {
            total:           2456,
            organizadores:   38,
            nuevosEstaSemana: 67,
        },
    },

    tendencia30dias: diasMock.map((dia, i) => ({
        dia,
        ingresos: Math.round((400 + Math.random() * 1800 + Math.sin(i / 3) * 600) * 100) / 100,
        tickets:  Math.round(15 + Math.random() * 85 + Math.sin(i / 4) * 30),
    })),

    topEventos: [
        { titulo: 'Concierto Coldplay Lima',       recaudacion: 12400.00, asistencia: 340 },
        { titulo: 'Tomorrowland Perú 2026',        recaudacion: 8900.00,  asistencia: 280 },
        { titulo: 'Festival Selvámonos',            recaudacion: 5600.00,  asistencia: 195 },
        { titulo: 'Fiesta Año Nuevo Premium',       recaudacion: 4200.00,  asistencia: 120 },
        { titulo: 'Stand Up Comedy Night',          recaudacion: 2100.00,  asistencia: 180 },
    ],

    distribucion: [
        { categoria: 'General',   tickets: 920, ingresos: 9200.00  },
        { categoria: 'VIP',       tickets: 480, ingresos: 14400.00 },
        { categoria: 'Early Bird', tickets: 310, ingresos: 4650.00  },
        { categoria: 'Backstage', tickets: 132, ingresos: 6600.00  },
    ],

    actividadReciente: [
        { id: 3041, tipo: 'Compra de Ticket',    usuario: 'Carlos Ramírez',     evento: 'Concierto Coldplay Lima',  cantidad: 2, monto: 600.00,  estado: 'confirmado', fecha: '2026-06-11T22:15:00' },
        { id: 3040, tipo: 'Compra de Ticket',    usuario: 'Ana Quispe',         evento: 'Tomorrowland Perú 2026',   cantidad: 3, monto: 510.00,  estado: 'confirmado', fecha: '2026-06-11T21:45:00' },
        { id: 3039, tipo: 'Compra de Ticket',    usuario: 'Valentina Rojas',    evento: 'Stand Up Comedy Night',    cantidad: 2, monto: 80.00,   estado: 'confirmado', fecha: '2026-06-11T20:30:00' },
        { id: 3038, tipo: 'Creación de Evento',  usuario: 'Luis Herrera',       evento: 'Tech Meetup Lima 2026',    cantidad: 0, monto: 0.00,    estado: 'pendiente',  fecha: '2026-06-11T19:10:00' },
        { id: 3037, tipo: 'Compra de Ticket',    usuario: 'Sofía Gutiérrez',    evento: 'Festival Selvámonos',      cantidad: 1, monto: 85.00,   estado: 'confirmado', fecha: '2026-06-11T18:50:00' },
        { id: 3036, tipo: 'Compra de Ticket',    usuario: 'Pedro Sánchez',      evento: 'Concierto Coldplay Lima',  cantidad: 4, monto: 1200.00, estado: 'confirmado', fecha: '2026-06-11T17:20:00' },
        { id: 3035, tipo: 'Compra de Ticket',    usuario: 'Isabella Flores',    evento: 'Fiesta Año Nuevo Premium', cantidad: 6, monto: 1500.00, estado: 'confirmado', fecha: '2026-06-11T16:00:00' },
        { id: 3034, tipo: 'Creación de Evento',  usuario: 'Fernando Díaz',      evento: 'Expo Arte Digital',        cantidad: 0, monto: 0.00,    estado: 'completado', fecha: '2026-06-11T14:30:00' },
        { id: 3033, tipo: 'Compra de Ticket',    usuario: 'Camila Torres',      evento: 'Stand Up Comedy Night',    cantidad: 5, monto: 200.00,  estado: 'confirmado', fecha: '2026-06-11T13:15:00' },
        { id: 3032, tipo: 'Compra de Ticket',    usuario: 'Diego Vargas',       evento: 'Tomorrowland Perú 2026',   cantidad: 2, monto: 340.00,  estado: 'confirmado', fecha: '2026-06-11T12:00:00' },
        { id: 3031, tipo: 'Compra de Ticket',    usuario: 'Rosa Martínez',      evento: 'Concierto Coldplay Lima',  cantidad: 2, monto: 600.00,  estado: 'confirmado', fecha: '2026-06-11T10:45:00' },
        { id: 3030, tipo: 'Compra de Ticket',    usuario: 'Ricardo Paredes',    evento: 'Festival Selvámonos',      cantidad: 3, monto: 255.00,  estado: 'confirmado', fecha: '2026-06-10T22:30:00' },
        { id: 3029, tipo: 'Creación de Evento',  usuario: 'Jorge Huamaní',      evento: 'Mercado Navideño Artesanal', cantidad: 0, monto: 0.00,  estado: 'completado', fecha: '2026-06-10T20:00:00' },
        { id: 3028, tipo: 'Compra de Ticket',    usuario: 'María Silva',        evento: 'Fiesta Año Nuevo Premium', cantidad: 4, monto: 1000.00, estado: 'confirmado', fecha: '2026-06-10T18:15:00' },
        { id: 3027, tipo: 'Compra de Ticket',    usuario: 'Andrés Castro',      evento: 'Concierto Coldplay Lima',  cantidad: 1, monto: 300.00,  estado: 'confirmado', fecha: '2026-06-10T16:40:00' },
        { id: 3026, tipo: 'Compra de Ticket',    usuario: 'Lucía Mendoza',      evento: 'Tomorrowland Perú 2026',   cantidad: 2, monto: 340.00,  estado: 'confirmado', fecha: '2026-06-10T14:20:00' },
    ],
};

// ─── Alertas Inteligentes (generadas estáticamente para el mock) ──────────────

const MOCK_ALERTAS = [
    {
        id: 1,
        tipo:    'warning',
        mensaje: 'El evento "Concierto Coldplay Lima" ha superado el 90% de aforo.',
        tiempo:  'Hace 25 min',
    },
    {
        id: 2,
        tipo:    'info',
        mensaje: 'Pico inusual de ventas detectado en las últimas 2 horas (+45% vs. promedio).',
        tiempo:  'Hace 1 hora',
    },
    {
        id: 3,
        tipo:    'success',
        mensaje: 'Nuevo evento "Expo Arte Digital" publicado y activo.',
        tiempo:  'Hace 2 horas',
    },
    {
        id: 4,
        tipo:    'warning',
        mensaje: '3 organizadores nuevos pendientes de validación de identidad.',
        tiempo:  'Hace 3 horas',
    },
    {
        id: 5,
        tipo:    'info',
        mensaje: 'Se registraron 67 nuevos usuarios esta semana (+12% vs. semana anterior).',
        tiempo:  'Hace 5 horas',
    },
];

export { MOCK_DASHBOARD, MOCK_ALERTAS };
