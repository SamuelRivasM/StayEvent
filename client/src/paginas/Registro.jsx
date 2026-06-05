import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../servicios/api';

const RUTA_POR_ROL = {
    admin: '/admin',
    usuario: '/',
    organizador: '/',
};

const camposIniciales = {
    nombre: '',
    apellido: '',
    email: '',
    password: '',
    confirmarPassword: '',
    telefono: '',
};

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REGEX_CARACTER_ESPECIAL = /[$%#]/;
const REGEX_SOLO_NUMEROS = /^\d+$/;

const PAISES_LATAM = [
    { codigo: '+51', nombre: 'Perú', bandera: '🇵🇪', digitos: 9, placeholder: '999999999' },
    { codigo: '+56', nombre: 'Chile', bandera: '🇨🇱', digitos: 9, placeholder: '912345678' },
    { codigo: '+54', nombre: 'Argentina', bandera: '🇦🇷', digitos: 10, placeholder: '1123456789' },
    { codigo: '+57', nombre: 'Colombia', bandera: '🇨🇴', digitos: 10, placeholder: '3001234567' },
    { codigo: '+52', nombre: 'México', bandera: '🇲🇽', digitos: 10, placeholder: '5512345678' },
    { codigo: '+593', nombre: 'Ecuador', bandera: '🇪🇨', digitos: 9, placeholder: '991234567' },
    { codigo: '+591', nombre: 'Bolivia', bandera: '🇧🇴', digitos: 8, placeholder: '71234567' },
    { codigo: '+598', nombre: 'Uruguay', bandera: '🇺🇾', digitos: 8, placeholder: '91234567' },
    { codigo: '+595', nombre: 'Paraguay', bandera: '🇵🇾', digitos: 9, placeholder: '981234567' },
];

// Iconos

const IconoUsuario = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
);

const IconoEmail = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
);

const IconoTelefono = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
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

// Estilos compartidos

const claseInput = `w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl text-sm
                    bg-gray-50 hover:bg-white focus:bg-white focus:outline-none
                    focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors`;

// Componente principal

const Registro = () => {
    const [formulario, setFormulario] = useState(camposIniciales);
    const [codigoPais, setCodigoPais] = useState('+51');
    const [error, setError] = useState('');
    const [cargando, setCargando] = useState(false);
    const [mostrarPassword, setMostrarPassword] = useState(false);
    const [mostrarConfirmar, setMostrarConfirmar] = useState(false);

    const paisActual = PAISES_LATAM.find(p => p.codigo === codigoPais) || PAISES_LATAM[0];

    const { iniciarSesion } = useAuth();
    const navigate = useNavigate();

    // Autenticación

    const manejarCambio = (e) => {
        const { name, value } = e.target;
        let formatted = value;
        if (name === 'nombre' || name === 'apellido') {
            formatted = value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚüÜñÑ '-]/g, '').slice(0, 50);
        }
        setFormulario((prev) => ({ ...prev, [name]: formatted }));
        setError('');
    };

    const validarFormulario = () => {
        const nombre = formulario.nombre.trim();
        const apellido = formulario.apellido.trim();
        const email = formulario.email.trim();
        const telefono = formulario.telefono.trim();

        if (!nombre || !apellido) {
            return 'Nombre y apellido son obligatorios.';
        }
        if (nombre.length < 2 || apellido.length < 2) {
            return 'Nombre y apellido deben tener al menos 2 caracteres.';
        }
        if (nombre.length > 50 || apellido.length > 50) {
            return 'Nombre y apellido no deben exceder 50 caracteres.';
        }
        const REGEX_NOMBRE = /^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ '-]+$/;
        if (!REGEX_NOMBRE.test(nombre)) {
            return 'El nombre solo puede contener letras, espacios, apóstrofes y guiones.';
        }
        if (!REGEX_NOMBRE.test(apellido)) {
            return 'El apellido solo puede contener letras, espacios, apóstrofes y guiones.';
        }
        if (!email) {
            return 'El correo electrónico es obligatorio.';
        }
        if (!REGEX_EMAIL.test(email)) {
            return 'El formato del correo electrónico no es válido.';
        }
        if (!formulario.password) {
            return 'La contraseña es obligatoria.';
        }
        if (formulario.password.length < 8) {
            return 'La contraseña debe tener al menos 8 caracteres.';
        }
        if (!REGEX_CARACTER_ESPECIAL.test(formulario.password)) {
            return 'La contraseña debe contener al menos un carácter especial ($, %, #).';
        }
        if (!formulario.confirmarPassword) {
            return 'Debes confirmar tu contraseña.';
        }
        if (formulario.password !== formulario.confirmarPassword) {
            return 'Las contraseñas no coinciden.';
        }
        if (!telefono) {
            return 'El teléfono es obligatorio.';
        }
        if (!REGEX_SOLO_NUMEROS.test(telefono)) {
            return 'El teléfono solo debe contener números.';
        }
        if (telefono.length !== paisActual.digitos) {
            return `El teléfono debe tener exactamente ${paisActual.digitos} dígitos para ${paisActual.nombre}.`;
        }
        return null;
    };

    const manejarCambioPais = (e) => {
        setCodigoPais(e.target.value);
        setFormulario((prev) => ({ ...prev, telefono: '' }));
        setError('');
    };

    const manejarCambioTelefono = (e) => {
        const soloNumeros = e.target.value.replace(/\D/g, '').slice(0, paisActual.digitos);
        setFormulario((prev) => ({ ...prev, telefono: soloNumeros }));
        setError('');
    };

    const manejarEnvio = async (e) => {
        e.preventDefault();
        setError('');

        const errorValidacion = validarFormulario();
        if (errorValidacion) {
            setError(errorValidacion);
            return;
        }

        setCargando(true);

        try {
            const datosEnvio = {
                nombre: formulario.nombre.trim(),
                apellido: formulario.apellido.trim(),
                email: formulario.email.trim().toLowerCase(),
                password: formulario.password,
                codigoPais,
                telefono: formulario.telefono.trim(),
            };
            const respuesta = await api.post('/auth/register', datosEnvio);
            const { token, usuario } = respuesta.data;
            iniciarSesion(token, usuario);
            navigate(RUTA_POR_ROL[usuario.rol] || '/usuario', { replace: true });
        } catch (err) {
            setError(err.response?.data?.mensaje || 'Error al registrarse. Inténtalo nuevamente.');
        } finally {
            setCargando(false);
        }
    };

    // Renderizado

    return (
        <div className="min-h-screen flex">

            {/* Panel izquierdo: imagen de evento */}
            <div
                className="hidden lg:flex lg:w-[58%] relative flex-col justify-between p-12"
                style={{
                    backgroundImage: 'url(https://www.tarracoarena.com/wp-content/uploads/2023/06/2023-Concierto-TarracoArena.jpg   )',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            >
                {/* Overlay degradado */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-900/80 via-black/60 to-black/80" />

                {/* Logo superior */}
                <div className="relative z-10">
                    <Link to="/" className="text-white text-xl font-bold tracking-tight hover:text-purple-200 transition-colors">Stay Event</Link>
                </div>

                {/* Texto inferior */}
                <div className="relative z-10">
                    <h2 className="text-4xl font-bold text-white mb-4 leading-tight">
                        Empieza tu aventura en el mundo de<br /> eventos y elige tus preferencias
                    </h2>
                    <p className="text-white/60 text-base max-w-sm leading-relaxed">
                        Crea tu cuenta gratis y accede a los mejores conciertos, festivales y espectáculos en vivo.
                    </p>
                </div>
            </div>

            {/* Panel derecho: formulario */}
            <div className="flex-1 flex items-center justify-center px-6 py-10 bg-white overflow-y-auto">
                <div className="w-full max-w-[400px]">

                    {/* Logo solo en mobile */}
                    <div className="lg:hidden mb-8 text-center">
                        <Link to="/" className="text-2xl font-bold text-gray-900 hover:text-purple-600 transition-colors">Stay Event</Link>
                    </div>

                    {/* Encabezado */}
                    <div className="mb-7">
                        <h1 className="text-2xl font-bold text-gray-900 mb-1">Crear una cuenta</h1>
                        <p className="text-sm text-gray-500">Rellena el siguiente formulario con tus datos para continuar</p>
                    </div>

                    {/* Alerta de error */}
                    {error && (
                        <div className="flex items-center gap-2 bg-red-50 border border-red-200
                                        text-red-600 rounded-xl px-4 py-3 mb-5 text-sm">
                            <IconoAlerta />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={manejarEnvio} className="space-y-4" noValidate>

                        {/* Nombre + Apellido */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Nombre
                                </label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 pointer-events-none">
                                        <IconoUsuario />
                                    </span>
                                    <input
                                        id="nombre"
                                        type="text"
                                        name="nombre"
                                        value={formulario.nombre}
                                        onChange={manejarCambio}
                                        required
                                        autoComplete="given-name"
                                        placeholder="Rodrigo"
                                        className={claseInput}
                                    />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="apellido" className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Apellido
                                </label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 pointer-events-none">
                                        <IconoUsuario />
                                    </span>
                                    <input
                                        id="apellido"
                                        type="text"
                                        name="apellido"
                                        value={formulario.apellido}
                                        onChange={manejarCambio}
                                        required
                                        autoComplete="family-name"
                                        placeholder="Huamani"
                                        className={claseInput}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Email */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                                Correo electrónico
                            </label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 pointer-events-none">
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
                                    className={claseInput}
                                />
                            </div>
                        </div>

                        {/* Teléfono */}
                        <div>
                            <label htmlFor="telefono" className="block text-sm font-medium text-gray-700 mb-1.5">
                                Teléfono
                            </label>
                            <div className="flex rounded-xl border border-gray-200 overflow-hidden bg-gray-50 hover:bg-white focus-within:bg-white focus-within:ring-2 focus-within:ring-purple-500 focus-within:border-transparent transition-colors">
                                <span className="flex items-center pl-3.5 text-gray-400 pointer-events-none shrink-0">
                                    <IconoTelefono />
                                </span>
                                <select
                                    value={codigoPais}
                                    onChange={manejarCambioPais}
                                    aria-label="Código de país"
                                    className="shrink-0 bg-transparent border-r border-gray-200 pl-2 pr-1 py-3 text-sm text-gray-700 focus:outline-none cursor-pointer"
                                >
                                    {PAISES_LATAM.map(p => (
                                        <option key={p.codigo} value={p.codigo}>
                                            {p.bandera} {p.codigo}
                                        </option>
                                    ))}
                                </select>
                                <input
                                    id="telefono"
                                    type="tel"
                                    name="telefono"
                                    value={formulario.telefono}
                                    onChange={manejarCambioTelefono}
                                    required
                                    maxLength={paisActual.digitos}
                                    autoComplete="tel"
                                    placeholder={paisActual.placeholder}
                                    className="flex-1 pl-3 pr-4 py-3 bg-transparent text-sm focus:outline-none"
                                />
                            </div>
                        </div>

                        {/* Contraseña */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                                Contraseña
                            </label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 pointer-events-none">
                                    <IconoCandado />
                                </span>
                                <input
                                    id="password"
                                    type={mostrarPassword ? 'text' : 'password'}
                                    name="password"
                                    value={formulario.password}
                                    onChange={manejarCambio}
                                    required
                                    autoComplete="new-password"
                                    placeholder="Mínimo 8 caracteres"
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

                        {/* Confirmar Contraseña */}
                        <div>
                            <label htmlFor="confirmarPassword" className="block text-sm font-medium text-gray-700 mb-1.5">
                                Confirmar Contraseña
                            </label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 pointer-events-none">
                                    <IconoCandado />
                                </span>
                                <input
                                    id="confirmarPassword"
                                    type={mostrarConfirmar ? 'text' : 'password'}
                                    name="confirmarPassword"
                                    value={formulario.confirmarPassword}
                                    onChange={manejarCambio}
                                    required
                                    autoComplete="new-password"
                                    placeholder="••••••••"
                                    className="w-full pl-11 pr-12 py-3 border border-gray-200 rounded-xl text-sm
                                               bg-gray-50 hover:bg-white focus:bg-white focus:outline-none
                                               focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                                />
                                <button
                                    type="button"
                                    onClick={() => setMostrarConfirmar((v) => !v)}
                                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center
                                               text-gray-400 hover:text-gray-600 transition-colors"
                                    aria-label={mostrarConfirmar ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                >
                                    {mostrarConfirmar ? <IconoOjoCerrado /> : <IconoOjoAbierto />}
                                </button>
                            </div>
                        </div>

                        {/* Botón principal */}
                        <button
                            type="submit"
                            disabled={cargando}
                            className={`w-full py-3 px-4 rounded-xl font-semibold text-sm text-white
                                bg-gradient-to-r from-purple-600 to-violet-700
                                hover:from-purple-700 hover:to-violet-800
                                hover:-translate-y-0.5 active:translate-y-0
                                transition-all duration-200
                                ${cargando ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                            {cargando ? 'Creando cuenta...' : 'Crear Cuenta'}
                        </button>
                    </form>

                    {/* Link a login */}
                    <p className="text-center text-sm text-gray-500 mt-5">
                        ¿Ya tienes cuenta?{' '}
                        <Link
                            to="/login"
                            className="text-purple-600 hover:text-purple-800 font-semibold transition-colors"
                        >
                            Inicia sesión
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Registro;
