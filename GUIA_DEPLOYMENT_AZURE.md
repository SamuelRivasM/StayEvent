# 🚀 GUÍA COMPLETA: Desplegar StayEvent en Azure

## 📌 TABLA DE CONTENIDOS
1. [Fase 1: Configuración en Azure](#fase-1-configuración-en-azure)
2. [Fase 2: Preparar el código](#fase-2-preparar-el-código)
3. [Fase 3: Crear servicios en Azure](#fase-3-crear-servicios-en-azure)
4. [Fase 4: Conectar GitHub](#fase-4-conectar-github)
5. [Fase 5: Primer despliegue](#fase-5-primer-despliegue)

---

## FASE 1: Configuración en Azure

### Paso 1.1: Crear Grupo de Recursos
```
1. Abre https://portal.azure.com
2. Busca "Resource Groups" en la barra superior
3. Click en "+ Create"
4. Ingresa:
   - Subscription: Tu suscripción de estudiante
   - Resource group: stayevent-prod
   - Region: East US (más barato)
5. Click "Review + create" → "Create"
```

### Paso 1.2: Crear Base de Datos MySQL en Azure
```
1. En Azure Portal, busca "Azure Database for MySQL"
2. Click "+ Create"
3. Selecciona: Single Server
4. Ingresa en la pestaña "Basics":
   - Subscription: Tu suscripción
   - Resource group: stayevent-prod
   - Server name: stayevent-db-[tunombre]  (debe ser único)
   - Location: East US
   - Version: 8.0
   - Compute + storage: Basic tier, 1 vCore, 20 GB
   - Admin username: dbadmin
   - Password: Crea una segura (ej: Evento@2024ABC123)
   - Confirm password: Repite
5. Click "Next: Networking"
6. Conectividad: Allow access from Azure services = YES
7. Click "Review + create" → "Create"

⏳ Espera 5-10 minutos a que se cree la base de datos

💡 IMPORTANTE: Puedes PAUSAR esta BD cuando no la uses
   → Ahorro: $0 cuando está pausada
```

---

## FASE 2: Preparar el Código

### Paso 2.1: Crear el archivo .env en local
```
En tu carpeta server/, crea un archivo .env con:

DB_HOST=stayevent-db-[tunombre].mysql.database.azure.com
DB_USER=dbadmin@stayevent-db-[tunombre]
DB_PASSWORD=Evento@2024ABC123
DB_NAME=stayevent_db
DB_PORT=3306
PORT=3000
NODE_ENV=production
JWT_SECRET=GeneraUnaClaveAleatoriaAqui12345678
FRONTEND_URL=https://[tuapp].azurestaticapps.net
```

### Paso 2.2: Probar conexión en local
```bash
cd server
npm install
npm start
```
Si funciona sin errores, ¡todo bien!

### Paso 2.3: Hacer commit en GitHub
```bash
git add .
git commit -m "🔧 Configuración para Azure: workflows y .env.example"
git push origin main
```

---

## FASE 3: Crear Servicios en Azure

### Paso 3.1: Crear App Service para Backend (Node.js)
```
1. En Azure Portal, busca "App Services"
2. Click "+ Create"
3. Ingresa:
   - Subscription: Tu suscripción
   - Resource Group: stayevent-prod
   - Name: stayevent-backend
   - Publish: Code
   - Runtime stack: Node 18 LTS
   - Operating System: Linux
   - Region: East US
   - App Service plan: Crea nuevo
     - Plan name: stayevent-plan
     - Pricing tier: Free tier (para empezar)
4. Click "Review + create" → "Create"

⏳ Espera a que se cree (2 minutos)
```

### Paso 3.2: Crear Static Web App para Frontend (React)
```
1. En Azure Portal, busca "Static Web Apps"
2. Click "+ Create"
3. Ingresa:
   - Subscription: Tu suscripción
   - Resource Group: stayevent-prod
   - Name: stayevent-frontend
   - Hosting plan: Free
   - Region: East US
   - GitHub account: Connect (será redirigido)
   - Organization: Tu usuario GitHub
   - Repository: stayevent (o el nombre de tu repo)
   - Branch: main
4. Click "Next: Build"
5. Preset: React
6. App location: client

✨ RESULTADO: Todo GRATIS, SIN gastarte los créditos
7. Api location: (déjalo vacío por ahora)
8. Output location: build
9. Click "Review + create" → "Create"

⏳ Esto crea el workflow automáticamente
```

---

## FASE 4: Conectar GitHub (CI/CD Automation)

### Paso 4.1: Obtener Publish Profile del Backend
```
1. Abre tu App Service "stayevent-backend" en Azure Portal
2. Click en "Download publish profile" (arriba a la derecha)
3. Se descarga un archivo XML
```

### Paso 4.2: Agregar Secrets en GitHub
```
1. Ve a tu repositorio en GitHub
2. Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Agrega estos secretos:

   Nombre: AZURE_PUBLISH_PROFILE_BACKEND
   Valor: (Contenido completo del archivo XML descargado)
   
   Nombre: DB_PASSWORD
   Valor: (Tu contraseña de MySQL de Azure)
   
   Nombre: JWT_SECRET
   Valor: (Una clave aleatoria de 32+ caracteres)
```

### Paso 4.3: Configurar Variables de Entorno en App Service
```
1. Abre "stayevent-backend" en Azure Portal
2. Click en "Configuration" (en el menú izquierdo)
3. Click "+ New application setting"
4. Agrega cada variable:

   DB_HOST = stayevent-db-[tunombre].mysql.database.azure.com
   DB_USER = dbadmin@stayevent-db-[tunombre]
   DB_PASSWORD = (Tu contraseña)
   DB_NAME = stayevent_db
   DB_PORT = 3306
   NODE_ENV = production
   JWT_SECRET = (Tu secreto JWT)
   FRONTEND_URL = https://[tuapp].azurestaticapps.net
   
5. Click "Save" cada vez

💡 DATOS GUARDADOS EN AZURE DATABASE
```

---

## FASE 5: Primer Despliegue

### Paso 5.1: Hacer push a main
```bash
cd c:\Users\SAM\Desktop\StayEvent
git add .
git commit -m "🚀 Listo para producción en Azure"
git push origin main
```

### Paso 5.2: Monitorear despliegue
```
1. GitHub: Actions → Mira los workflows ejecutándose
2. Azure Portal: Abre tu App Service y ve a "Deployments"
```

### Paso 5.3: Probar endpoints
```
Backend: https://stayevent-backend.azurewebsites.net
Frontend: https://[tuapp].azurestaticapps.net
```

---

## 📱 IMPORTANTE: PAUSAR CUANDO NO USES

Para ahorrar créditos entre presentaciones:

1. **Pausa App Service** (Backend)
   - Azure Portal → App Service → Overview → Stop

2. **Pausa Database** (MySQL)
   - Azure Portal → Database → Overview → Stop

3. **Resultado**: $0 mientras está pausado

Consulta [PAUSAR_REANUDAR_AZURE.md](PAUSAR_REANUDAR_AZURE.md) para más detalles

---

## ✅ VERIFICACIÓN FINAL

- [ ] Base de datos creada en Azure
- [ ] App Service backend creado
- [ ] Static Web App frontend creada
- [ ] Secrets en GitHub configurados
- [ ] Variables de entorno en App Service
- [ ] Primer push a main hecho
- [ ] Workflows de GitHub Actions ejecutados
- [ ] Endpoints responden en Azure

---

## 🆘 TROUBLESHOOTING

### "Connection refused" a la BD
→ Verifica credenciales en App Service Configuration

### Frontend muestra errores CORS
→ Actualiza FRONTEND_URL en backend con la URL correcta

### Workflow falla en GitHub Actions
→ Revisa los logs en GitHub Actions tab

### App Service en Free tier muy lenta
→ Upgrade a plan pagado si necesitas mejor performance

---

## 💡 PRÓXIMAS MEJORAS
- [ ] Agregar CI/CD para pruebas automáticas
- [ ] Configurar monitoring y alertas
- [ ] Usar variables de entorno Key Vault
- [ ] Implementar backup automático de BD
