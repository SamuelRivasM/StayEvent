import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const IconoEmail = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
);

const IconoAlerta = () => (
    <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd" />
    </svg>
);

const IconoCheckCircle = () => (
    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const IconoFlechaAtras = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
);

const RecuperarPassword = () => {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [enviado, setEnviado] = useState(false);
    const [cargando, setCargando] = useState(false);

    const manejarCambio = (e) => {
        setEmail(e.target.value);
        setError('');
    };

    const manejarEnvio = (e) => {
        e.preventDefault();

        if (!email.trim()) {
            setError('Por favor ingresa tu correo electrónico.');
            return;
        }

        const formatoEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!formatoEmail.test(email)) {
            setError('Por favor ingresa un correo electrónico válido.');
            return;
        }

        setCargando(true);

        // Simulación de envío (solo frontend por ahora)
        setTimeout(() => {
            setCargando(false);
            setEnviado(true);
        }, 1500);
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative px-4 py-12">

            {/* Fondo con imagen de evento */}
            <div
                className="absolute inset-0"
                style={{
                    backgroundImage: 'url(https://jcmagazine.com/wp-content/uploads/2022/10/fotos-concierto.jpg)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            />

            {/* Overlay oscuro suave */}
            <div className="absolute inset-0 bg-gradient-to-br from-black/75 via-purple-950/60 to-black/80" />

            {/* Logo superior */}
            <div className="absolute top-6 left-8 z-10">
                <Link to="/login" className="text-white text-xl font-bold tracking-tight hover:text-purple-300 transition-colors">
                    Stay Event
                </Link>
            </div>

            {/* Card central */}
            <div className="relative z-10 w-full max-w-md">
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 shadow-2xl">

                    {!enviado ? (
                        <>
                            {/* Encabezado */}
                            <div className="mb-7">
                                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-400/30 text-purple-300 mb-4">
                                    <IconoEmail />
                                </div>
                                <h1 className="text-2xl font-bold text-white mb-1.5">
                                    Recuperar contraseña
                                </h1>
                                <p className="text-sm text-white/60 leading-relaxed">
                                    Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
                                </p>
                            </div>

                            {/* Alerta de error */}
                            {error && (
                                <div className="flex items-center gap-2 bg-red-500/20 border border-red-400/30
                                                text-red-300 rounded-xl px-4 py-3 mb-5 text-sm">
                                    <IconoAlerta />
                                    <span>{error}</span>
                                </div>
                            )}

                            <form onSubmit={manejarEnvio} className="space-y-5" noValidate>

                                {/* Input de email */}
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-white/80 mb-1.5">
                                        Correo electrónico
                                    </label>
                                    <div className="relative">
                                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-white/40 pointer-events-none">
                                            <IconoEmail />
                                        </span>
                                        <input
                                            id="email"
                                            type="email"
                                            name="email"
                                            value={email}
                                            onChange={manejarCambio}
                                            required
                                            autoComplete="email"
                                            placeholder="correo@ejemplo.com"
                                            className="w-full pl-11 pr-4 py-3 rounded-xl text-sm text-white
                                                       bg-white/10 border border-white/20 placeholder-white/30
                                                       hover:bg-white/15 focus:bg-white/15
                                                       focus:outline-none focus:ring-2 focus:ring-purple-400
                                                       focus:border-transparent transition-colors"
                                        />
                                    </div>
                                </div>

                                {/* Botón de envío */}
                                <button
                                    type="submit"
                                    disabled={cargando}
                                    className="w-full py-3 px-4 rounded-xl font-semibold text-sm text-white
                                                bg-gradient-to-r from-purple-600 to-violet-700
                                                hover:from-purple-700 hover:to-violet-800
                                                hover:-translate-y-0.5 active:translate-y-0
                                                transition-all duration-200"
                                >
                                    {cargando ? 'Enviando...' : 'Enviar enlace de recuperación'}
                                </button>
                            </form>

                            {/* Link de regreso */}
                            <div className="mt-6 text-center">
                                <Link
                                    to="/login"
                                    className="inline-flex items-center gap-1.5 text-sm text-white/50
                                               hover:text-white/80 transition-colors"
                                >
                                    <IconoFlechaAtras />
                                    Volver al inicio de sesión
                                </Link>
                            </div>
                        </>
                    ) : (
                        /* Estado de éxito */
                        <div className="text-center py-4">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full
                                            bg-green-500/20 border border-green-400/30 text-green-400 mb-5">
                                <IconoCheckCircle />
                            </div>
                            <h2 className="text-xl font-bold text-white mb-2">
                                Correo enviado
                            </h2>
                            <p className="text-sm text-white/60 leading-relaxed mb-2">
                                Si <span className="text-white/90 font-medium">{email}</span> está registrado,
                                recibirás un enlace para restablecer tu contraseña.
                            </p>
                            <p className="text-xs text-white/40 mb-7">
                                Revisa también tu carpeta de spam.
                            </p>
                            <Link
                                to="/login"
                                className="inline-flex items-center gap-2 py-2.5 px-5 rounded-xl text-sm font-semibold
                                           text-white bg-white/10 border border-white/20
                                           hover:bg-white/20 transition-colors"
                            >
                                <IconoFlechaAtras />
                                Volver al inicio de sesión
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RecuperarPassword;
