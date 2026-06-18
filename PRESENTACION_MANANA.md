# 📅 PLAN: 2 PRESENTACIONES (Mañana + Mes después)

## 🎯 TU CASO ESPECÍFICO

```
PRESENTACIÓN 1: Mañana (18 de Junio) 6:30 PM
PRESENTACIÓN 2: ~1 mes después (18 de Julio) 6:30 PM

Monitoreo: SOLO esos 2 días
Resto: TODO PAUSADO ($0)
```

---

## 💰 COSTO TOTAL ESTIMADO

### Presentación Mañana (18 Junio)

```
Encender:  ~3:00 PM
Apagar:    ~8:00 PM (después de presentación)

Tiempo encendido: 5 horas
Costo: 5 horas × $0.76/hora = $3.80

╔════════════════════════════════════════╗
║ Presentación 1 Costo: ~$3.80           ║
╚════════════════════════════════════════╝
```

### Presentación Mes Después (18 Julio)

```
Encender:  ~3:00 PM
Apagar:    ~8:00 PM

Tiempo encendido: 5 horas
Costo: 5 horas × $0.76/hora = $3.80

╔════════════════════════════════════════╗
║ Presentación 2 Costo: ~$3.80           ║
╚════════════════════════════════════════╝
```

### TOTAL 2 PRESENTACIONES

```
Presentación 1: $3.80
Presentación 2: $3.80
───────────────────────
TOTAL:          $7.60

Créditos iniciales: $100
Créditos restantes: $92.40 ✨

AHORRO: 92.4% de créditos conservados
```

---

## 📋 QUÉ HACER HOY (Antes de mañana)

### HOY (18 de Junio - Ahora)

```bash
# ⏰ HORA: Ahora mismo (antes de 3 PM)

# 1. CREA SERVICIOS EN AZURE (si aún no los creaste)
#    - Grupo de recursos
#    - Database for MySQL
#    - App Service (backend)
#    - Static Web Apps (frontend)
#    
#    ⏳ Tiempo: ~45 minutos

# 2. CONFIGURA VARIABLES
#    - .env local (server/.env)
#    - Secrets en GitHub
#    - Configuration en App Service
#    
#    ⏳ Tiempo: ~15 minutos

# 3. PRIMER GIT PUSH
#    git add .
#    git commit -m "🚀 Despliegue Azure - Presentación mañana"
#    git push origin main
#    
#    ⏳ Tiempo: ~5 minutos
#    ⏳ Espera a que GitHub Actions termine

# 4. VERIFICA QUE TODO ESTÉ WORKING
#    - ¿GitHub Actions completó?
#    - ¿URLs responden?
#    - ¿Base de datos conecta?
#    
#    ⏳ Tiempo: ~5 minutos
```

**⏰ TOTAL HOY: ~70 minutos**

---

## 📱 MAÑANA: DÍA DE PRESENTACIÓN

### MAÑANA 3:00 PM (Antes de presentación)

```bash
# 🟢 REANUDA SERVICIOS

# 1. Abre Azure Portal
#    https://portal.azure.com

# 2. Reanuda Database
#    Tu recurso Database → Overview → "Start" button
#    ⏳ Espera: 30 segundos

# 3. Reanuda App Service
#    Tu App Service → Overview → "Start" button
#    ⏳ Espera: 10 segundos

# 4. Verifica funcionamiento (3:30 PM)
#    Abre tu aplicación en navegador
#    ✅ ¿Carga?
#    ✅ ¿Funciona?
#    ✅ ¿BD conecta?
#    
#    Si hay problemas:
#    - Espera 1 minuto más
#    - Recarga la página
#    - Verifica variables en App Service
```

### MAÑANA 6:30 PM - 7:30 PM (Presentación)

```bash
# 🎤 PRESENTA

# Todo estará funcionando:
# ✅ Frontend cargará rápido
# ✅ Backend responderá solicitudes
# ✅ BD guardará datos
# ✅ Puedes mostrar todo al docente
```

### MAÑANA 7:30 PM - 8:00 PM (Después)

```bash
# ⏸️ PAUSA SERVICIOS (INMEDIATO)

# 1. Abre Azure Portal
#    https://portal.azure.com

# 2. Pausa Database
#    Tu recurso Database → Overview → "Stop" button
#    ⏳ Tiempo: Inmediato

# 3. Pausa App Service
#    Tu App Service → Overview → "Stop" button
#    ⏳ Tiempo: Inmediato

# 4. Verifica estado
#    Ambos deberían mostrar "Stopped"
#    ✅ Perfecto, $0 hasta el mes que viene
```

---

## 📅 ENTRE PRESENTACIONES (19 Junio - 17 Julio)

```
┌──────────────────────────────────────┐
│ 29 DÍAS TODO PAUSADO                 │
├──────────────────────────────────────┤
│ ⏸️ Database    → Stopped              │
│ ⏸️ App Service → Stopped              │
│ ⚪ Frontend    → Static (siempre $0)  │
│                                      │
│ 💰 COSTO: $0                          │
│ 🔄 ESTADO: Seguro, datos preservados │
└──────────────────────────────────────┘
```

---

## 🗓️ DÍA 2: PRESENTACIÓN EN UN MES (18 Julio)

### 18 Julio 3:00 PM (Repite lo mismo)

```bash
# 🟢 REANUDA SERVICIOS NUEVAMENTE

# 1. Azure Portal → Database → "Start"
# 2. Azure Portal → App Service → "Start"
# 3. Espera 1 minuto
# 4. Abre tu app - ¿Funciona? ✅
# 5. ¡PRESENTA!
```

### 18 Julio 7:30 PM (Pausa nuevamente)

```bash
# ⏸️ PAUSA TODO

# 1. Azure Portal → Database → "Stop"
# 2. Azure Portal → App Service → "Stop"
# 3. ✅ Listo, $0 nuevamente
```

---

## ✅ TIMELINE VISUAL

```
HOY (18 Junio)
├─ 14:00 (2:00 PM) → Crea servicios Azure
├─ 14:45 (2:45 PM) → Configura variables
├─ 15:00 (3:00 PM) → Git push
├─ 15:10 (3:10 PM) → Verifica funcionamiento
│
MAÑANA (19 Junio)
├─ 15:00 (3:00 PM) → REANUDA SERVICIOS
├─ 15:40 (3:40 PM) → Prueba todo
├─ 18:30 (6:30 PM) → 🎤 PRESENTACIÓN EMPIEZA
├─ 19:30 (7:30 PM) → PAUSA SERVICIOS
│
DÍAS 20-47 (20 Junio - 17 Julio)
├─ TODO PAUSADO = $0/día
│
DÍA 48 (18 Julio)
├─ 15:00 (3:00 PM) → REANUDA SERVICIOS
├─ 15:40 (3:40 PM) → Prueba todo
├─ 18:30 (6:30 PM) → 🎤 PRESENTACIÓN EMPIEZA
├─ 19:30 (7:30 PM) → PAUSA SERVICIOS
```

---

## 📊 DESGLOSE FINAL

```
ACTIVIDAD              COSTO/HORA    HORAS    TOTAL
─────────────────────────────────────────────────────
18 Junio (Setup+Demo)  $0.76         5h       $3.80
19-47 Junio (Pausado)  $0            29 días  $0
18 Julio (Demo)        $0.76         5h       $3.80
Resto de año (Pausado) $0            ...      $0
═════════════════════════════════════════════════════
TOTAL 1 AÑO PLANIFICADO                       $7.60

CRÉDITOS INICIALES: $100
CRÉDITOS GASTADOS: $7.60
CRÉDITOS RESTANTES: $92.40 ✨

PORCENTAJE AHORRADO: 92.4%
```

---

## 🎯 PASOS EXACTOS HOY MISMO

### Paso 1: Verifica que tu código esté listo

```bash
cd c:\Users\SAM\Desktop\StayEvent
git status

# Deberías ver:
# - .github/workflows/ con 2 archivos YML
# - .env.example con variables
# - Código en rama main
```

### Paso 2: Crear servicios en Azure (45 min)

```
1. Azure Portal → "+ Create"
2. Recurso: Resource Group
   Nombre: stayevent-prod
   Región: East US
   
3. Recurso: Azure Database for MySQL
   Servidor: stayevent-db-[tunombre]
   Plan: Basic Tier (1 vCore)
   
4. Recurso: App Service
   Nombre: stayevent-backend
   Runtime: Node 18 LTS
   Plan: Free
   
5. Recurso: Static Web Apps
   Nombre: stayevent-frontend
   Framework: React
   App location: client
```

### Paso 3: Configurar variables (15 min)

**En server/.env:**
```
DB_HOST=stayevent-db-[tunombre].mysql.database.azure.com
DB_USER=dbadmin@stayevent-db-[tunombre]
DB_PASSWORD=[TuContraseña]
DB_NAME=stayevent_db
DB_PORT=3306
PORT=3000
NODE_ENV=production
JWT_SECRET=[ClaveAleatoria32+caracteres]
FRONTEND_URL=https://[tuapp].azurestaticapps.net
```

**En GitHub → Settings → Secrets:**
```
AZURE_PUBLISH_PROFILE_BACKEND = [Descargado de App Service]
```

**En App Service → Configuration:**
```
Agrega las mismas variables del .env
```

### Paso 4: Git push (5 min)

```bash
git add .
git commit -m "🚀 Setup Azure para presentaciones"
git push origin main

# Espera a que GitHub Actions termine
```

### Paso 5: Verifica (5 min)

```bash
# Abre:
# - https://stayevent-backend.azurewebsites.net
# - https://[tuapp].azurestaticapps.net

# ¿Funciona todo?
```

---

## ⏰ TIMING CRÍTICO PARA MAÑANA

```
MAÑANA:
├─ 3:00 PM  → START Database      (⏳ 30 seg)
├─ 3:01 PM  → START App Service   (⏳ 10 seg)
├─ 3:10 PM  → Verifica funciona
├─ 6:30 PM  → 🎤 PRESENTACIÓN
├─ 7:30 PM  → STOP Database       (⏳ 2 seg)
└─ 7:31 PM  → STOP App Service    (⏳ 2 seg)

⏰ TOTAL ENCENDIDO: 4.5 horas
💰 COSTO: ~$3.50
```

---

## 🆘 SI ALGO FALLA MAÑANA

### Problema: "Connection refused"

```
1. Verifica que Database está "Running"
2. Verifica que App Service está "Running"
3. Espera 2 minutos más
4. Recarga página
```

### Problema: "Application error"

```
1. Verifica variables de entorno en App Service
2. Recarga la página
3. Copia la URL exacta en navegador
```

### Problema: "Database connection timeout"

```
1. Verifica credenciales en App Service Configuration
2. Database debería estar en estado "Running"
3. Intenta reconectar
```

### Problema: No funcionó nada

```
1. No entres en pánico
2. Llama/escribe al docente explicando:
   "Tenía problemas técnicos con Azure, 
    aquí está el código en GitHub [enlace]
    Funciona en local perfectamente"
3. Muestra el repositorio GitHub con todo el código
```

---

## 📝 CHECKLIST: ANTES DE MAÑANA

### HOY (Ahora)
- [ ] Servicios creados en Azure
- [ ] Variables de entorno configuradas
- [ ] Secrets en GitHub agregados
- [ ] Primer git push completado
- [ ] GitHub Actions terminó exitosamente
- [ ] URLs abiertas y funcionan
- [ ] Base de datos conecta

### MAÑANA (3:00 PM)
- [ ] Reanuda Database
- [ ] Reanuda App Service
- [ ] Verifica funcionamiento
- [ ] Abre URLs - ¿OK?
- [ ] Prueba agregar/editar datos

### MAÑANA (7:30 PM)
- [ ] Pausa Database
- [ ] Pausa App Service
- [ ] Verifica estado: Stopped

---

## 💡 CONSEJOS FINALES

✅ **Haz todo HOY** - No dejes para mañana
✅ **Reanuda 30 min antes** - Mejor tener margen
✅ **Prueba bien antes** - Verifica sin apuros
✅ **Pausa después** - Inmediatamente
✅ **Duerme tranquilo** - Todo está seguro

---

## 🚀 ACCIÓN INMEDIATA

1. Abre [GUIA_DEPLOYMENT_AZURE.md](GUIA_DEPLOYMENT_AZURE.md)
2. Sigue los pasos de FASE 1-5 HOY
3. Mañana solo pausas/reanudas con clicks
4. ¡Éxito en presentación! 🎉

**¡Tienes 3-4 horas para setup!** Puedes hacerlo 💪
