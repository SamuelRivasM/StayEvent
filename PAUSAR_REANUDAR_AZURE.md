# ⏸️ PAUSAR Y REANUDAR SERVICIOS EN AZURE

## 🎯 CONCEPTO CLAVE
**Cuando pausas un servicio en Azure = $0 de costo**

Esto es perfecto para presentaciones ocasionales. No necesitas estar pagando $25/mes si solo lo usas 1-2 días.

---

## 🎮 GUÍA RÁPIDA: PAUSAR TODO

### OPCIÓN 1: Pausa Total (Más Económico)

```bash
# ✋ DÍA ANTES DE PRESENTACIÓN:

# 1. Pausa Database
Azure Portal → Tu Database → Overview → Stop
⏳ Espera 10 segundos

# 2. Pausa App Service (Backend)
Azure Portal → Tu App Service → Overview → Stop
⏳ Espera 5 segundos

# 3. Static Web Apps (Frontend)
⚠️ No necesita pausarlo manualmente
   (Free tier no cuesta nada)
```

### OPCIÓN 2: Reanuda (Día de Presentación)

```bash
# 🟢 DÍA DE PRESENTACIÓN (30 min antes):

# 1. Reanuda Database
Azure Portal → Tu Database → Overview → Start
⏳ Espera 30 segundos (más lento)

# 2. Reanuda App Service
Azure Portal → Tu App Service → Overview → Start
⏳ Espera 10 segundos

# 3. Verifica conexión
curl https://stayevent-backend.azurewebsites.net/health
# Debería responder ✅ OK

# 4. ¡Presenta!
```

### OPCIÓN 3: Pausa Nuevamente (Después)

```bash
# 🛑 DESPUÉS DE PRESENTACIÓN:

# 1. Pausa Database
Azure Portal → Tu Database → Overview → Stop

# 2. Pausa App Service
Azure Portal → Tu App Service → Overview → Stop

# 3. Resultado: $0 hasta la próxima presentación
```

---

## 📊 TIMELINE DE COSTOS

### Escenario: 4 Presentaciones en 3 Meses

```
Mes 1:
├─ Días 1-19: TODO PAUSADO = $0
├─ Día 20: Presentación (encendido 3 horas) = $2
├─ Días 21-30: TODO PAUSADO = $0
Subtotal: $2

Mes 2:
├─ Días 1-14: TODO PAUSADO = $0
├─ Día 15: Presentación (encendido 3 horas) = $2
├─ Días 16-29: TODO PAUSADO = $0
Subtotal: $2

Mes 3:
├─ Días 1-10: TODO PAUSADO = $0
├─ Día 11: Presentación (encendido 3 horas) = $2
├─ Días 12-20: TODO PAUSADO = $0
├─ Día 21: Presentación (encendido 3 horas) = $2
├─ Días 22-31: TODO PAUSADO = $0
Subtotal: $4

TOTAL 3 MESES: ~$8 de créditos gastados
Créditos Iniciales: $100
Créditos Restantes: $92 ✨
```

---

## 🔄 ESTADO DE SERVICIOS

### Cómo Verificar si Está Pausado/Activo

**En Azure Portal:**
```
1. App Service → Overview
   Estado mostrado:
   - Verde "Running" = Activo ($0.012/hora)
   - Gris "Stopped" = Pausado ($0)

2. Database → Overview
   Estado mostrado:
   - Verde = Activo (~$0.76/hora)
   - Gris/Stopped = Pausado ($0)
```

**Por Terminal (Powershell):**
```powershell
# Verificar App Service
az appservice show --name stayevent-backend `
  --resource-group stayevent-prod `
  --query "state"

# Respuesta: "Running" o "Stopped"
```

---

## ⚡ AUTOMATIZACIÓN: Script Pausar/Reanudar

### Para Windows PowerShell

```powershell
# ⏸️ pause-azure-services.ps1

$resourceGroup = "stayevent-prod"
$appServiceName = "stayevent-backend"
$databaseName = "stayevent-db-[tunombre]"

Write-Host "⏸️ Pausando servicios..."

# Pausa App Service
Write-Host "Pausando App Service..."
az appservice stop --name $appServiceName --resource-group $resourceGroup
Write-Host "✅ App Service pausado"

# Pausa Database
Write-Host "Pausando Database..."
az mysql server stop --name $databaseName --resource-group $resourceGroup
Write-Host "✅ Database pausada"

Write-Host "✨ Todos los servicios pausados. Costo ahora: $0"
```

```powershell
# 🟢 resume-azure-services.ps1

$resourceGroup = "stayevent-prod"
$appServiceName = "stayevent-backend"
$databaseName = "stayevent-db-[tunombre]"

Write-Host "🟢 Reanudando servicios..."

# Reanuda Database (toma más tiempo)
Write-Host "Reanudando Database (espera 30 seg)..."
az mysql server start --name $databaseName --resource-group $resourceGroup
Start-Sleep -Seconds 30
Write-Host "✅ Database reanudada"

# Reanuda App Service
Write-Host "Reanudando App Service..."
az appservice start --name $appServiceName --resource-group $resourceGroup
Write-Host "✅ App Service reanudado"

Write-Host "✨ Servicios listos para presentación"
```

**Uso:**
```bash
# Descargar scripts en raíz del proyecto
# Luego:

# Pausar:
./pause-azure-services.ps1

# Reanudar:
./resume-azure-services.ps1
```

---

## 📱 CHECKLIST: ANTES DE CADA PRESENTACIÓN

### 30 Minutos Antes
- [ ] Reanuda Database (30 seg - toma más tiempo)
- [ ] Reanuda App Service (10 seg)
- [ ] Espera 1 minuto total
- [ ] Prueba: Abre URL en navegador
- [ ] ¿Carga? → ✅ Listo

### Después de Presentación
- [ ] Pausa App Service (inmediato)
- [ ] Pausa Database (inmediato)
- [ ] Verifica estado: Ambos en "Stopped"
- [ ] ✅ Créditos seguros

---

## 💡 TIPS

### ¿Qué pasa si olvido pausar?
```
- Si está encendido 24/7 durante un mes
- Costo: ~$25 + algunos pesos extra
- Solución: Pausa en cualquier momento
- El costo se calcula por hora
```

### ¿Qué pasa si la Database está pausada pero intento conectar?
```
- Error: "Connection timeout"
- Solución: Reanuda la database primero
- Toma ~30 segundos
- Luego intenta de nuevo
```

### ¿Se pierden los datos si pauso?
```
- NO se pierden datos
- Pausa = Solo se detiene
- Reanuda = Todo sigue como estaba
- Es seguro 100%
```

### ¿Puedo pausar solo la Database?
```
- SÍ, perfectamente
- Pausa Database = $0
- Mantén App Service activo si quieres
- Pero App Service solo cuesta $0 en free tier
```

---

## 📊 COMPARATIVA: OPCIONES

| Opción | Costo/Mes | Encendido | Pausado | Ideal Para |
|--------|-----------|----------|---------|-----------|
| **24/7 Encendido** | ~$25 | Siempre | N/A | Producción real |
| **Pausar entre presentaciones** | ~$5-8 | Solo demos | Sí | 🌟 **Tu caso** |
| **Pausa total** | ~$2-3 | 1 vez/mes | Sí | Presupuesto muy apretado |

---

## 🎯 RECOMENDACIÓN FINAL

```
✅ Usa Azure 100% (sin cambios)
✅ Pausa todo entre presentaciones
✅ Costo real: ~$5-10 en 3 meses
✅ Créditos: ~$90 conservados
✅ Automatización: Scripts de pausa/reanudación
✅ Todo en un solo lugar: Portal Azure
```

---

## 📞 SOPORTE

Si algo no funciona:
1. Verifica estado en Azure Portal
2. Si está "Stopped", espera 1 minuto y reanuda
3. Si no conecta, revisa variables de entorno
4. Si persiste, cuéntame qué error ves
