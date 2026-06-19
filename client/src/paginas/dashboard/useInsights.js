import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';

const BASE_URL        = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const MAX_ALERTAS     = 20;
const DELAY_BASE_MS   = 3_000;
const DELAY_MAX_MS    = 30_000;
const ROLES_PERMITIDOS = new Set(['admin', 'organizador']);

const sanitizarAlerta = (raw) => {
    if (!raw || typeof raw !== 'object') return null;
    const tiposValidos = ['warning', 'info', 'success'];
    return {
        id:      typeof raw.id === 'number' ? raw.id : Math.random(),
        tipo:    tiposValidos.includes(raw.tipo) ? raw.tipo : 'info',
        mensaje: typeof raw.mensaje === 'string'
            ? raw.mensaje.replace(/<[^>]*>/g, '').slice(0, 300)
            : '',
        tiempo:  typeof raw.tiempo === 'string'
            ? raw.tiempo.replace(/<[^>]*>/g, '').slice(0, 50)
            : '',
    };
};

// eventoId: null = todos los eventos | number = evento específico (solo organizador)
export const useInsights = (eventoId = null) => {
    const { usuario } = useAuth();
    const [alertas, setAlertas] = useState([]);
    const [estado, setEstado] = useState('init');

    const activoRef     = useRef(true);
    const controllerRef = useRef(null);
    const timeoutRef    = useRef(null);
    const estadoRef     = useRef('init'); // refleja siempre el estado actual

    // Mantener ref sincronizado con el estado para usarlo en closures
    const setEstadoSync = (nuevoEstado) => {
        estadoRef.current = nuevoEstado;
        setEstado(nuevoEstado);
    };

    useEffect(() => {
        activoRef.current = true;
        setAlertas([]);
        setEstadoSync('init');

        if (!usuario || !ROLES_PERMITIDOS.has(usuario.rol)) {
            setEstadoSync('sin_permiso');
            return;
        }

        const params   = eventoId ? `?evento_id=${eventoId}` : '';
        const endpoint = usuario.rol === 'admin'
            ? `${BASE_URL}/admin/insights/stream`
            : `${BASE_URL}/eventos/insights/stream${params}`;

        let intento = 0;

        const conectar = () => {
            if (!activoRef.current) return;

            const token = localStorage.getItem('token');
            if (!token) { setEstadoSync('error'); return; }

            setEstadoSync(intento === 0 ? 'conectando' : 'reconectando');

            const controller = new AbortController();
            controllerRef.current = controller;

            fetch(endpoint, {
                headers: { Authorization: `Bearer ${token}` },
                signal:  controller.signal,
            })
                .then(async (res) => {
                    if (!res.ok) throw new Error(`HTTP_${res.status}`);
                    if (!activoRef.current) return;

                    setEstadoSync('conectado');
                    intento = 0;

                    const reader  = res.body.getReader();
                    const decoder = new TextDecoder();
                    let buffer    = '';

                    try {
                        while (activoRef.current) {
                            const { done, value } = await reader.read();
                            if (done) break;

                            buffer += decoder.decode(value, { stream: true });

                            const bloques = buffer.split('\n\n');
                            buffer = bloques.pop() ?? '';

                            for (const bloque of bloques) {
                                const linea = bloque
                                    .split('\n')
                                    .find((l) => l.startsWith('data:'));
                                if (!linea) continue;
                                try {
                                    const payload = JSON.parse(linea.slice(5).trim());
                                    if (Array.isArray(payload.alertas)) {
                                        setAlertas(
                                            payload.alertas
                                                .map(sanitizarAlerta)
                                                .filter(Boolean)
                                                .slice(0, MAX_ALERTAS)
                                        );
                                    }
                                } catch { /* JSON malformado */ }
                            }
                        }
                    } catch (e) {
                        if (e.name === 'AbortError') return;
                        throw e;
                    } finally {
                        reader.cancel().catch(() => {});
                    }

                    if (activoRef.current) reconectar();
                })
                .catch((err) => {
                    if (!activoRef.current || err.name === 'AbortError') return;
                    reconectar();
                });
        };

        const reconectar = () => {
            if (!activoRef.current) return;
            setEstadoSync('error');
            const delay = Math.min(DELAY_BASE_MS * 2 ** intento, DELAY_MAX_MS);
            intento++;
            timeoutRef.current = setTimeout(conectar, delay);
        };

        // Usa estadoRef.current para leer el estado real sin closure stale
        const onVisibilidad = () => {
            if (document.visibilityState === 'visible' && estadoRef.current === 'error') {
                clearTimeout(timeoutRef.current);
                conectar();
            }
        };
        document.addEventListener('visibilitychange', onVisibilidad);

        conectar();

        return () => {
            activoRef.current = false;
            clearTimeout(timeoutRef.current);
            controllerRef.current?.abort();
            document.removeEventListener('visibilitychange', onVisibilidad);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [usuario, eventoId]);

    return { alertas, estado };
};
