#  AHORA: CHECKLIST DE ACCIÓN (3-4 horas)

```
 TIEMPO DISPONIBLE: ~3-4 horas hasta las 6-7 PM
 PRESENTACIÓN: MAÑANA 6:30 PM
 OBJETIVO: Todo deployado y probado antes de dormir
```

---

##  CHECKLIST PASO A PASO

### ✅ FASE 1: VERIFICAR CÓDIGO (5 min)

```bash
# 1. Abre terminal en: c:\Users\SAM\Desktop\StayEvent

cd c:\Users\SAM\Desktop\StayEvent

# 2. Verifica estado Git
git status

# 3. Verifica que existan:
#    - .github/workflows/deploy-backend.yml
#    - .github/workflows/deploy-frontend.yml
#    - .env.example

# RESULTADO ESPERADO: Todo debe estar en verde
✅ Si ves: "nothing to commit" → Perfecto, continúa
❌ Si ves: cambios sin hacer push → Haz: git add . && git commit -m "setup" && git push
```

---

### ✅ FASE 2: CREAR SERVICIOS AZURE (45 min)

**ABRE NUEVA PESTAÑA: https://portal.azure.com**

#### Paso 2.1: Crear Resource Group (5 min)

```
1. Click "+ Create a resource"
2. Busca: "Resource group"
3. Click "Create"
4. INGRESA:
   - Subscription: Tu suscripción (estudiante)
   - Resource group name: stayevent-prod
   - Region: East US
5. Click "Review + create" → "Create"
```

#### Paso 2.2: Crear Database MySQL (15 min)

```
1. Click "+ Create a resource"
2. Busca: "Azure Database for MySQL"
3. Click "Single Server" → "Create"
4. INGRESA en "Basics":
   - Subscription: Tu suscripción
   - Resource Group: stayevent-prod
   - Server name: stayevent-db-[TU_USUARIO]
     (ejemplo: stayevent-db-sam)
   - Location: East US
   - Version: 8.0
5. Click "Next: Pricing tier"
6. Selecciona: Basic tier (1 vCore, 20 GB)
7. Click "Configure"
8. Continuación en "Compute + Storage"
9. Username: dbadmin
10. Password: CreaTuContraseña!123
    (Guárdalo, lo necesitarás)
11. Click "Review + create" → "Create"

⏳ ESPERA: 5-10 minutos a que se cree
(Puedes hacer otros pasos mientras esperas)
```

#### Paso 2.3: Crear App Service (10 min)

```
1. Click "+ Create a resource"
2. Busca: "App Service"
3. Click "Create"
4. INGRESA:
   - Subscription: Tu suscripción
   - Resource Group: stayevent-prod
   - Name: stayevent-backend
   - Publish: Code
   - Runtime Stack: Node 18 LTS
   - Operating System: Linux
   - Region: East US
5. Click "Next: App Service Plan"
6. Click "Create new"
   Plan name: stayevent-plan
   Sku: Free F1
7. Click "Review + create" → "Create"

⏳ ESPERA: 2 minutos
```

#### Paso 2.4: Crear Static Web Apps (10 min)

```
1. Click "+ Create a resource"
2. Busca: "Static Web Apps"
3. Click "Create"
4. INGRESA:
   - Subscription: Tu suscripción
   - Resource Group: stayevent-prod
   - Name: stayevent-frontend
   - Plan Type: Free
   - Region: East US
   - GitHub account: "Sign in with GitHub"
   (Autoriza si es necesario)
5. Repository: [TU_USUARIO]/stayevent
6. Branch: main
7. Build presets: React
   - App location: client
   - Api location: (déjalo vacío)
   - Output location: build
8. Click "Review + create" → "Create"

⏳ Esto crea automáticamente el workflow
```

**✅ FASE 2 COMPLETA** ✅

---

### ✅ FASE 3: CONFIGURAR VARIABLES (15 min)

#### Paso 3.1: Crear .env en local

```bash
# En VS Code, crea: server/.env

# CONTENIDO:
DB_HOST=stayevent-db-sam.mysql.database.azure.com
DB_USER=dbadmin@stayevent-db-sam
DB_PASSWORD=TuContraseña!123
DB_NAME=stayevent_db
DB_PORT=3306
PORT=3000
NODE_ENV=production
JWT_SECRET=GeneraUnaClaveAleatoria123456789012345
FRONTEND_URL=https://[tuapp].azurestaticapps.net

# ⚠️ REEMPLAZA:
# - stayevent-db-sam → con tu nombre de servidor
# - TuContraseña!123 → con la contraseña que creaste
# - [tuapp] → con el nombre de tu Static Web App
```

#### Paso 3.2: Obtener Publish Profile

```
1. Ve a Azure Portal
2. App Service → stayevent-backend
3. Arriba a la derecha: "Download publish profile"
4. Se descarga un archivo XML
5. GUARDA este archivo: Lo necesitas en GitHub
```

#### Paso 3.3: Agregar Secrets en GitHub

```
1. Ve a: https://github.com/[TU_USUARIO]/stayevent
2. Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. INGRESA:

   Secret #1:
   Name: AZURE_PUBLISH_PROFILE_BACKEND
   Value: (Contenido COMPLETO del archivo XML)
   Click "Add secret"

   Secret #2:
   Name: DB_PASSWORD
   Value: TuContraseña!123
   Click "Add secret"

   Secret #3:
   Name: JWT_SECRET
   Value: GeneraUnaClaveAleatoria123456789012345
   Click "Add secret"
```

#### Paso 3.4: Configurar App Service

```
1. Azure Portal → App Service → stayevent-backend
2. Configuration (en menú izquierdo)
3. Click "+ New application setting"

AGREGA CADA UNA (repite para cada una):

1. DB_HOST = stayevent-db-sam.mysql.database.azure.com
2. DB_USER = dbadmin@stayevent-db-sam
3. DB_PASSWORD = TuContraseña!123
4. DB_NAME = stayevent_db
5. DB_PORT = 3306
6. NODE_ENV = production
7. JWT_SECRET = GeneraUnaClaveAleatoria123456789012345
8. FRONTEND_URL = https://[tuapp].azurestaticapps.net

Para cada una: Click "Save"
```

**✅ FASE 3 COMPLETA** ✅

---

### ✅ FASE 4: GIT PUSH (5 min)

```bash
# En terminal de VS Code:

cd c:\Users\SAM\Desktop\StayEvent

git add .
git commit -m "🚀 Setup Azure para presentación mañana"
git push origin main

# ESPERA a que termine (30-60 segundos)
```

---

### ✅ FASE 5: VERIFICAR DESPLIEGUE (10 min)

```
1. GitHub → Tu repo → Actions
   ¿Ves el workflow ejecutándose?
   ¿Ves estado "completed"?
   
2. Si está rojo (error):
   - Haz click en el workflow
   - Ve los logs
   - Busca el error
   - Corrígelo y repite git push

3. Si está verde (✅):
   - Excelente, continúa
```

---

### ✅ FASE 6: PRUEBA DE FUNCIONAMIENTO (10 min)

```
1. Ve a Azure Portal
2. App Service → stayevent-backend → Overview
   Copia la URL

3. Abre en navegador:
   https://stayevent-backend.azurewebsites.net
   
   ¿Qué ves?
   - ✅ Si ves la API funcionando → PERFECTO
   - ❌ Si ves error → Espera 2 min y recarga
   - ❌ Si persiste → Verifica variables de entorno

4. Static Web Apps → stayevent-frontend
   Copia la URL
   
5. Abre en navegador:
   https://[tuapp].azurestaticapps.net
   
   ¿Se carga tu app React?
   - ✅ SÍ → PERFECTO
   - ❌ NO → Espera 2 min y recarga
```

---

## 📊 TIEMPO TOTAL

```
Fase 1 (Código):        5 minutos
Fase 2 (Azure):         45 minutos ⏳ (+ esperas)
Fase 3 (Variables):     15 minutos
Fase 4 (Git):           5 minutos
Fase 5 (Verificar):     10 minutos
Fase 6 (Pruebas):       10 minutos
─────────────────────────────────
TOTAL:                  ~90 minutos (1.5 horas)

+ Esperas de Azure:     ~15 minutos

TIEMPO REAL:            ~105 minutos (1.75 horas)
```

---

## ✅ FINAL CHECKLIST

### Antes de Dormir Hoy:

- [ ] Servicios creados en Azure (4 recursos)
- [ ] Variables configuradas (8 + secrets)
- [ ] Git push completado
- [ ] GitHub Actions terminó (✅)
- [ ] URLs funcionan en navegador
- [ ] Base de datos conecta
- [ ] Frontend carga

### Mañana 3:00 PM:

- [ ] Reanuda Database (START)
- [ ] Reanuda App Service (START)
- [ ] Espera 1 minuto
- [ ] Prueba URLs
- [ ] ✅ Listo para presentar

### Mañana 7:30 PM:

- [ ] Pausa Database (STOP)
- [ ] Pausa App Service (STOP)
- [ ] ✅ $0 hasta el mes que viene

---

## 🆘 AYUDA RÁPIDA

**Problema: "¿Cuál es mi nombre de servidor?"**
→ Azure Portal → Database → Overview → muestra "Server name"

**Problema: "¿Cuál es la contraseña?"**
→ La que creaste durante setup de Database

**Problema: "¿Dónde está el publish profile?"**
→ App Service → Download publish profile (botón arriba a la derecha)

**Problema: "¿Cuál es la URL del Static Web App?"**
→ Static Web App → Overview → Copia "URL"

**Problema: "GitHub Actions se ejecuta pero falla"**
→ Settings → Secrets → Verifica que esté el AZURE_PUBLISH_PROFILE_BACKEND

---

## ⚡ RESUMEN SUPER RÁPIDO

```
HOY EN 90 MINUTOS:

1. Crea 4 servicios en Azure
   (Database, App Service, Static Web App, Resource Group)

2. Configura 8 variables de entorno
   (DB_HOST, DB_USER, DB_PASSWORD, etc.)

3. Agrega 3 secrets en GitHub
   (Publish profile, password, JWT secret)

4. Haz git push
   (GitHub Actions se ejecuta automáticamente)

5. Verifica que funcione
   (Abre URLs, todo debe responder)

6. Duerme tranquilo
   (Mañana solo pausas/reanudas)
```

---

## 🎯 ¿LISTO?

1. **AHORA**: Lee este checklist completo
2. **EN 5 MIN**: Abre Azure Portal
3. **EN 90 MIN**: Todo deployado
4. **MAÑANA**: Presentación exitosa
5. **DESPUÉS**: Pausa y ahorros

¡VAMOS! 🚀

**¿PREGUNTAS SOBRE ALGÚN PASO? Cuéntame y te lo resuelvo** ⚡
