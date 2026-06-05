import React from 'react';
import PropTypes from 'prop-types';

const GRADIENTE_CATEGORIA = {
    'Conciertos': 'from-violet-950 via-purple-900 to-gray-900',
    'Festivales': 'from-amber-950 via-orange-900 to-gray-900',
    'Fiestas / Discoteca': 'from-rose-950 via-pink-900 to-gray-900',
};

const formatearFecha = (fecha) => {
    if (!fecha) return 'Fecha por confirmar';
    let isoStr;
    if (fecha instanceof Date) {
        isoStr = fecha.toISOString().split('T')[0];
    } else if (typeof fecha === 'string') {
        isoStr = fecha.includes('T') ? fecha.split('T')[0] : fecha;
    } else {
        return 'Fecha por confirmar';
    }
    const [y, m, d] = isoStr.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-PE', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
};

const etiquetaPrecio = (precioMin) => {
    if (precioMin === null || precioMin === undefined) return { texto: 'Ver precios', clase: 'text-white/70' };
    const val = Number(precioMin);
    if (val === 0) return { texto: 'Gratis', clase: 'text-emerald-400' };
    const str = `S/. ${val % 1 === 0 ? val : val.toFixed(2)}`;
    return { texto: `Desde ${str}`, clase: 'text-white' };
};

const TarjetaEvento = ({ evento, onClick }) => {
    const gradiente = GRADIENTE_CATEGORIA[evento.categoria] || 'from-gray-900 to-gray-950';
    const { texto, clase } = etiquetaPrecio(evento.precio_min);

    return (
        <article
            className="group relative overflow-hidden cursor-pointer"
            onClick={onClick}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
            onKeyDown={onClick ? (e) => { if (e.key === 'Enter') onClick(); } : undefined}
        >
            <div className="relative aspect-[3/4] overflow-hidden bg-gray-900">

                {/* Imagen o gradiente de fondo */}
                {evento.imagen_url ? (
                    <img
                        src={evento.imagen_url}
                        alt={evento.titulo}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                        loading="lazy"
                    />
                ) : (
                    <div
                        className={`absolute inset-0 bg-gradient-to-br ${gradiente} transition-transform duration-700 ease-out group-hover:scale-105`}
                    />
                )}

                {/* Overlay degradado permanente en la parte inferior */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                {/* Overlay de hover */}
                <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Cabecera: categoría y precio */}
                <div className="absolute top-0 inset-x-0 p-3 flex justify-between items-start">
                    <span className="text-xs font-medium tracking-widest uppercase text-white/75 leading-none pt-0.5">
                        {evento.categoria}
                    </span>
                    <span className={`text-xs font-bold leading-none ${clase}`}>
                        {texto}
                    </span>
                </div>

                {/* Pie: título, fecha y distrito */}
                <div className="absolute bottom-0 inset-x-0 p-3 sm:p-4">
                    <h3 className="font-display text-sm sm:text-base font-bold text-white leading-snug line-clamp-2 mb-1.5">
                        {evento.titulo}
                    </h3>
                    <div className="space-y-0.5">
                        <p className="text-xs text-gray-400 leading-none">
                            {formatearFecha(evento.fecha)}
                            {evento.hora && (
                                <span className="text-gray-400"> · {String(evento.hora).substring(0, 5)}</span>
                            )}
                        </p>
                        {evento.distrito && (
                            <p className="text-xs text-gray-400 leading-none truncate">
                                {evento.distrito}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </article>
    );
};

TarjetaEvento.propTypes = {
    evento: PropTypes.shape({
        id: PropTypes.number,
        titulo: PropTypes.string.isRequired,
        categoria: PropTypes.string,
        fecha: PropTypes.string,
        hora: PropTypes.string,
        distrito: PropTypes.string,
        imagen_url: PropTypes.string,
        precio_min: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    }).isRequired,
    onClick: PropTypes.func,
};

TarjetaEvento.defaultProps = {
    onClick: null,
};

export default TarjetaEvento;
