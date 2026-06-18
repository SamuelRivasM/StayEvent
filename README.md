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

---

## Requisitos previos

- Node.js 18 o superior
- XAMPP con MySQL activo
- Base de datos `stay_event` creada en MySQL
- Tabla `usuarios` creada (ver estructura más abajo)

---

## Estructura del proyecto

```
stay-event/
├── server/          # Backend — Node.js + Express
└── client/          # Frontend — React
```

---

## Configuración del entorno

Crear el archivo `.env` dentro de `server/` con el siguiente contenido:

```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=stay_event
DB_PORT=3306

JWT_SECRET=reemplazar_con_clave_secreta_segura
JWT_EXPIRES_IN=7d

PORT=5000
```

> En producción, reemplazar `JWT_SECRET` por una cadena larga y aleatoria. Nunca exponer este archivo en el repositorio.

---

## Base de datos

Ejecutar en MySQL (phpMyAdmin o consola):

```sql
-- ============================================
--  Stay Event - Base de Datos
--  Ejecutar en phpMyAdmin (XAMPP)
-- ============================================

CREATE DATABASE IF NOT EXISTS stay_event
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE stay_event;

-- ============================================
-- TABLA USUARIOS
-- ============================================

CREATE TABLE IF NOT EXISTS usuarios (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  nombre      VARCHAR(100)  NOT NULL,
  apellido    VARCHAR(100)  NOT NULL,
  email       VARCHAR(150)  NOT NULL UNIQUE,
  password    VARCHAR(255)  NOT NULL,
  telefono    VARCHAR(20)   DEFAULT NULL,
  rol         ENUM('usuario', 'organizador', 'admin') DEFAULT 'usuario',
  created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Índice para búsquedas por email
CREATE INDEX idx_email ON usuarios(email);

-- ============================================
-- TABLA EVENTOS
-- ============================================

CREATE TABLE IF NOT EXISTS eventos (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  
  titulo        VARCHAR(150) NOT NULL,
  
  descripcion   TEXT,
  
  categoria     ENUM(
                    'Conciertos',
                    'Festivales',
                    'Fiestas / Discoteca'
                  ) NOT NULL,

  fecha         DATE NOT NULL,

  hora          TIME NOT NULL,

  lugar         VARCHAR(150) NOT NULL,

  distrito      VARCHAR(100) NOT NULL,

  direccion     VARCHAR(255),

  precio        DECIMAL(10,2) NOT NULL DEFAULT 0,

  imagen        VARCHAR(255),

  stock         INT DEFAULT 0,

  estado        ENUM('activo', 'agotado', 'cancelado')
                 DEFAULT 'activo',

  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                 ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================
-- ÍNDICES EVENTOS
-- ============================================

CREATE INDEX idx_categoria ON eventos(categoria);

CREATE INDEX idx_fecha ON eventos(fecha);

CREATE INDEX idx_distrito ON eventos(distrito);

-- ============================================
-- USUARIO ADMIN DE PRUEBA
-- Password: admin123
-- ============================================

INSERT INTO usuarios (
  nombre,
  apellido,
  email,
  password,
  rol
)
VALUES (
  'Admin',
  'Stay Event',
  'admin@stayevent.com',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK1.',
  'admin'
);

-- ============================================
-- EVENTOS DE EJEMPLO
-- ============================================

INSERT INTO eventos (
  titulo,
  descripcion,
  categoria,
  fecha,
  hora,
  lugar,
  distrito,
  direccion,
  precio,
  imagen,
  stock
)
VALUES

(
  'Coldplay Music Of The Spheres',
  'Concierto oficial de Coldplay en Lima.',
  'Conciertos',
  '2026-05-15',
  '20:00:00',
  'Estadio Nacional',
  'Cercado de Lima',
  'Av. Paseo de la Republica',
  250.00,
  'https://images.unsplash.com/photo-1501386761578-eac5c94b800a',
  500
),

(
  'Tomorrowland Peru',
  'Festival internacional de musica electronica.',
  'Festivales',
  '2026-08-10',
  '18:00:00',
  'Costa Verde',
  'Miraflores',
  'Circuito de Playas',
  450.00,
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f',
  1200
),

(
  'Halloween Party Lima',
  'Fiesta tematica con DJs invitados.',
  'Fiestas / Discoteca',
  '2026-10-31',
  '22:00:00',
  'Club Lima Nights',
  'Barranco',
  'Av. Grau 450',
  120.00,
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30',
  800
),

(
  'Ultra Music Lima',
  'Festival EDM con artistas internacionales.',
  'Festivales',
  '2026-11-21',
  '19:00:00',
  'Arena Peru',
  'Surco',
  'Jockey Plaza',
  380.00,
  'https://images.unsplash.com/photo-1506157786151-b8491531f063',
  1500
),

(
  'Bad Bunny World Tour',
  'Show urbano en Lima Metropolitana.',
  'Conciertos',
  '2026-12-05',
  '21:00:00',
  'Estadio Monumental',
  'Ate',
  'Av. Prolongacion Javier Prado',
  320.00,
  'https://images.unsplash.com/photo-1507874457470-272b3c8d8ee2',
  2000
);
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

## Ejecución

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

Abrir en el navegador: `http://localhost:3000`

---

## Endpoints de la API

Base URL: `http://localhost:5000/api`

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/auth/register` | No | Registra un nuevo usuario |
| POST | `/auth/login` | No | Inicia sesión y devuelve el token |
| GET | `/auth/me` | Bearer token | Devuelve el perfil del usuario activo |
| GET | `/health` | No | Verifica que el servidor esté funcionando |

### Ejemplo de respuesta — login exitoso

```json
{
  "mensaje": "Inicio de sesión exitoso.",
  "token": "<jwt>",
  "usuario": {
    "id": 1,
    "nombre": "Juan",
    "apellido": "Pérez",
    "email": "juan@ejemplo.com",
    "rol": "usuario"
  }
}
```

---

## Roles del sistema

| Rol | Ruta tras el login |
|---|---|
| `admin` | `/admin` |
| `usuario` | `/usuario` |
| `organizador` | `/organizador` |

Los roles se asignan directamente en la base de datos. El registro público siempre crea usuarios con rol `usuario`.

---

## Variables de entorno — referencia completa

| Variable | Descripción | Valor de ejemplo |
|---|---|---|
| `DB_HOST` | Host de la base de datos | `localhost` |
| `DB_USER` | Usuario de MySQL | `root` |
| `DB_PASSWORD` | Contraseña de MySQL | _(vacío en XAMPP por defecto)_ |
| `DB_NAME` | Nombre de la base de datos | `stay_event` |
| `DB_PORT` | Puerto de MySQL | `3306` |
| `JWT_SECRET` | Clave secreta para firmar tokens | cadena larga y aleatoria |
| `JWT_EXPIRES_IN` | Tiempo de expiración del token | `7d` |
| `PORT` | Puerto del servidor backend | `5000` |
