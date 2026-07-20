# Stay Event

Plataforma web de compra y venta de entradas para eventos. Permite a usuarios registrarse, iniciar sesión y acceder a funcionalidades según su rol (administrador, usuario u organizador).

---

## Tecnologías

**Backend**
- Node.js + Express
- MySQL 2 (con XAMPP)
- JSON Web Tokens (JWT) para autenticación
- bcryptjs para hash de contraseñas

**Frontend**
- React 19
- React Router DOM 7
- Tailwind CSS 3
- Axios

**Infraestructura y pruebas**
- Docker
- DigitalOcean (servidores, balanceador de carga, monitoreo)
- k6 (pruebas de carga y estrés)

---

## Roles del sistema

| Rol | Ruta tras el login |
|---|---|
| `admin` | `/admin` |
| `usuario` | `/usuario` |
| `organizador` | `/organizador` |

Los roles se asignan directamente en la base de datos. El registro público siempre crea usuarios con rol `usuario`.

---

## Requisitos previos

- Node.js 18 o superior
- XAMPP con MySQL activo
- Docker Desktop (Requiere tener virtualización activada en el equipo)
- Base de datos `stay_event` creada en MySQL

---

## Estructura del proyecto

```
stay-event/
├── server/          # Backend — Node.js + Express
├── client/          # Frontend — React
├── db/              # Script de inicialización de la base de datos
├── test/            # Pruebas unitarias del backend
├── pruebas-k6/      # Scripts y reportes de pruebas de carga
└── docker-compose.yml
```
---

## Instalación

### Backend

```bash
cd stay-event/server
npm install
```

Dependencias que se instalan:

| Paquete | Versión | Uso |
|---|---|---|
| express | ^4.18.2 | Servidor HTTP |
| mysql2 | ^3.6.5 | Conexión a MySQL |
| jsonwebtoken | ^9.0.2 | Generación y verificación de JWT |
| bcryptjs | ^2.4.3 | Hash de contraseñas |
| dotenv | ^16.3.1 | Variables de entorno |
| cors | ^2.8.5 | Control de acceso entre dominios |
| nodemon | ^3.0.2 | Reinicio automático en desarrollo |

### Frontend

```bash
cd stay-event/client
npm install
```

Dependencias principales:

| Paquete | Versión | Uso |
|---|---|---|
| react | ^19.2.6 | Librería de UI |
| react-router-dom | ^7.15.0 | Enrutamiento del cliente |
| axios | ^1.16.0 | Peticiones HTTP al backend |
| tailwindcss | ^3.4.19 | Estilos con clases utilitarias |
| postcss | ^8.5.14 | Procesador de CSS |
| autoprefixer | ^10.5.0 | Prefijos CSS automáticos |

---

## Ejecución Vía XAMPP

Iniciar XAMPP y asegurarse de que el servicio MySQL esté activo antes de ejecutar el backend.

### Backend (puerto 5000)

```bash
cd stay-event/server
npm run dev
```

Para producción:

```bash
npm start
```

### Frontend (puerto 3000)

```bash
cd stay-event/client
npm start
```

## Ejecución Vía Docker Desktop

Con Docker Desktop abierto, y un archivo `.env` en la raíz del proyecto con las variables `DB_ROOT_PASSWORD`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET` y `JWT_EXPIRES_IN`, ejecutar desde la raíz del proyecto:

```bash
docker compose up
```
Esto levanta automáticamente los siguientes servicios:

| Servicio | Puerto |
|---|---|
| Frontend | 3000 |
| Backend | 5000 |
| MySQL | 3306 |
| phpMyAdmin | 8080 |

Abrir en el navegador: `http://localhost:3000`