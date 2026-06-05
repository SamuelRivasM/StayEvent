import React, { useState, useEffect } from 'react';
import Navbar from '../componentes/Navbar';
import api from '../servicios/api';
import { useAuth } from '../context/AuthContext';

const PAISES = [
    { codigo: '+51', label: 'PE +51', digitos: 9, placeholder: '999999999' },
    { codigo: '+56', label: 'CL +56', digitos: 9, placeholder: '912345678' },
    { codigo: '+54', label: 'AR +54', digitos: 10, placeholder: '1123456789' },
    { codigo: '+57', label: 'CO +57', digitos: 10, placeholder: '3001234567' },
    { codigo: '+52', label: 'MX +52', digitos: 10, placeholder: '5512345678' },
    { codigo: '+593', label: 'EC +593', digitos: 9, placeholder: '991234567' },
    { codigo: '+591', label: 'BO +591', digitos: 8, placeholder: '71234567' },
    { codigo: '+598', label: 'UY +598', digitos: 8, placeholder: '91234567' },
    { codigo: '+595', label: 'PY +595', digitos: 9, placeholder: '981234567' },
];

const CODIGOS_ORDENADOS = ['+593', '+591', '+598', '+595', '+51', '+56', '+54', '+57', '+52'];

function parseTelefono(telefonoCompleto) {
    if (!telefonoCompleto) return { codigoPais: '+51', telefono: '' };
    for (const codigo of CODIGOS_ORDENADOS) {
        if (telefonoCompleto.startsWith(codigo)) {
            return { codigoPais: codigo, telefono: telefonoCompleto.slice(codigo.length) };
        }
    }
    return { codigoPais: '+51', telefono: telefonoCompleto };
}

// Local part: letras/dígitos y . _ % + - ; dominio sin espacios ni chars inválidos; TLD solo letras, mínimo 2
const REGEX_EMAIL = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const REGEX_CARACTER_ESPECIAL = /[$%#]/;
const REGEX_SOLO_NUMEROS = /^\d+$/;

const labelCls = 'block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5';
const inputCls = 'w-full px-4 py-2.5 bg-white/[0.05] text-sm text-white placeholder-gray-600 border border-white/[0.08] focus:outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/30 transition-colors';
const selectCls = 'px-3 py-2.5 bg-gray-800/90 text-sm text-white border border-white/[0.08] focus:outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/30 transition-colors appearance-none cursor-pointer';

const ConfigurarPerfil = () => {
    const { actualizarDatosUsuario } = useAuth();

    const [formulario, setFormulario] = useState({
        nombre: '', apellido: '', email: '', codigoPais: '+51', telefono: '',
    });
    const [passForm, setPassForm] = useState({
        passwordActual: '', passwordNueva: '', confirmarPassword: '',
    });
    const paisActual = PAISES.find(p => p.codigo === formulario.codigoPais) || PAISES[0];

    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');
    const [exito, setExito] = useState('');

    useEffect(() => {
        const cargarPerfil = async () => {
            try {
                const res = await api.get('/auth/me');
                const u = res.data.usuario;
                const { codigoPais, telefono } = parseTelefono(u.telefono);
                setFormulario({
                    nombre: u.nombre || '',
                    apellido: u.apellido || '',
                    email: u.email || '',
                    codigoPais,
                    telefono,
                });
            } catch {
                setError('Error al cargar el perfil. Intenta recargar la página.');
            } finally {
                setCargando(false);
            }
        };
        cargarPerfil();
    }, []);

    const manejarCambio = (e) => {
        const { name, value } = e.target;
        let formatted = value;
        if (name === 'nombre' || name === 'apellido') {
            formatted = value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚüÜñÑ '-]/g, '').slice(0, 50);
        }
        setFormulario(prev => ({
            ...prev,
            [name]: formatted,
            // Al cambiar el país se borra el teléfono para evitar longitudes inválidas
            ...(name === 'codigoPais' ? { telefono: '' } : {}),
        }));
        setError('');
        setExito('');
    };

    const manejarCambioTelefono = (e) => {
        const soloNumeros = e.target.value.replace(/\D/g, '').slice(0, paisActual.digitos);
        setFormulario(prev => ({ ...prev, telefono: soloNumeros }));
        setError('');
        setExito('');
    };

    const manejarCambioPass = (e) => {
        setPassForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
        setError('');
        setExito('');
    };

    const validar = () => {
        if (!formulario.nombre.trim() || !formulario.apellido.trim() || !formulario.email.trim()) {
            return 'Nombre, apellido y email son obligatorios.';
        }
        if (formulario.nombre.trim().length < 2 || formulario.apellido.trim().length < 2) {
            return 'Nombre y apellido deben tener al menos 2 caracteres.';
        }
        if (formulario.nombre.trim().length > 50 || formulario.apellido.trim().length > 50) {
            return 'Nombre y apellido no deben exceder 50 caracteres.';
        }
        const REGEX_NOMBRE = /^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ '-]+$/;
        if (!REGEX_NOMBRE.test(formulario.nombre.trim())) {
            return 'El nombre solo puede contener letras, espacios, apóstrofes y guiones.';
        }
        if (!REGEX_NOMBRE.test(formulario.apellido.trim())) {
            return 'El apellido solo puede contener letras, espacios, apóstrofes y guiones.';
        }
        if (!REGEX_EMAIL.test(formulario.email.trim())) {
            return 'Ingresa un email válido.';
        }
        if (!formulario.telefono.trim()) {
            return 'El teléfono es obligatorio.';
        }
        if (!REGEX_SOLO_NUMEROS.test(formulario.telefono.trim())) {
            return 'El teléfono solo debe contener números.';
        }
        if (formulario.telefono.trim().length !== paisActual.digitos) {
            return `El teléfono debe tener exactamente ${paisActual.digitos} dígitos para ${paisActual.label.split(' ')[0]}.`;
        }
        const cambiandoPass = passForm.passwordActual || passForm.passwordNueva || passForm.confirmarPassword;
        if (cambiandoPass) {
            if (!passForm.passwordActual || !passForm.passwordNueva || !passForm.confirmarPassword) {
                return 'Para cambiar la contraseña completa todos los campos de contraseña.';
            }
            if (passForm.passwordNueva !== passForm.confirmarPassword) {
                return 'La nueva contraseña y su confirmación no coinciden.';
            }
            if (passForm.passwordNueva.length < 8) {
                return 'La nueva contraseña debe tener al menos 8 caracteres.';
            }
            if (passForm.passwordNueva.length > 72) {
                return 'La contraseña no debe exceder 72 caracteres.';
            }
            if (!REGEX_CARACTER_ESPECIAL.test(passForm.passwordNueva)) {
                return 'La nueva contraseña debe contener al menos un carácter especial ($, %, #).';
            }
        }
        return null;
    };

    const manejarEnvio = async (e) => {
        e.preventDefault();
        const errValidacion = validar();
        if (errValidacion) {
            setError(errValidacion);
            return;
        }

        setGuardando(true);
        setError('');
        setExito('');

        const datos = {
            nombre: formulario.nombre.trim(),
            apellido: formulario.apellido.trim(),
            email: formulario.email.trim(),
            codigoPais: formulario.codigoPais,
            telefono: formulario.telefono.trim(),
        };

        const cambiandoPass = passForm.passwordActual || passForm.passwordNueva || passForm.confirmarPassword;
        if (cambiandoPass) {
            datos.passwordActual = passForm.passwordActual;
            datos.passwordNueva = passForm.passwordNueva;
            datos.confirmarPassword = passForm.confirmarPassword;
        }

        try {
            const res = await api.put('/usuarios/perfil', datos);
            actualizarDatosUsuario(res.data.usuario);
            setExito('Perfil actualizado correctamente.');
            setPassForm({ passwordActual: '', passwordNueva: '', confirmarPassword: '' });
        } catch (err) {
            setError(err.response?.data?.mensaje || 'Error al actualizar el perfil.');
        } finally {
            setGuardando(false);
        }
    };

    if (cargando) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <p className="text-gray-500 text-sm">Cargando...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-950">
            <Navbar />

            <main className="pt-24 pb-16 px-4">
                <div className="max-w-xl mx-auto">

                    <h1 className="text-xl font-bold text-white mb-6">Configurar perfil</h1>

                    {error && (
                        <div className="mb-5 px-4 py-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                            {error}
                        </div>
                    )}
                    {exito && (
                        <div className="mb-5 px-4 py-3 bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
                            {exito}
                        </div>
                    )}

                    <form onSubmit={manejarEnvio} noValidate className="space-y-5">

                        {/* Información personal */}
                        <div className="bg-white/[0.03] border border-white/[0.07] p-6 space-y-4">
                            <h2 className="text-sm font-semibold text-white">Información personal</h2>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={labelCls}>Nombre</label>
                                    <input
                                        type="text"
                                        name="nombre"
                                        value={formulario.nombre}
                                        onChange={manejarCambio}
                                        maxLength={50}
                                        placeholder="Tu nombre"
                                        className={inputCls}
                                        autoComplete="given-name"
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>Apellido</label>
                                    <input
                                        type="text"
                                        name="apellido"
                                        value={formulario.apellido}
                                        onChange={manejarCambio}
                                        maxLength={50}
                                        placeholder="Tu apellido"
                                        className={inputCls}
                                        autoComplete="family-name"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className={labelCls}>Email</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formulario.email}
                                    onChange={manejarCambio}
                                    maxLength={100}
                                    placeholder="correo@ejemplo.com"
                                    className={inputCls}
                                    autoComplete="email"
                                />
                            </div>

                            <div>
                                <label className={labelCls}>Teléfono</label>
                                <div className="flex gap-2">
                                    <select
                                        name="codigoPais"
                                        value={formulario.codigoPais}
                                        onChange={manejarCambio}
                                        className={selectCls}
                                    >
                                        {PAISES.map(p => (
                                            <option key={p.codigo} value={p.codigo}>{p.label}</option>
                                        ))}
                                    </select>
                                    <input
                                        type="tel"
                                        name="telefono"
                                        value={formulario.telefono}
                                        onChange={manejarCambioTelefono}
                                        maxLength={paisActual.digitos}
                                        placeholder={paisActual.placeholder}
                                        className={`${inputCls} flex-1`}
                                        autoComplete="tel-national"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Cambiar contraseña */}
                        <div className="bg-white/[0.03] border border-white/[0.07] p-6 space-y-4">
                            <div>
                                <h2 className="text-sm font-semibold text-white">Cambiar contraseña</h2>
                                <p className="text-xs text-gray-600 mt-1">
                                    Deja estos campos en blanco si no quieres cambiar la contraseña.
                                </p>
                            </div>

                            <div>
                                <label className={labelCls}>Contraseña actual</label>
                                <input
                                    type="password"
                                    name="passwordActual"
                                    value={passForm.passwordActual}
                                    onChange={manejarCambioPass}
                                    placeholder="••••••••"
                                    className={inputCls}
                                    autoComplete="current-password"
                                />
                            </div>

                            <div>
                                <label className={labelCls}>Nueva contraseña</label>
                                <input
                                    type="password"
                                    name="passwordNueva"
                                    value={passForm.passwordNueva}
                                    onChange={manejarCambioPass}
                                    placeholder="••••••••"
                                    className={inputCls}
                                    autoComplete="new-password"
                                />
                            </div>

                            <div>
                                <label className={labelCls}>Confirmar nueva contraseña</label>
                                <input
                                    type="password"
                                    name="confirmarPassword"
                                    value={passForm.confirmarPassword}
                                    onChange={manejarCambioPass}
                                    placeholder="••••••••"
                                    className={inputCls}
                                    autoComplete="new-password"
                                />
                                {passForm.passwordNueva && passForm.confirmarPassword && passForm.passwordNueva !== passForm.confirmarPassword && (
                                    <p className="mt-1.5 text-xs text-red-400">Las contraseñas no coinciden.</p>
                                )}
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={guardando}
                            className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {guardando ? 'Guardando...' : 'Guardar cambios'}
                        </button>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default ConfigurarPerfil;
