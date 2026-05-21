import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import RutaPrivada from './componentes/RutaPrivada';
import PaginaPrincipal from './paginas/PaginaPrincipal';
import Login from './paginas/Login';
import Registro from './paginas/Registro';
import RecuperarPassword from './paginas/RecuperarPassword';
import PaginaAdmin from './paginas/PaginaAdmin';
import GestionEventos from './paginas/GestionEventos';
import MisTickets from './paginas/MisTickets';
import ConfigurarPerfil from './paginas/ConfigurarPerfil';

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Routes>
                    <Route path="/" element={<PaginaPrincipal />} />

                    {/* Rutas públicas */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/registro" element={<Registro />} />
                    <Route path="/recuperar-password" element={<RecuperarPassword />} />

                    {/* Rutas protegidas por rol */}
                    <Route
                        path="/admin"
                        element={
                            <RutaPrivada rolesPermitidos={['admin']}>
                                <PaginaAdmin />
                            </RutaPrivada>
                        }
                    />
                    <Route
                        path="/organizador"
                        element={<Navigate to="/organizador/eventos" replace />}
                    />
                    <Route
                        path="/organizador/eventos"
                        element={
                            <RutaPrivada rolesPermitidos={['organizador']}>
                                <GestionEventos />
                            </RutaPrivada>
                        }
                    />

                    <Route
                        path="/mis-tickets"
                        element={
                            <RutaPrivada rolesPermitidos={['usuario']}>
                                <MisTickets />
                            </RutaPrivada>
                        }
                    />

                    <Route
                        path="/perfil"
                        element={
                            <RutaPrivada rolesPermitidos={['admin', 'usuario', 'organizador']}>
                                <ConfigurarPerfil />
                            </RutaPrivada>
                        }
                    />

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
