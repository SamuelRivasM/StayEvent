# 🪐 PlanetScale - Setup Gratis (MySQL en la Nube)

## ¿Por qué PlanetScale?
- ✅ **100% GRATIS** - Tier Hobby sin límite de tiempo
- ✅ **MySQL nativo** - Tu código no cambia
- ✅ **Serverless** - Se pausa automáticamente sin uso
- ✅ **Apagar/Prender** - Perfecto para presentaciones
- ✅ **500 MB almacenamiento** - Más que suficiente para demo

---

## 📋 PASOS RÁPIDOS (5 minutos)

### 1️⃣ Crear Cuenta
```
1. Ve a https://planetscale.com
2. Click "Sign up"
3. Usa tu cuenta GitHub (más rápido)
4. Autoriza PlanetScale en GitHub
```

### 2️⃣ Crear Base de Datos
```
1. En tu dashboard, click "+ Create"
2. Nombre: stayevent
3. Región: US East (más cercana)
4. Plan: Hobby (FREE)
5. Click "Create database"
6. ⏳ Espera 30 segundos
```

### 3️⃣ Obtener Connection String
```
1. Abre la BD "stayevent"
2. Haz click en "Connect"
3. Selecciona "Node.js" en el dropdown
4. Copia la cadena completa (type: "mysql2")

La cadena se verá así:
mysql://user:password@host/stayevent?sslaccept=strict

⚠️ GUÁRDALA - La necesitas en .env
```

### 4️⃣ Crear Rama "main" (Obligatorio)
```
PlanetScale requiere ramas de desarrollo. Necesitas rama "main" para producción:

1. En tu BD "stayevent", ve a "Branches"
2. Deberías ver una rama aleatoria
3. Click en los 3 puntos (...) → "Promote to main"
4. O crea rama "main" directamente

¡Listo! Ahora está lista para usar
```

---

## 🔧 CONFIGURAR EN TU CÓDIGO

### Opción A: Connection String Directa (RECOMENDADO)

**1. Actualiza .env:**
```bash
# .env
DATABASE_URL=mysql://user:pass@host/stayevent?sslaccept=strict
PORT=3000
NODE_ENV=production
JWT_SECRET=tu-secreto-aleatorio-aqui
FRONTEND_URL=https://tuapp.azurestaticapps.net
```

**2. En config/db.js, cambia:**
```javascript
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  connectionString: process.env.DATABASE_URL,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = { pool };
```

### Opción B: Variables Separadas

**1. PlanetScale → Dashboard → Settings → Passwords**
- Crea una contraseña nueva
- Copia los valores que te da

**2. .env:**
```bash
DB_HOST=your-db-xxxx.psdb.cloud
DB_USER=yourcustomuser
DB_PASSWORD=your-generated-password
DB_NAME=stayevent
DB_PORT=3306
```

**3. config/db.js (sin cambios):**
```javascript
const mysql = require('mysql2');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = { pool };
```

---

## ✅ VERIFICAR CONEXIÓN

Prueba en tu terminal local:

```bash
cd server
npm install  # Si falta dependencia

node -e "
require('dotenv').config();
const mysql = require('mysql2/promise');
const pool = mysql.createPool({
  connectionString: process.env.DATABASE_URL
});

pool.getConnection()
  .then(() => console.log('✅ Conectado a PlanetScale!'))
  .catch(e => console.log('❌ Error:', e.message));
"
```

---

## 🎮 CONTROLAR LA BD (Apagar/Prender)

### Pausar (Para ahorrar recursos entre presentaciones)
```
1. Dashboard PlanetScale
2. Tu BD "stayevent"
3. Settings → General
4. Scroll → "Pause database"
5. Confirma
```

### Reanudar
```
1. Dashboard PlanetScale
2. Tu BD "stayevent" (mostrará "paused")
3. Settings → General
4. "Resume database"
5. ¡Listo en 5 segundos!
```

---

## 💰 COSTO

| Métrica | Hobby (FREE) | Límite |
|---------|-------------|--------|
| Almacenamiento | $0 | 500 MB |
| Conexiones | $0 | Ilimitado |
| Queries | $0 | Ilimitado |
| Backup | $0 | Semanal automático |
| Branch | $0 | 5 ramas máx |

✨ **$0 para producción pequeña/demo**

---

## 🆘 TROUBLESHOOTING

### "Connection timeout"
```
→ La BD está pausada
→ Solución: Reanuda en Settings
```

### "ER_NOT_SUPPORTED_AUTH_MODE"
```
→ Versión antigua de mysql2
→ Solución: npm update mysql2
```

### "SSL certificate problem"
```
→ Falta ?sslaccept=strict en la URL
→ Solución: Usa la connection string exacta de PlanetScale
```

### "Access denied for user"
```
→ Credenciales incorrectas
→ Solución: Copia nuevamente de PlanetScale → Connect
```

---

## 📚 RECURSOS

- [PlanetScale Docs](https://planetscale.com/docs)
- [MySQL to PlanetScale](https://planetscale.com/docs/reference/planetscale-migration-guide)
- [Precio (Free para siempre)](https://planetscale.com/pricing)

---

## 🎯 PRÓXIMAS PRESENTACIONES

Para tu siguiente presentación:

```bash
# 1. Pausa la BD (para no quemar créditos):
#    Settings → Pause database

# 2. El día de la presentación:
#    Resume database (5 segundos para activar)

# 3. Haz tu presentación

# 4. Pausa nuevamente

# ✨ TOTAL GASTADO: $0 siempre
```
