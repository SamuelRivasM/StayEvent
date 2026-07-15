// Prueba — Eventos (creación de evento con rol organizador)
process.env.JWT_SECRET = 'clave-secreta-para-pruebas-jest-tdd-12345678';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const express = require('express');
const jwt     = require('jsonwebtoken');

// Mock de la BD
jest.mock('../../server/config/db', () => ({
    pool: {
        query:   jest.fn(),
        execute: jest.fn(),
    },
    testConnection: jest.fn().mockResolvedValue(),
}));

const { pool }      = require('../../server/config/db');
const eventosRutas  = require('../../server/rutas/eventosRutas');

// App mínima de prueba (sin helmet, cors ni rate limiting)
const app = express();
app.use(express.json());
app.use('/api/eventos', eventosRutas);

beforeEach(() => {
    jest.clearAllMocks();
});

// Helper: genera JWT válido con jti (requerido por verificarToken)
const generarToken = (payload) => {
    const jti = `test-jti-${Math.random().toString(36).slice(2)}`;
    return jwt.sign(
        { ...payload, jti },
        process.env.JWT_SECRET,
        { expiresIn: '1h', algorithm: 'HS256' }
    );
};

// Fecha futura en formato YYYY-MM-DD
const fechaFutura = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0, 10);
};

const EVENTO_VALIDO = {
    titulo:      'Concierto de Prueba',
    descripcion: 'Descripción del evento de prueba',
    categoria:   'Conciertos',
    fecha:       fechaFutura(),
    hora:        '20:00',
    lugar:       'Estadio Nacional',
    distrito:    'Cercado de Lima',
    zonas:       [{ nombre: 'General', precio: 50, stock: 100 }],
};

// ─── CREAR EVENTO ────────────────────────────────────────────────────────────

describe('POST /api/eventos', () => {

    test('creación exitosa de evento con organizador autenticado', async () => {
        const token = generarToken({ id: 5, rol: 'organizador' });

        const mockExecute = jest.fn()
            .mockResolvedValueOnce([[{ activo: 1 }]]); // sesiones_activas → activa
        pool.execute.mockImplementation(mockExecute);

        const mockQuery = jest.fn()
            .mockResolvedValueOnce([{ insertId: 10 }])  // INSERT evento
            .mockResolvedValueOnce([{}]);                // INSERT zonas_evento
        pool.query.mockImplementation(mockQuery);

        const res = await request(app)
            .post('/api/eventos')
            .set('Authorization', `Bearer ${token}`)
            .send(EVENTO_VALIDO);

        expect(res.status).toBe(201);
        expect(res.body.id).toBe(10);
        expect(res.body.mensaje).toMatch(/creado/i);
    });

    test('falla si la petición no lleva token', async () => {
        const res = await request(app)
            .post('/api/eventos')
            .send(EVENTO_VALIDO);

        expect(res.status).toBe(401);
        expect(res.body.mensaje).toMatch(/token/i);
    });

    test('falla si el usuario tiene rol "usuario" (solo organizadores pueden crear)', async () => {
        const token = generarToken({ id: 2, rol: 'usuario' });

        const mockExecute = jest.fn()
            .mockResolvedValueOnce([[{ activo: 1 }]]); // sesión activa válida
        pool.execute.mockImplementation(mockExecute);

        const res = await request(app)
            .post('/api/eventos')
            .set('Authorization', `Bearer ${token}`)
            .send(EVENTO_VALIDO);

        expect(res.status).toBe(403);
        expect(res.body.mensaje).toMatch(/acceso denegado/i);
    });

    test('falla si faltan campos obligatorios (título y lugar vacíos)', async () => {
        const token = generarToken({ id: 5, rol: 'organizador' });

        const mockExecute = jest.fn()
            .mockResolvedValueOnce([[{ activo: 1 }]]); // sesión activa válida
        pool.execute.mockImplementation(mockExecute);

        const res = await request(app)
            .post('/api/eventos')
            .set('Authorization', `Bearer ${token}`)
            .send({ titulo: '', categoria: 'Conciertos', fecha: fechaFutura(), hora: '20:00', lugar: '' });

        expect(res.status).toBe(400);
        expect(res.body.mensaje).toMatch(/obligatorios/i);
    });

    test('falla si la fecha del evento ya pasó', async () => {
        const token = generarToken({ id: 5, rol: 'organizador' });

        const mockExecute = jest.fn()
            .mockResolvedValueOnce([[{ activo: 1 }]]); // sesión activa válida
        pool.execute.mockImplementation(mockExecute);

        const res = await request(app)
            .post('/api/eventos')
            .set('Authorization', `Bearer ${token}`)
            .send({ ...EVENTO_VALIDO, fecha: '2020-01-01' });

        expect(res.status).toBe(400);
        expect(res.body.mensaje).toMatch(/anterior a hoy/i);
    });

    test('falla si la categoría no existe en el sistema', async () => {
        const token = generarToken({ id: 5, rol: 'organizador' });

        const mockExecute = jest.fn()
            .mockResolvedValueOnce([[{ activo: 1 }]]); // sesión activa válida
        pool.execute.mockImplementation(mockExecute);

        const res = await request(app)
            .post('/api/eventos')
            .set('Authorization', `Bearer ${token}`)
            .send({ ...EVENTO_VALIDO, categoria: 'CategoríaInventada' });

        expect(res.status).toBe(400);
        expect(res.body.mensaje).toMatch(/categor/i);
    });

});