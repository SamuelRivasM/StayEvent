// Prueba — Autenticación (registro, login, validación de token)
process.env.JWT_SECRET = 'clave-secreta-para-pruebas-jest-tdd-12345678';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');

// Mock de la BD
jest.mock('../../server/config/db', () => ({
    pool: {
        query:   jest.fn(),
        execute: jest.fn(),
    },
    testConnection: jest.fn().mockResolvedValue(),
}));

const { pool }  = require('../../server/config/db');
const authRutas = require('../../server/rutas/authRutas');

// App mínima de prueba (sin helmet, cors ni rate limiting)
const app = express();
app.use(express.json());
app.use('/api/auth', authRutas);

// Hash de 'TestPass#1' generado una sola vez para todos los tests de login
let hashValido;
beforeAll(async () => {
    hashValido = await bcrypt.hash('TestPass#1', 1);
});

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

// ─── REGISTRO ────────────────────────────────────────────────────────────────

describe('POST /api/auth/register', () => {

    test('registro exitoso con datos válidos', async () => {
        const mockQuery = jest.fn()
            .mockResolvedValueOnce([[]])                    // SELECT → email libre
            .mockResolvedValueOnce([{ insertId: 42 }]);     // INSERT → nuevo usuario
        pool.query.mockImplementation(mockQuery);
        pool.execute.mockResolvedValueOnce([{}]);           // INSERT sesiones_activas

        const res = await request(app)
            .post('/api/auth/register')
            .send({
                nombre: 'Juan', apellido: 'Perez',
                email: 'nuevo@test.com', password: 'Pass#1234',
                telefono: '987654321',
            });

        expect(res.status).toBe(201);
        expect(res.body.token).toBeDefined();
        expect(res.body.usuario.email).toBe('nuevo@test.com');
        expect(res.body.usuario.rol).toBe('usuario');
    });

    test('falla si el correo ya está registrado', async () => {
        const mockQuery = jest.fn()
            .mockResolvedValueOnce([[{ id: 1 }]]);          // SELECT → email duplicado
        pool.query.mockImplementation(mockQuery);

        const res = await request(app)
            .post('/api/auth/register')
            .send({
                nombre: 'Juan', apellido: 'Perez',
                email: 'existente@test.com', password: 'Pass#1234',
                telefono: '987654321',
            });

        expect(res.status).toBe(409);
        expect(res.body.mensaje).toMatch(/ya está registrado/i);
    });

    test('falla si faltan campos obligatorios', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ nombre: '', apellido: '', email: '', password: '', telefono: '' });

        expect(res.status).toBe(400);
    });

    test('falla si se envían campos no permitidos', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({
                nombre: 'Juan', apellido: 'Perez',
                email: 'juan@test.com', password: 'Pass#1234',
                telefono: '987654321', rol: 'admin',
            });

        expect(res.status).toBe(400);
        expect(res.body.mensaje).toMatch(/campos no permitidos/i);
    });

    test('falla si el email tiene formato inválido', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({
                nombre: 'Juan', apellido: 'Perez',
                email: 'no-es-un-email', password: 'Pass#1234',
                telefono: '987654321',
            });

        expect(res.status).toBe(400);
        expect(res.body.mensaje).toMatch(/email/i);
    });

    test('falla si la contraseña no tiene carácter especial ($, %, #)', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({
                nombre: 'Juan', apellido: 'Perez',
                email: 'juan@test.com', password: 'SinEspecial1',
                telefono: '987654321',
            });

        expect(res.status).toBe(400);
        expect(res.body.mensaje).toMatch(/especial/i);
    });

    test('falla si el teléfono tiene longitud incorrecta para Perú (+51 requiere 9 dígitos)', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({
                nombre: 'Juan', apellido: 'Perez',
                email: 'juan@test.com', password: 'Pass#1234',
                codigoPais: '+51', telefono: '12345',
            });

        expect(res.status).toBe(400);
        expect(res.body.mensaje).toMatch(/dígitos/i);
    });

    test('falla si el nombre tiene menos de 2 caracteres', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({
                nombre: 'J', apellido: 'Perez',
                email: 'juan@test.com', password: 'Pass#1234',
                telefono: '987654321',
            });

        expect(res.status).toBe(400);
        expect(res.body.mensaje).toMatch(/2 caracteres/i);
    });

});

// ─── LOGIN ───────────────────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {

    test('login exitoso con credenciales válidas', async () => {
        const mockQuery = jest.fn()
            .mockResolvedValueOnce([[{                      // SELECT → usuario encontrado
                id: 1, nombre: 'Juan', apellido: 'Perez',
                email: 'juan@test.com', password: hashValido, rol: 'usuario',
            }]]);
        pool.query.mockImplementation(mockQuery);
        pool.execute.mockResolvedValueOnce([{}]);           // INSERT sesiones_activas

        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'juan@test.com', password: 'TestPass#1' });

        expect(res.status).toBe(200);
        expect(res.body.token).toBeDefined();
        expect(res.body.usuario.email).toBe('juan@test.com');
    });

    test('falla si el usuario no existe', async () => {
        const mockQuery = jest.fn()
            .mockResolvedValueOnce([[]]); // SELECT → sin resultados
        pool.query.mockImplementation(mockQuery);

        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'noexiste@test.com', password: 'Pass#1234' });

        expect(res.status).toBe(401);
        expect(res.body.mensaje).toBe('Credenciales inválidas.');
    });

    test('falla con contraseña incorrecta', async () => {
        const mockQuery = jest.fn()
            .mockResolvedValueOnce([[{
                id: 1, nombre: 'Juan', apellido: 'Perez',
                email: 'juan@test.com', password: hashValido, rol: 'usuario',
            }]]);
        pool.query.mockImplementation(mockQuery);

        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'juan@test.com', password: 'WrongPass#1' });

        expect(res.status).toBe(401);
        expect(res.body.mensaje).toBe('Credenciales inválidas.');
    });

    test('falla si email y password están vacíos', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: '', password: '' });

        expect(res.status).toBe(400);
    });

    test('falla si el email tiene formato inválido', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'no-valido', password: 'Pass#1234' });

        expect(res.status).toBe(400);
    });

    test('falla si la contraseña no tiene carácter especial', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'user@test.com', password: 'SinEspecial1' });

        expect(res.status).toBe(400);
        expect(res.body.mensaje).toMatch(/especial/i);
    });

    test('falla si el email no es un string', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 123, password: 'Pass#1234' });

        expect(res.status).toBe(400);
    });

});

// ─── VALIDACIÓN DE TOKEN ─────────────────────────────────────────────────────

describe('GET /api/auth/me', () => {

    test('retorna sesión válida con token correcto', async () => {
        const token = generarToken({ id: 1, rol: 'usuario' });

        const mockExecute = jest.fn()
            .mockResolvedValueOnce([[{ activo: 1 }]]); // sesiones_activas → activa
        pool.execute.mockImplementation(mockExecute);

        const mockQuery = jest.fn()
            .mockResolvedValueOnce([[{                  // SELECT usuario por id
                id: 1, nombre: 'Juan', apellido: 'Perez',
                email: 'juan@test.com', rol: 'usuario',
            }]]);
        pool.query.mockImplementation(mockQuery);

        const res = await request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.usuario).toBeDefined();
        expect(res.body.usuario.email).toBe('juan@test.com');
    });

    test('falla si no se envía token', async () => {
        const res = await request(app).get('/api/auth/me');

        expect(res.status).toBe(401);
        expect(res.body.mensaje).toMatch(/token no proporcionado/i);
    });

    test('falla con token inválido', async () => {
        const res = await request(app)
            .get('/api/auth/me')
            .set('Authorization', 'Bearer token-invalido-xyz');

        expect(res.status).toBe(401);
        expect(res.body.mensaje).toMatch(/token inválido/i);
    });

    test('falla si la sesión fue cerrada (jti inactivo en BD)', async () => {
        const token = generarToken({ id: 1, rol: 'usuario' });

        const mockExecute = jest.fn()
            .mockResolvedValueOnce([[]]); // sesiones_activas → no encontrada
        pool.execute.mockImplementation(mockExecute);

        const res = await request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(401);
        expect(res.body.mensaje).toMatch(/sesión inválida/i);
    });

});
