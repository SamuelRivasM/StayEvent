import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import api from '../servicios/api';
import { useAuth } from '../context/AuthContext';

// ─── Animaciones ──────────────────────────────────────────────────────────────

const KEYFRAMES = `
    @keyframes fadeScaleIn {
        from { opacity: 0; transform: scale(0.97); }
        to   { opacity: 1; transform: scale(1);    }
    }
    @keyframes overlayIn {
        from { opacity: 0; }
        to   { opacity: 1; }
    }
    @keyframes toastIn {
        from { opacity: 0; transform: translateY(10px); }
        to   { opacity: 1; transform: translateY(0);    }
    }
`;

const ANIM_OVERLAY = { animation: 'overlayIn 0.18s ease', willChange: 'opacity' };
const ANIM_SCALE   = { animation: 'fadeScaleIn 0.18s cubic-bezier(0.4, 0, 0.2, 1)', willChange: 'transform, opacity' };

// ─── Estilos compartidos ──────────────────────────────────────────────────────

const labelCls  = 'block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5';
const inputCls  = 'w-full px-4 py-2.5 bg-white/[0.05] text-sm text-white placeholder-gray-500 border border-white/[0.08] focus:outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/30 transition-colors';
const selectCls = 'w-full px-4 py-2.5 bg-gray-800/90 text-sm text-white border border-white/[0.08] focus:outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/30 transition-colors appearance-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';

// ─── Constantes ───────────────────────────────────────────────────────────────

const REGEX_EMAIL            = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REGEX_CARACTER_ESPECIAL = /[$%#]/;
const REGEX_SOLO_NUMEROS     = /^\d+$/;
const REGEX_NOMBRE           = /^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ '-]+$/;

const PAISES_LATAM = [
    { codigo: '+51',  nombre: 'Perú',      bandera: '🇵🇪', digitos: 9,  placeholder: '999999999'  },
    { codigo: '+56',  nombre: 'Chile',     bandera: '🇨🇱', digitos: 9,  placeholder: '912345678'  },
    { codigo: '+54',  nombre: 'Argentina', bandera: '🇦🇷', digitos: 10, placeholder: '1123456789' },
    { codigo: '+57',  nombre: 'Colombia',  bandera: '🇨🇴', digitos: 10, placeholder: '3001234567' },
    { codigo: '+52',  nombre: 'México',    bandera: '🇲🇽', digitos: 10, placeholder: '5512345678' },
    { codigo: '+593', nombre: 'Ecuador',   bandera: '🇪🇨', digitos: 9,  placeholder: '991234567'  },
    { codigo: '+591', nombre: 'Bolivia',   bandera: '🇧🇴', digitos: 8,  placeholder: '71234567'   },
    { codigo: '+598', nombre: 'Uruguay',   bandera: '🇺🇾', digitos: 8,  placeholder: '91234567'   },
    { codigo: '+595', nombre: 'Paraguay',  bandera: '🇵🇾', digitos: 9,  placeholder: '981234567'  },
];

const FORM_EDITAR_VACIO = { nombre: '', apellido: '', telefono: '', rol: 'usuario', password: '' };

const FORM_CREAR_VACIO = {
    nombre: '', apellido: '', email: '',
    password: '', confirmarPassword: '',
    codigoPais: '+51', telefono: '', rol: 'usuario',
};

const FILTROS_ROL = [
    { valor: 'todos',       label: 'Todos'         },
    { valor: 'usuario',     label: 'Usuario'       },
    { valor: 'organizador', label: 'Organizador'   },
    { valor: 'admin',       label: 'Administrador' },
];

// ─── Validación del formulario de creación ────────────────────────────────────

const validarFormularioCrear = (f) => {
    const pais     = PAISES_LATAM.find(p => p.codigo === f.codigoPais) || PAISES_LATAM[0];
    const nombre   = f.nombre.trim();
    const apellido = f.apellido.trim();
    const email    = f.email.trim();
    const telefono = f.telefono.trim();

    if (!nombre || !apellido)                       return 'Nombre y apellido son obligatorios.';
    if (nombre.length < 2 || apellido.length < 2)   return 'Nombre y apellido deben tener al menos 2 caracteres.';
    if (nombre.length > 50 || apellido.length > 50) return 'Nombre y apellido no deben exceder 50 caracteres.';
    if (!REGEX_NOMBRE.test(nombre))                 return 'El nombre solo puede contener letras, espacios, apóstrofes y guiones.';
    if (!REGEX_NOMBRE.test(apellido))               return 'El apellido solo puede contener letras, espacios, apóstrofes y guiones.';
    if (!email)                                     return 'El correo electrónico es obligatorio.';
    if (!REGEX_EMAIL.test(email))                   return 'El formato del correo electrónico no es válido.';
    if (!f.password)                                return 'La contraseña es obligatoria.';
    if (f.password.length < 8)                      return 'La contraseña debe tener al menos 8 caracteres.';
    if (!REGEX_CARACTER_ESPECIAL.test(f.password))  return 'La contraseña debe contener al menos un carácter especial ($, %, #).';
    if (!f.confirmarPassword)                       return 'Debes confirmar la contraseña.';
    if (f.password !== f.confirmarPassword)         return 'Las contraseñas no coinciden.';
    if (!telefono)                                  return 'El teléfono es obligatorio.';
    if (!REGEX_SOLO_NUMEROS.test(telefono))         return 'El teléfono solo debe contener números.';
    if (telefono.length !== pais.digitos)
        return `El teléfono debe tener exactamente ${pais.digitos} dígitos para ${pais.nombre}.`;
    if (!['admin', 'usuario', 'organizador'].includes(f.rol)) return 'Selecciona un rol válido.';
    return null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatFecha = (fecha) => {
    if (!fecha) return '—';
    return new Date(fecha).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
};

// ─── Subcomponentes ───────────────────────────────────────────────────────────

const BadgeRol = ({ rol }) => {
    if (rol === 'organizador') return (
        <span className="text-xs px-2.5 py-0.5 font-medium border bg-purple-500/[0.08] text-purple-400 border-purple-500/20">
            Organizador
        </span>
    );
    if (rol === 'admin') return (
        <span className="text-xs px-2.5 py-0.5 font-medium border bg-white/[0.04] text-gray-400 border-white/[0.12]">
            Administrador
        </span>
    );
    return (
        <span className="text-xs px-2.5 py-0.5 font-medium border bg-blue-500/[0.08] text-blue-400 border-blue-500/20">
            Usuario
        </span>
    );
};

const CampoDetalle = ({ label, value }) => (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-white/[0.04]">
        <span className="text-xs text-gray-500 uppercase tracking-widest shrink-0">{label}</span>
        <span className="text-sm text-gray-300 text-right break-all">{value || '—'}</span>
    </div>
);

const IconoOjo = ({ visible }) => visible ? (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
) : (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
);

const AlertaError = ({ mensaje }) => (
    <div className="bg-red-500/[0.08] border border-red-500/20 text-red-400 px-4 py-3 text-sm flex items-start gap-2">
        <svg className="w-4 h-4 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
        <span>{mensaje}</span>
    </div>
);

// esSelf: indica que esta fila corresponde al admin autenticado
const FilaUsuario = React.memo(({ numero, usuario, onDetalle, onEditar, onEliminar, esSelf }) => (
    <tr className="border-b border-white/[0.04] hover:bg-white/[0.025] transition-colors">
        <td className="pl-5 pr-2 py-4 text-gray-400 text-sm tabular-nums text-center w-10">{numero}</td>
        <td className="px-4 py-4">
            <div className="flex items-center gap-2">
                <p className="font-medium text-white leading-snug">{usuario.nombre} {usuario.apellido}</p>
                {esSelf && (
                    <span className="text-xs px-1.5 py-0.5 bg-purple-500/[0.12] text-purple-400 border border-purple-500/20 leading-none">
                        Tú
                    </span>
                )}
            </div>
        </td>
        <td className="px-4 py-4 text-gray-500 text-sm hidden sm:table-cell max-w-[200px] truncate">{usuario.email}</td>
        <td className="px-4 py-4 text-gray-500 text-sm hidden md:table-cell whitespace-nowrap">{usuario.telefono || '—'}</td>
        <td className="px-4 py-4"><BadgeRol rol={usuario.rol} /></td>
        <td className="px-4 py-4 text-gray-500 text-sm hidden lg:table-cell whitespace-nowrap">{formatFecha(usuario.created_at)}</td>
        <td className="px-5 py-4">
            <div className="flex items-center justify-end gap-1">
                {/* Ver detalle */}
                <button
                    onClick={() => onDetalle(usuario)}
                    title="Ver detalle"
                    className="p-2 text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                </button>

                {/* Editar — disponible para todos los usuarios */}
                <button
                    onClick={() => onEditar(usuario)}
                    title="Editar usuario"
                    className="p-2 text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                </button>

                {/* Eliminar — deshabilitado para la propia cuenta */}
                <button
                    onClick={() => !esSelf && onEliminar(usuario)}
                    title={esSelf ? 'No puedes eliminar tu propia cuenta' : 'Eliminar usuario'}
                    disabled={esSelf}
                    className={`p-2 transition-colors ${
                        esSelf
                            ? 'text-gray-700 cursor-not-allowed'
                            : 'text-gray-400 hover:text-red-400 hover:bg-red-400/[0.06]'
                    }`}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            </div>
        </td>
    </tr>
));

// ─── Componente principal ─────────────────────────────────────────────────────

const AdminUsuarios = () => {
    const { usuario: usuarioActual } = useAuth();

    const [usuarios, setUsuarios]       = useState([]);
    const [cargando, setCargando]       = useState(true);
    const [errorPagina, setErrorPagina] = useState('');

    const [busqueda, setBusqueda]   = useState('');
    const [filtroRol, setFiltroRol] = useState('todos');

    // ── Modal Detalle ────────────────────────────────────────
    const [modalDetalle, setModalDetalle] = useState(null);

    // ── Modal Editar ─────────────────────────────────────────
    const [modalEditar, setModalEditar] = useState(null);
    const [formulario, setFormulario]   = useState(FORM_EDITAR_VACIO);
    const [guardando, setGuardando]     = useState(false);
    const [errorModal, setErrorModal]   = useState('');

    // ── Modal Crear ──────────────────────────────────────────
    const [modalCrear, setModalCrear]           = useState(false);
    const [formularioCrear, setFormularioCrear] = useState(FORM_CREAR_VACIO);
    const [creando, setCreando]                 = useState(false);
    const [errorModalCrear, setErrorModalCrear] = useState('');
    const [mostrarPassCrear, setMostrarPassCrear] = useState(false);
    const [mostrarConfCrear, setMostrarConfCrear] = useState(false);

    // ── Modal Eliminar ───────────────────────────────────────
    const [modalEliminar, setModalEliminar] = useState(null);
    const [eliminando, setEliminando]       = useState(false);

    // ── Toast tipado ─────────────────────────────────────────
    const [toast, setToast]   = useState(null);
    const toastTimerRef        = useRef(null);
    const formularioRef        = useRef(formulario);
    formularioRef.current      = formulario;
    const modalEditarRef       = useRef(modalEditar);
    modalEditarRef.current     = modalEditar;

    useEffect(() => () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); }, []);

    const mostrarToast = useCallback((msg, tipo = 'exito') => {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        setToast({ msg, tipo });
        toastTimerRef.current = setTimeout(() => setToast(null), 3500);
    }, []);

    // ── Carga de datos ───────────────────────────────────────
    const cargarUsuarios = useCallback(async () => {
        setCargando(true);
        setErrorPagina('');
        try {
            const { data } = await api.get('/admin/usuarios');
            setUsuarios(data.usuarios || []);
        } catch {
            setErrorPagina('No se pudieron cargar los usuarios. Verifica tu conexión.');
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => { cargarUsuarios(); }, [cargarUsuarios]);

    // ── Filtrado en tiempo real ──────────────────────────────
    const usuariosFiltrados = useMemo(() => {
        let lista = usuarios;
        if (filtroRol !== 'todos') lista = lista.filter(u => u.rol === filtroRol);
        const q = busqueda.trim().toLowerCase();
        if (q) {
            lista = lista.filter(u =>
                u.nombre?.toLowerCase().includes(q) ||
                u.apellido?.toLowerCase().includes(q) ||
                u.email?.toLowerCase().includes(q) ||
                (u.telefono || '').toLowerCase().includes(q)
            );
        }
        return lista;
    }, [usuarios, busqueda, filtroRol]);

    const hayFiltrosActivos = busqueda !== '' || filtroRol !== 'todos';
    const limpiarFiltros = useCallback(() => { setBusqueda(''); setFiltroRol('todos'); }, []);

    // ── Detalle ──────────────────────────────────────────────
    const abrirDetalle  = useCallback((u) => setModalDetalle(u), []);
    const cerrarDetalle = useCallback(() => setModalDetalle(null), []);

    // ── Editar ───────────────────────────────────────────────
    const abrirEditar = useCallback((u) => {
        setFormulario({
            nombre:   u.nombre   || '',
            apellido: u.apellido || '',
            telefono: u.telefono || '',
            rol:      u.rol      || 'usuario',
            password: '',
        });
        setErrorModal('');
        setModalEditar(u);
    }, []);

    const cerrarEditar = useCallback(() => {
        setModalEditar(null);
        setFormulario(FORM_EDITAR_VACIO);
        setErrorModal('');
    }, []);

    const manejarCambio = useCallback((e) => {
        const { name, value } = e.target;
        setFormulario(prev => ({ ...prev, [name]: value }));
    }, []);

    const manejarGuardar = useCallback(async (e) => {
        e.preventDefault();
        setErrorModal('');
        const f  = formularioRef.current;
        const id = modalEditarRef.current?.id;
        if (!id) return;

        if (!f.nombre.trim() || !f.apellido.trim() || !f.telefono.trim()) {
            setErrorModal('Nombre, apellido y teléfono son obligatorios.');
            return;
        }

        setGuardando(true);
        try {
            const payload = {
                nombre:   f.nombre.trim(),
                apellido: f.apellido.trim(),
                telefono: f.telefono.trim(),
                rol:      f.rol,
            };
            if (f.password) payload.password = f.password;

            await api.put(`/admin/usuarios/${id}`, payload);
            mostrarToast('Usuario actualizado correctamente.');
            cerrarEditar();
            cargarUsuarios();
        } catch (err) {
            setErrorModal(err.response?.data?.mensaje || 'Error al guardar cambios.');
        } finally {
            setGuardando(false);
        }
    }, [cerrarEditar, cargarUsuarios, mostrarToast]);

    // ── Crear ────────────────────────────────────────────────
    const abrirCrear = useCallback(() => {
        setFormularioCrear(FORM_CREAR_VACIO);
        setErrorModalCrear('');
        setMostrarPassCrear(false);
        setMostrarConfCrear(false);
        setModalCrear(true);
    }, []);

    const cerrarCrear = useCallback(() => {
        setModalCrear(false);
        setFormularioCrear(FORM_CREAR_VACIO);
        setErrorModalCrear('');
    }, []);

    const manejarCambioCrear = useCallback((e) => {
        const { name, value } = e.target;
        let formatted = value;
        if (name === 'nombre' || name === 'apellido') {
            formatted = value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚüÜñÑ '-]/g, '').slice(0, 50);
        }
        setFormularioCrear(prev => ({ ...prev, [name]: formatted }));
    }, []);

    const manejarCambioPaisCrear = useCallback((e) => {
        setFormularioCrear(prev => ({ ...prev, codigoPais: e.target.value, telefono: '' }));
    }, []);

    const manejarCambioTelCrear = useCallback((e) => {
        setFormularioCrear(prev => {
            const pais = PAISES_LATAM.find(p => p.codigo === prev.codigoPais) || PAISES_LATAM[0];
            const soloNum = e.target.value.replace(/\D/g, '').slice(0, pais.digitos);
            return { ...prev, telefono: soloNum };
        });
    }, []);

    const manejarCrear = useCallback(async (e) => {
        e.preventDefault();
        setErrorModalCrear('');

        const errorValidacion = validarFormularioCrear(formularioCrear);
        if (errorValidacion) {
            setErrorModalCrear(errorValidacion);
            return;
        }

        setCreando(true);
        try {
            await api.post('/admin/usuarios', {
                nombre:     formularioCrear.nombre.trim(),
                apellido:   formularioCrear.apellido.trim(),
                email:      formularioCrear.email.trim().toLowerCase(),
                password:   formularioCrear.password,
                codigoPais: formularioCrear.codigoPais,
                telefono:   formularioCrear.telefono.trim(),
                rol:        formularioCrear.rol,
            });
            mostrarToast(`Usuario ${formularioCrear.nombre.trim()} creado correctamente.`);
            cerrarCrear();
            cargarUsuarios();
        } catch (err) {
            setErrorModalCrear(err.response?.data?.mensaje || 'Error al crear el usuario.');
        } finally {
            setCreando(false);
        }
    }, [formularioCrear, cerrarCrear, cargarUsuarios, mostrarToast]);

    // ── Eliminar ─────────────────────────────────────────────
    const abrirEliminar  = useCallback((u) => setModalEliminar(u), []);
    const cerrarEliminar = useCallback(() => setModalEliminar(null), []);

    const manejarEliminar = useCallback(async () => {
        if (!modalEliminar) return;
        setEliminando(true);
        try {
            await api.delete(`/admin/usuarios/${modalEliminar.id}`);
            mostrarToast(`Usuario ${modalEliminar.nombre} eliminado correctamente.`);
            setModalEliminar(null);
            cargarUsuarios();
        } catch (err) {
            mostrarToast(err.response?.data?.mensaje || 'Error al eliminar usuario.', 'error');
            setModalEliminar(null);
        } finally {
            setEliminando(false);
        }
    }, [modalEliminar, cargarUsuarios, mostrarToast]);

    // ─────────────────────────────────────────────────────────

    const paisActualCrear  = PAISES_LATAM.find(p => p.codigo === formularioCrear.codigoPais) || PAISES_LATAM[0];
    const editandoPropiaCuenta = modalEditar?.id === usuarioActual?.id;

    return (
        <div className="px-5 py-8 sm:px-8">
            <style>{KEYFRAMES}</style>

            {/* ── Encabezado ───────────────────────────────────── */}
            <div className="mb-9 flex items-start justify-between gap-4">
                <div>
                    <p className="text-xs text-gray-400 uppercase tracking-[0.2em] mb-2">
                        Panel de Administrador
                    </p>
                    <h1 className="font-display text-2xl sm:text-3xl font-bold text-white leading-tight">
                        Gestión de Usuarios
                    </h1>
                    <div className="mt-3 h-px w-12 bg-gradient-to-r from-purple-500 to-transparent" />
                </div>
                <button
                    onClick={abrirCrear}
                    className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold bg-purple-600 hover:bg-purple-500 text-white transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="hidden sm:inline">Crear Usuario</span>
                    <span className="sm:hidden">Crear</span>
                </button>
            </div>

            {/* ── Banner de error de página ─────────────────────── */}
            {errorPagina && (
                <div className="bg-red-500/[0.08] border border-red-500/20 text-red-400 px-4 py-3 text-sm mb-6 flex items-center justify-between gap-4">
                    <span>{errorPagina}</span>
                    <button
                        onClick={() => setErrorPagina('')}
                        className="text-red-400/50 hover:text-red-400 shrink-0 transition-colors"
                    >✕</button>
                </div>
            )}

            {/* ── Tabla ─────────────────────────────────────────── */}
            <div className="bg-white/[0.02] border border-white/[0.06] shadow-[0_2px_16px_rgba(0,0,0,0.4)]">

                {/* Barra búsqueda + filtro rol */}
                {!cargando && usuarios.length > 0 && (
                    <div className="px-5 py-3.5 border-b border-white/[0.05] flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <svg
                                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                                fill="none" stroke="currentColor" viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                value={busqueda}
                                onChange={e => setBusqueda(e.target.value)}
                                placeholder="Buscar por nombre, apellido, email o teléfono..."
                                aria-label="Buscar usuarios"
                                className="w-full pl-9 pr-8 py-2 bg-white/[0.04] text-sm text-white placeholder-gray-500 border border-white/[0.06] focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/25 transition-colors"
                            />
                            {busqueda && (
                                <button
                                    onClick={() => setBusqueda('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-400 transition-colors"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            )}
                        </div>
                        <div className="relative sm:w-40">
                            <select
                                value={filtroRol}
                                onChange={e => setFiltroRol(e.target.value)}
                                aria-label="Filtrar por rol"
                                className="w-full pl-3 pr-8 py-2 bg-gray-900 text-sm text-white border border-white/[0.06] focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/25 transition-colors appearance-none cursor-pointer"
                            >
                                {FILTROS_ROL.map(f => (
                                    <option key={f.valor} value={f.valor} className="bg-gray-800 text-white">{f.label}</option>
                                ))}
                            </select>
                            <svg
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
                                fill="none" stroke="currentColor" viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                )}

                {/* Contenido */}
                {cargando ? (
                    <div className="flex items-center justify-center py-32">
                        <div className="w-8 h-8 rounded-full border-4 border-purple-500/20 border-t-purple-500 animate-spin" />
                    </div>

                ) : usuarios.length === 0 ? (
                    <div className="text-center py-32">
                        <div className="w-11 h-11 rounded-full bg-white/[0.03] border border-white/[0.07] flex items-center justify-center mx-auto mb-4">
                            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <p className="text-gray-500 text-sm">Sin usuarios registrados</p>
                    </div>

                ) : usuariosFiltrados.length === 0 ? (
                    <div className="text-center py-24">
                        <svg className="w-8 h-8 text-gray-700 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <p className="text-gray-500 text-sm mb-1">Sin resultados</p>
                        <p className="text-gray-700 text-xs">Prueba con otro término o cambia el filtro</p>
                        {hayFiltrosActivos && (
                            <button
                                onClick={limpiarFiltros}
                                className="mt-4 text-xs text-purple-400/70 hover:text-purple-400 transition-colors"
                            >
                                Limpiar filtros
                            </button>
                        )}
                    </div>

                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-white/[0.06] bg-white/[0.015]">
                                    <th className="pl-5 pr-2 py-4 text-center text-xs font-semibold text-gray-400 uppercase tracking-widest w-10">N°</th>
                                    <th className="text-left px-4 py-4 text-xs font-semibold text-gray-400 uppercase tracking-widest">Nombre</th>
                                    <th className="text-left px-4 py-4 text-xs font-semibold text-gray-400 uppercase tracking-widest hidden sm:table-cell">Email</th>
                                    <th className="text-left px-4 py-4 text-xs font-semibold text-gray-400 uppercase tracking-widest hidden md:table-cell">Teléfono</th>
                                    <th className="text-left px-4 py-4 text-xs font-semibold text-gray-400 uppercase tracking-widest">Rol</th>
                                    <th className="text-left px-4 py-4 text-xs font-semibold text-gray-400 uppercase tracking-widest hidden lg:table-cell">Registro</th>
                                    <th className="text-right px-5 py-4 text-xs font-semibold text-gray-400 uppercase tracking-widest">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {usuariosFiltrados.map((u, idx) => (
                                    <FilaUsuario
                                        key={u.id}
                                        numero={idx + 1}
                                        usuario={u}
                                        onDetalle={abrirDetalle}
                                        onEditar={abrirEditar}
                                        onEliminar={abrirEliminar}
                                        esSelf={u.id === usuarioActual?.id}
                                    />
                                ))}
                            </tbody>
                        </table>
                        <div className="px-5 py-3 border-t border-white/[0.04] flex items-center justify-between">
                            <p className="text-xs text-gray-700">
                                {hayFiltrosActivos
                                    ? `${usuariosFiltrados.length} de ${usuarios.length} usuarios`
                                    : `${usuarios.length} ${usuarios.length === 1 ? 'usuario' : 'usuarios'}`
                                }
                            </p>
                            {hayFiltrosActivos && (
                                <button
                                    onClick={limpiarFiltros}
                                    className="text-xs text-gray-400 hover:text-gray-400 transition-colors"
                                >
                                    Limpiar filtros
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ── Modal Ver Detalle ─────────────────────────────── */}
            {modalDetalle && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/75" style={ANIM_OVERLAY} onClick={cerrarDetalle} />
                    <div className="relative w-full max-w-md bg-gray-900 border border-white/[0.09]" style={ANIM_SCALE}>
                        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.07]">
                            <div className="flex items-center gap-3">
                                <div className="w-0.5 h-5 bg-purple-500/70 rounded-full" />
                                <h2 className="font-display text-base font-bold text-white">Detalle de usuario</h2>
                            </div>
                            <button onClick={cerrarDetalle} className="p-1.5 text-gray-400 hover:text-white transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="px-6 py-5">
                            <div className="flex items-center gap-4 mb-5">
                                <div className="w-12 h-12 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                                    <span className="text-lg font-bold text-purple-400">
                                        {modalDetalle.nombre?.[0]?.toUpperCase() || '?'}
                                    </span>
                                </div>
                                <div>
                                    <p className="font-semibold text-white">{modalDetalle.nombre} {modalDetalle.apellido}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">{modalDetalle.email}</p>
                                </div>
                            </div>
                            <div className="border-t border-white/[0.06] pt-1">
                                <div className="flex items-center justify-between py-2.5 border-b border-white/[0.04]">
                                    <span className="text-xs text-gray-500 uppercase tracking-widest shrink-0">Rol</span>
                                    <BadgeRol rol={modalDetalle.rol} />
                                </div>
                                <CampoDetalle label="Nombre"   value={modalDetalle.nombre} />
                                <CampoDetalle label="Apellido" value={modalDetalle.apellido} />
                                <CampoDetalle label="Email"    value={modalDetalle.email} />
                                <CampoDetalle label="Teléfono" value={modalDetalle.telefono} />
                                <CampoDetalle label="Registro" value={formatFecha(modalDetalle.created_at)} />
                                {Number(modalDetalle.total_compras) > 0 && (
                                    <div className="flex items-center justify-between py-2.5">
                                        <span className="text-xs text-gray-500 uppercase tracking-widest">Compras confirmadas</span>
                                        <span className="text-sm font-semibold text-emerald-400">{Number(modalDetalle.total_compras)}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-white/[0.07] flex justify-end">
                            <button
                                onClick={cerrarDetalle}
                                className="px-5 py-2.5 text-sm text-gray-500 border border-white/[0.10] hover:text-white hover:border-white/25 transition-colors"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal Editar ──────────────────────────────────── */}
            {modalEditar && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/75" style={ANIM_OVERLAY} onClick={cerrarEditar} />
                    <div className="relative w-full max-w-lg bg-gray-900 border border-white/[0.09] flex flex-col max-h-[90vh]" style={ANIM_SCALE}>
                        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.07] shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-0.5 h-5 bg-purple-500/70 rounded-full" />
                                <h2 className="font-display text-base font-bold text-white">Editar usuario</h2>
                            </div>
                            <button onClick={cerrarEditar} className="p-1.5 text-gray-400 hover:text-white transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={manejarGuardar} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                            {/* Aviso cuando el admin edita su propia cuenta */}
                            {editandoPropiaCuenta && (
                                <div className="bg-amber-500/[0.08] border border-amber-500/20 text-amber-400 px-4 py-3 text-xs flex items-start gap-2">
                                    <svg className="w-3.5 h-3.5 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    <span>Estás editando tu propia cuenta. No puedes cambiar tu rol a uno distinto de administrador.</span>
                                </div>
                            )}

                            {errorModal && <AlertaError mensaje={errorModal} />}

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelCls}>Nombre *</label>
                                    <input type="text" name="nombre" value={formulario.nombre} onChange={manejarCambio}
                                        placeholder="Nombre" maxLength={50} required className={inputCls} />
                                </div>
                                <div>
                                    <label className={labelCls}>Apellido *</label>
                                    <input type="text" name="apellido" value={formulario.apellido} onChange={manejarCambio}
                                        placeholder="Apellido" maxLength={50} required className={inputCls} />
                                </div>
                            </div>

                            <div>
                                <label className={labelCls}>Teléfono *</label>
                                <input type="text" name="telefono" value={formulario.telefono} onChange={manejarCambio}
                                    placeholder="+51987654321" maxLength={20} required className={inputCls} />
                            </div>

                            {/* Rol — disponible para todos, el backend impone las restricciones */}
                            <div>
                                <label className={labelCls}>Rol *</label>
                                <div className="relative">
                                    <select name="rol" value={formulario.rol} onChange={manejarCambio} className={selectCls}>
                                        <option value="usuario">Usuario</option>
                                        <option value="organizador">Organizador</option>
                                        <option value="admin">Administrador</option>
                                    </select>
                                    <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                                        fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>

                            <div>
                                <label className={labelCls}>
                                    Nueva contraseña{' '}
                                    <span className="text-gray-700 normal-case font-normal tracking-normal">(dejar vacío para no cambiar)</span>
                                </label>
                                <input type="password" name="password" value={formulario.password} onChange={manejarCambio}
                                    placeholder="Mín. 8 caracteres, incluye $, % o #" className={inputCls} />
                            </div>
                        </form>

                        <div className="px-6 py-4 border-t border-white/[0.07] flex justify-end gap-3 shrink-0">
                            <button type="button" onClick={cerrarEditar}
                                className="px-5 py-2.5 text-sm text-gray-500 border border-white/[0.10] hover:text-white hover:border-white/25 transition-colors">
                                Cancelar
                            </button>
                            <button type="submit" onClick={manejarGuardar} disabled={guardando}
                                className="px-5 py-2.5 text-sm font-semibold bg-purple-600 hover:bg-purple-500 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                                {guardando ? 'Guardando...' : 'Guardar cambios'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal Crear Usuario ───────────────────────────── */}
            {modalCrear && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/75" style={ANIM_OVERLAY} onClick={cerrarCrear} />
                    <div className="relative w-full max-w-lg bg-gray-900 border border-white/[0.09] flex flex-col max-h-[90vh]" style={ANIM_SCALE}>

                        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.07] shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-0.5 h-5 bg-purple-500/70 rounded-full" />
                                <h2 className="font-display text-base font-bold text-white">Crear usuario</h2>
                            </div>
                            <button onClick={cerrarCrear} className="p-1.5 text-gray-400 hover:text-white transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={manejarCrear} noValidate className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                            {errorModalCrear && <AlertaError mensaje={errorModalCrear} />}

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelCls}>Nombre *</label>
                                    <input type="text" name="nombre" value={formularioCrear.nombre}
                                        onChange={manejarCambioCrear} placeholder="Nombre" maxLength={50} required className={inputCls} />
                                </div>
                                <div>
                                    <label className={labelCls}>Apellido *</label>
                                    <input type="text" name="apellido" value={formularioCrear.apellido}
                                        onChange={manejarCambioCrear} placeholder="Apellido" maxLength={50} required className={inputCls} />
                                </div>
                            </div>

                            <div>
                                <label className={labelCls}>Correo electrónico *</label>
                                <input type="email" name="email" value={formularioCrear.email}
                                    onChange={manejarCambioCrear} placeholder="correo@ejemplo.com"
                                    maxLength={100} required className={inputCls} />
                            </div>

                            <div>
                                <label className={labelCls}>Teléfono *</label>
                                <div className="flex border border-white/[0.08] overflow-hidden focus-within:border-purple-500/60 focus-within:ring-1 focus-within:ring-purple-500/30 transition-colors">
                                    <select
                                        value={formularioCrear.codigoPais}
                                        onChange={manejarCambioPaisCrear}
                                        aria-label="Código de país"
                                        className="shrink-0 bg-gray-800/90 border-r border-white/[0.08] pl-3 pr-2 py-2.5 text-sm text-white focus:outline-none cursor-pointer"
                                    >
                                        {PAISES_LATAM.map(p => (
                                            <option key={p.codigo} value={p.codigo} className="bg-gray-800">
                                                {p.bandera} {p.codigo}
                                            </option>
                                        ))}
                                    </select>
                                    <input
                                        type="tel" name="telefono"
                                        value={formularioCrear.telefono}
                                        onChange={manejarCambioTelCrear}
                                        placeholder={paisActualCrear.placeholder}
                                        maxLength={paisActualCrear.digitos}
                                        required
                                        className="flex-1 px-3 py-2.5 bg-white/[0.05] text-sm text-white placeholder-gray-500 focus:outline-none"
                                    />
                                </div>
                                <p className="text-xs text-gray-700 mt-1.5">
                                    {paisActualCrear.digitos} dígitos para {paisActualCrear.nombre}
                                </p>
                            </div>

                            <div>
                                <label className={labelCls}>Contraseña *</label>
                                <div className="relative">
                                    <input
                                        type={mostrarPassCrear ? 'text' : 'password'}
                                        name="password" value={formularioCrear.password}
                                        onChange={manejarCambioCrear}
                                        placeholder="Mín. 8 caracteres, incluye $, % o #"
                                        required className={`${inputCls} pr-10`}
                                    />
                                    <button type="button" onClick={() => setMostrarPassCrear(v => !v)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-400 transition-colors"
                                        aria-label={mostrarPassCrear ? 'Ocultar' : 'Mostrar'}>
                                        <IconoOjo visible={mostrarPassCrear} />
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className={labelCls}>Confirmar contraseña *</label>
                                <div className="relative">
                                    <input
                                        type={mostrarConfCrear ? 'text' : 'password'}
                                        name="confirmarPassword" value={formularioCrear.confirmarPassword}
                                        onChange={manejarCambioCrear}
                                        placeholder="••••••••"
                                        required className={`${inputCls} pr-10`}
                                    />
                                    <button type="button" onClick={() => setMostrarConfCrear(v => !v)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-400 transition-colors"
                                        aria-label={mostrarConfCrear ? 'Ocultar' : 'Mostrar'}>
                                        <IconoOjo visible={mostrarConfCrear} />
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className={labelCls}>Rol *</label>
                                <div className="relative">
                                    <select name="rol" value={formularioCrear.rol} onChange={manejarCambioCrear} className={selectCls}>
                                        <option value="usuario">Usuario</option>
                                        <option value="organizador">Organizador</option>
                                        <option value="admin">Administrador</option>
                                    </select>
                                    <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                                        fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                                {formularioCrear.rol === 'admin' && (
                                    <p className="text-xs text-amber-500/80 mt-1.5">
                                        Este usuario tendrá acceso completo al panel de administración.
                                    </p>
                                )}
                            </div>
                        </form>

                        <div className="px-6 py-4 border-t border-white/[0.07] flex justify-end gap-3 shrink-0">
                            <button type="button" onClick={cerrarCrear}
                                className="px-5 py-2.5 text-sm text-gray-500 border border-white/[0.10] hover:text-white hover:border-white/25 transition-colors">
                                Cancelar
                            </button>
                            <button type="submit" onClick={manejarCrear} disabled={creando}
                                className="px-5 py-2.5 text-sm font-semibold bg-purple-600 hover:bg-purple-500 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                                {creando ? 'Creando...' : 'Crear usuario'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal Eliminar ────────────────────────────────── */}
            {modalEliminar && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/75" style={ANIM_OVERLAY} onClick={cerrarEliminar} />
                    <div className="relative w-full max-w-sm bg-gray-900 border border-white/[0.09]" style={ANIM_SCALE}>
                        <div className="px-6 pt-6 pb-5 text-center">
                            <div className="w-11 h-11 rounded-full bg-red-500/[0.08] border border-red-500/20 flex items-center justify-center mx-auto mb-4">
                                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </div>
                            <h2 className="font-display text-base font-bold text-white mb-1">Eliminar usuario</h2>
                            <p className="text-sm text-gray-500">
                                ¿Estás seguro de que deseas eliminar a{' '}
                                <span className="text-white font-medium">
                                    {modalEliminar.nombre} {modalEliminar.apellido}
                                </span>?
                            </p>

                            {/* Advertencia adicional si el usuario es administrador */}
                            {modalEliminar.rol === 'admin' && (
                                <div className="mt-3 bg-amber-500/[0.08] border border-amber-500/20 text-amber-400 px-3 py-2 text-xs text-left flex items-start gap-2">
                                    <svg className="w-3.5 h-3.5 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    <span>Este usuario es administrador. Si es el único, el sistema bloqueará esta operación.</span>
                                </div>
                            )}

                            <p className="text-xs text-gray-700 mt-3">Esta acción no se puede deshacer.</p>
                        </div>
                        <div className="px-6 py-4 border-t border-white/[0.07] flex justify-end gap-3">
                            <button
                                onClick={cerrarEliminar}
                                className="px-5 py-2.5 text-sm text-gray-500 border border-white/[0.10] hover:text-white hover:border-white/25 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={manejarEliminar}
                                disabled={eliminando}
                                className="px-5 py-2.5 text-sm font-semibold bg-red-600 hover:bg-red-500 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {eliminando ? 'Eliminando...' : 'Eliminar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Toast tipado ───────────────────────────────────── */}
            {toast && (
                <div
                    className="fixed bottom-6 right-6 z-[60] flex items-center gap-3 px-4 py-3 bg-gray-900 border border-white/[0.09] shadow-[0_8px_24px_rgba(0,0,0,0.5)] text-sm"
                    style={{ animation: 'toastIn 0.2s cubic-bezier(0.4, 0, 0.2, 1)', willChange: 'transform, opacity' }}
                >
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        toast.tipo === 'error'       ? 'bg-red-400'   :
                        toast.tipo === 'advertencia' ? 'bg-amber-400' :
                                                       'bg-emerald-400'
                    }`} />
                    <span className="text-gray-200">{toast.msg}</span>
                </div>
            )}
        </div>
    );
};

export default AdminUsuarios;
