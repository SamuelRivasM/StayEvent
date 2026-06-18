// ─── Datos Mock — Dashboard del Organizador ──────────────────────────────────
//
// Datos de prueba para previsualizar el dashboard del organizador.
// Simula la respuesta de los endpoints del organizador.
// Todos los montos están en Soles peruanos (PEN).

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

const MOCK_ORG_DASHBOARD = {
    kpis: {
        ingresos: {
            actual:      15420.00,
            anterior:    12800.00,
            crecimiento: 20.5,
        },
        tickets: {
            vendidos:  892,
            capacidad: 1500,
        },
        checkin: {
            asistentes:  634,
            vendidos:    892,
            tasa:        71.1,
        },
    },

    tendencia30dias: diasMock.map((dia, i) => ({
        dia,
        ingresos: Math.round((200 + Math.random() * 900 + Math.sin(i / 3) * 300) * 100) / 100,
        tickets:  Math.round(8 + Math.random() * 45 + Math.sin(i / 4) * 15),
    })),

    distribucionZonas: [
        { categoria: 'General',     tickets: 420, ingresos: 4200.00  },
        { categoria: 'VIP',         tickets: 215, ingresos: 6450.00  },
        { categoria: 'Early Bird',  tickets: 160, ingresos: 2400.00  },
        { categoria: 'Backstage',   tickets: 97,  ingresos: 4850.00  },
    ],

    eficienciaAsistencia: [
        { evento: 'Concierto Coldplay Lima',  vendidas: 340, checkin: 285 },
        { evento: 'Festival Selvámonos',      vendidas: 195, checkin: 142 },
        { evento: 'Fiesta Año Nuevo Premium', vendidas: 120, checkin: 98  },
        { evento: 'Stand Up Comedy Night',    vendidas: 180, checkin: 109 },
        { evento: 'Tech Meetup Lima 2026',    vendidas: 57,  checkin: 0   },
    ],

    eventosActivos: [
        {
            id: 1,
            titulo:           'Concierto Coldplay Lima',
            fecha:            '2026-07-15',
            estado:           'activo',
            categoria:        'Conciertos',
            entradas_vendidas: 340,
            capacidad_total:   500,
            ingresos:          8500.00,
        },
        {
            id: 2,
            titulo:           'Festival Selvámonos',
            fecha:            '2026-08-02',
            estado:           'activo',
            categoria:        'Festivales',
            entradas_vendidas: 195,
            capacidad_total:   400,
            ingresos:          3900.00,
        },
        {
            id: 3,
            titulo:           'Fiesta Año Nuevo Premium',
            fecha:            '2026-12-31',
            estado:           'pausado',
            categoria:        'Fiestas / Discoteca',
            entradas_vendidas: 120,
            capacidad_total:   250,
            ingresos:          2400.00,
        },
        {
            id: 4,
            titulo:           'Stand Up Comedy Night',
            fecha:            '2026-07-20',
            estado:           'activo',
            categoria:        'Conciertos',
            entradas_vendidas: 180,
            capacidad_total:   200,
            ingresos:          720.00,
        },
        {
            id: 5,
            titulo:           'Tech Meetup Lima 2026',
            fecha:            '2026-09-10',
            estado:           'activo',
            categoria:        'Festivales',
            entradas_vendidas: 57,
            capacidad_total:   150,
            ingresos:          0.00,
        },
    ],

    actividadReciente: [
        { id: 201, tipo: 'Compra de Ticket', usuario: 'Carlos Ramírez',   evento: 'Concierto Coldplay Lima',  cantidad: 2, monto: 600.00, fecha: '2026-06-17T22:15:00' },
        { id: 200, tipo: 'Check-in QR',      usuario: 'Ana Quispe',       evento: 'Festival Selvámonos',      cantidad: 1, monto: 0,      fecha: '2026-06-17T21:00:00' },
        { id: 199, tipo: 'Compra de Ticket', usuario: 'Valentina Rojas',  evento: 'Stand Up Comedy Night',    cantidad: 3, monto: 120.00, fecha: '2026-06-17T20:30:00' },
        { id: 198, tipo: 'Check-in QR',      usuario: 'Pedro Sánchez',    evento: 'Concierto Coldplay Lima',  cantidad: 4, monto: 0,      fecha: '2026-06-17T19:45:00' },
        { id: 197, tipo: 'Reserva Temporal',  usuario: 'Sofía Gutiérrez', evento: 'Festival Selvámonos',      cantidad: 2, monto: 170.00, fecha: '2026-06-17T19:10:00' },
        { id: 196, tipo: 'Compra de Ticket', usuario: 'Isabella Flores',  evento: 'Fiesta Año Nuevo Premium', cantidad: 6, monto: 1500.00,fecha: '2026-06-17T18:00:00' },
        { id: 195, tipo: 'Check-in QR',      usuario: 'Camila Torres',    evento: 'Stand Up Comedy Night',    cantidad: 2, monto: 0,      fecha: '2026-06-17T17:30:00' },
        { id: 194, tipo: 'Compra de Ticket', usuario: 'Diego Vargas',     evento: 'Concierto Coldplay Lima',  cantidad: 1, monto: 300.00, fecha: '2026-06-17T16:20:00' },
        { id: 193, tipo: 'Compra de Ticket', usuario: 'Rosa Martínez',    evento: 'Tech Meetup Lima 2026',    cantidad: 3, monto: 0.00,   fecha: '2026-06-17T15:00:00' },
        { id: 192, tipo: 'Check-in QR',      usuario: 'Ricardo Paredes',  evento: 'Festival Selvámonos',      cantidad: 1, monto: 0,      fecha: '2026-06-17T14:30:00' },
    ],
};

export default MOCK_ORG_DASHBOARD;
