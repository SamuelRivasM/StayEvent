import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import RutaPrivada from './componentes/RutaPrivada';
import Login from './paginas/Login';
import Registro from './paginas/Registro';
import RecuperarPassword from './paginas/RecuperarPassword';
import PaginaAdmin from './paginas/PaginaAdmin';
import PaginaUsuario from './paginas/PaginaUsuario';
import PaginaOrganizador from './paginas/PaginaOrganizador';

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Routes>
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
                        path="/usuario"
                        element={
                            <RutaPrivada rolesPermitidos={['usuario']}>
                                <PaginaUsuario />
                            </RutaPrivada>
                        }
                    />
                    <Route
                        path="/organizador"
                        element={
                            <RutaPrivada rolesPermitidos={['organizador']}>
                                <PaginaOrganizador />
                            </RutaPrivada>
                        }
                    />

                    {/* Redirección por defecto */}
                    <Route path="/" element={<Navigate to="/login" replace />} />
                    <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
