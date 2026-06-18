import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import RutaPrivada from './componentes/RutaPrivada';
import AdminLayout from './componentes/AdminLayout';
import OrganizadorLayout from './componentes/OrganizadorLayout';
import PaginaPrincipal from './paginas/PaginaPrincipal';
import Login from './paginas/Login';
import Registro from './paginas/Registro';
import RecuperarPassword from './paginas/RecuperarPassword';
import GestionEventos from './paginas/GestionEventos';
import MisTickets from './paginas/MisTickets';
import ConfigurarPerfil from './paginas/ConfigurarPerfil';
import AdminDashboard from './paginas/AdminDashboard';
import AdminUsuarios from './paginas/AdminUsuarios';
import AdminEventos from './paginas/AdminEventos';
import AdminCompras from './paginas/AdminCompras';
import OrganizadorDashboard from './paginas/organizador/OrganizadorDashboard';

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

                    {/* Panel Admin con subrutas */}
                    <Route
                        path="/admin"
                        element={
                            <RutaPrivada rolesPermitidos={['admin']}>
                                <AdminLayout />
                            </RutaPrivada>
                        }
                    >
                        <Route index element={<Navigate to="dashboard" replace />} />
                        <Route path="dashboard" element={<AdminDashboard />} />
                        <Route path="usuarios"  element={<AdminUsuarios />} />
                        <Route path="eventos"   element={<AdminEventos />} />
                        <Route path="compras"   element={<AdminCompras />} />
                    </Route>

                    {/* Organizador con subrutas */}
                    <Route
                        path="/organizador"
                        element={
                            <RutaPrivada rolesPermitidos={['organizador']}>
                                <OrganizadorLayout />
                            </RutaPrivada>
                        }
                    >
                        <Route index element={<Navigate to="dashboard" replace />} />
                        <Route path="dashboard" element={<OrganizadorDashboard />} />
                        <Route path="eventos" element={<GestionEventos />} />
                    </Route>

                    {/* Usuario */}
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
