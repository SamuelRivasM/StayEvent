import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../servicios/api';

const RUTA_POR_ROL = {
    admin: '/',
    usuario: '/',
    organizador: '/',
};

// Iconos

const IconoEmail = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
);

const IconoCandado = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
);

const IconoOjoAbierto = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
);

const IconoOjoCerrado = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
);

const IconoAlerta = () => (
    <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd" />
    </svg>
);

// Componente principal

const Login = () => {
    const [formulario, setFormulario] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [cargando, setCargando] = useState(false);
    const [mostrarPassword, setMostrarPassword] = useState(false);

    const { iniciarSesion } = useAuth();
    const navigate = useNavigate();

    //Lógica de autenticación (sin cambios)

    const manejarCambio = (e) => {
        setFormulario((prev) => ({ ...prev, [e.target.name]: e.target.value }));
        setError('');
    };

    const REGEX_EMAIL_LOGIN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const manejarEnvio = async (e) => {
        e.preventDefault();
        setCargando(true);
        setError('');

        const emailTrimmed = formulario.email.trim();
        const passwordTrimmed = formulario.password.trim();

        // Validaciones client-side antes de enviar al servidor
        if (!emailTrimmed || !passwordTrimmed) {
            setError('Email y contraseña son requeridos.');
            setCargando(false);
            return;
        }
        if (!REGEX_EMAIL_LOGIN.test(emailTrimmed)) {
            setError('Ingresa un correo electrónico válido.');
            setCargando(false);
            return;
        }
        if (emailTrimmed.length > 100 || passwordTrimmed.length > 72) {
            setError('Credenciales inválidas.');
            setCargando(false);
            return;
        }
        if (passwordTrimmed.length < 8) {
            setError('La contraseña debe tener al menos 8 caracteres.');
            setCargando(false);
            return;
        }
        if (!/[$%#]/.test(passwordTrimmed)) {
            setError('La contraseña debe contener al menos un carácter especial ($, %, #).');
            setCargando(false);
            return;
        }

        try {
            const respuesta = await api.post('/auth/login', {
                email: emailTrimmed,
                password: passwordTrimmed,
            });
            const { token, usuario } = respuesta.data;
            iniciarSesion(token, usuario);
            navigate(RUTA_POR_ROL[usuario.rol] || '/usuario', { replace: true });
        } catch (err) {
            setError(err.response?.data?.mensaje || 'Error al iniciar sesión. Inténtalo nuevamente.');
        } finally {
            setCargando(false);
        }
    };


    return (
        <div className="min-h-screen flex">

            {/* Panel izquierdo: imagen de evento */}
            <div
                aria-hidden="true"
                className="hidden lg:flex lg:w-[58%] relative flex-col justify-between p-12"
                style={{
                    backgroundImage: 'url(https://auara.org/cdn/shop/articles/Diseno_sin_titulo_2048x.jpg?v=1657694449)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            >
                {/* Overlay degradado */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-900/95 via-black/80 to-black/90" />

                {/* Logo superior */}
                <div className="relative z-10">
                    <Link to="/" className="text-white text-xl font-bold tracking-tight hover:text-purple-200 transition-colors" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.9)' }}>Stay Event</Link>
                </div>

                {/* Texto inferior */}
                <div className="relative z-10">
                    <h2 className="text-4xl font-bold text-white mb-4 leading-tight" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.9)' }}>
                        Todos los eventos que quieres<br />estan aquí.
                    </h2>
                    <p className="text-white/80 text-base max-w-sm leading-relaxed" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.9)' }}>
                        Descubre, selecciona y compra entradas para los mejores conciertos, festivales y espectáculos según tus preferencias.                    </p>
                </div>
            </div>

            {/* Panel derecho: formulario */}
            <main className="flex-1 flex items-center justify-center px-6 py-12 bg-white">
                <div className="w-full max-w-[400px]">

                    {/* Logo solo en mobile */}
                    <div className="lg:hidden mb-8 text-center">
                        <Link to="/" className="text-2xl font-bold text-gray-900 hover:text-purple-600 transition-colors">Stay Event</Link>
                    </div>

                    {/* Encabezado */}
                    <div className="mb-8">
                        <h1 className="text-2xl font-bold text-gray-900 mb-1">Bienvenido a StayEvent</h1>
                        <p className="text-sm text-gray-600">Ingresa tus datos para continuar</p>
                    </div>

                    {/* Alerta de error */}
                    {error && (
                        <div className="flex items-center gap-2 bg-red-50 border border-red-200
                                        text-red-600 rounded-xl px-4 py-3 mb-6 text-sm">
                            <IconoAlerta />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={manejarEnvio} className="space-y-5" noValidate>

                        {/* Email */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                                Correo electrónico
                            </label>
                            <div className="relative">
                                <span aria-hidden="true" className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 pointer-events-none">
                                    <IconoEmail />
                                </span>
                                <input
                                    id="email"
                                    type="email"
                                    name="email"
                                    value={formulario.email}
                                    onChange={manejarCambio}
                                    required
                                    autoComplete="email"
                                    placeholder="correo@ejemplo.com"
                                    maxLength={100}
                                    className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl text-sm
                                               bg-gray-50 hover:bg-white focus:bg-white focus:outline-none
                                               focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                                />
                            </div>
                        </div>

                        {/* Contraseña */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                                Contraseña
                            </label>
                            <div className="relative">
                                <span aria-hidden="true" className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 pointer-events-none">
                                    <IconoCandado />
                                </span>
                                <input
                                    id="password"
                                    type={mostrarPassword ? 'text' : 'password'}
                                    name="password"
                                    value={formulario.password}
                                    onChange={manejarCambio}
                                    required
                                    autoComplete="current-password"
                                    placeholder="••••••••"
                                    maxLength={72}
                                    className="w-full pl-11 pr-12 py-3 border border-gray-200 rounded-xl text-sm
                                               bg-gray-50 hover:bg-white focus:bg-white focus:outline-none
                                               focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                                />
                                <button
                                    type="button"
                                    onClick={() => setMostrarPassword((v) => !v)}
                                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center
                                               text-gray-400 hover:text-gray-600 transition-colors"
                                    aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                >
                                    {mostrarPassword ? <IconoOjoCerrado /> : <IconoOjoAbierto />}
                                </button>
                            </div>
                        </div>

                        {/* Recordarme + ¿Olvidaste? */}
                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 rounded border-gray-300 text-purple-600
                                               focus:ring-purple-500 focus:ring-offset-0"
                                />
                                <span className="text-sm text-gray-600">Recordarme</span>
                            </label>
                            <Link
                                to="/recuperar-password"
                                className="text-sm text-purple-600 hover:text-purple-800 font-medium transition-colors"
                            >
                                ¿Olvidaste tu contraseña?
                            </Link>
                        </div>

                        {/* Botón principal */}
                        <button
                            type="submit"
                            disabled={cargando}
                            className="w-full py-3 px-4 rounded-xl font-semibold text-sm text-white
                                bg-gradient-to-r from-purple-600 to-violet-700
                                hover:from-purple-700 hover:to-violet-800
                                hover:-translate-y-0.5 active:translate-y-0
                                transition-all duration-200"
                        >
                            {cargando ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                        </button>
                    </form>

                    {/* Link a registro */}
                    <p className="text-center text-sm text-gray-600 mt-6">
                        ¿No tienes cuenta?{' '}
                        <Link
                            to="/registro"
                            className="text-purple-600 hover:text-purple-800 font-semibold transition-colors"
                        >
                            Regístrate gratis
                        </Link>
                    </p>
                </div>
            </main>
        </div>
    );
};

export default Login;
