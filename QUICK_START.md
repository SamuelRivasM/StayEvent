# ⚡ QUICK START - Costo Cero (TL;DR)

## 🎯 EN 1 HORA: PRODUCCIÓN SIN GASTAR

### 0️⃣ PRE: Tener Listos
- ✅ Repo en GitHub (público o privado)
- ✅ Código en rama `main`
- ✅ Cuenta Azure (con créditos de estudiante)

---

### 1️⃣ CREA BD GRATIS (5 min)
```bash
# Ve a https://planetscale.com
# 1. Sign up → GitHub
# 2. "+ Create" → BD "stayevent"
# 3. Copy Connection String

# Ejemplo:
# mysql://user:pass@host/stayevent?sslaccept=strict
```

### 2️⃣ CONFIGURA .env LOCAL (2 min)
```bash
# server/.env

DATABASE_URL=mysql://user:pass@host/stayevent?sslaccept=strict
PORT=3000
NODE_ENV=production
JWT_SECRET=algo-aleatorio-min-32-caracteres
FRONTEND_URL=https://tuapp.azurestaticapps.net
```

### 3️⃣ CREA EN AZURE (10 min)
```
A. Grupo de recursos: "stayevent-prod"

B. App Service (Backend)
   Nombre: stayevent-backend
   Runtime: Node 18 LTS
   Plan: FREE

C. Static Web Apps (Frontend)
   Nombre: stayevent-frontend
   Framework: React
   App location: client
   Build location: build
```

### 4️⃣ CONECTA SECRETS (5 min)
**En GitHub → Settings → Secrets:**
```
AZURE_PUBLISH_PROFILE_BACKEND = [Descarga de App Service]
```

**En Azure App Service → Configuration:**
```
DATABASE_URL = [Tu PlanetScale URL]
JWT_SECRET = [Tu secreto]
NODE_ENV = production
FRONTEND_URL = [URL Static Web App]
```

### 5️⃣ PUSH = LISTO (5 min)
```bash
git add .
git commit -m "🎉 Deploy Costo Cero"
git push origin main

# ✨ GitHub Actions se ejecuta automáticamente
# ✨ En 3-5 minutos está en vivo
```

---

## 🔗 URLS FINALES

```
Frontend: https://[nombre].azurestaticapps.net
Backend:  https://stayevent-backend.azurewebsites.net
```

---

## 📊 COSTO

| Concepto | Precio |
|----------|--------|
| Total/Mes | **$0** |
| Créditos Gastados | **$0** |
| ✅ Está en Producción | **SÍ** |
| ✅ Está Automatizado | **SÍ** |
| ✅ Se Pausa/Reanuda | **SÍ** |

---

## 🎮 PARA PRESENTACIONES

```bash
# DÍA DE PRESENTACIÓN
1. PlanetScale → Resume (5 seg)
2. Abre URL → Funciona
3. Muestra al docente
4. PlanetScale → Pause (mantiene créditos)

# ✨ Haz esto 10 veces = $0 siempre
```

---

## 📚 ARCHIVOS REFERENCIA

- [COSTO_CERO_SOLUCION.md](COSTO_CERO_SOLUCION.md) - Completo
- [PLANETSCALE_SETUP.md](PLANETSCALE_SETUP.md) - Detalle PlanetScale
- [GUIA_DEPLOYMENT_AZURE.md](GUIA_DEPLOYMENT_AZURE.md) - Paso a paso Azure
- [COSTOS_Y_CHECKLIST.md](COSTOS_Y_CHECKLIST.md) - Validación

---

## ❓ DUDAS

**P: ¿Realmente $0?**
A: Sí, 100% gratis. PlanetScale $0, Azure Free tier.

**P: ¿Puedo pausarlo?**
A: Sí, PlanetScale pause en Settings (5 segundos).

**P: ¿Mis créditos quedan intactos?**
A: Sí, no gastas nada. 100% intactos.

**P: ¿Cuánto tiempo tarda todo?**
A: Setup completo = 60 minutos máximo.

**P: ¿Si falla, qué hago?**
A: Lee logs en GitHub Actions, cuéntame paso exacto.

---

## 🚀 LISTO?

1. Abre [PLANETSCALE_SETUP.md](PLANETSCALE_SETUP.md)
2. Sigue paso a paso
3. Si algo no funciona, cuéntame
4. ✨ En 1 hora tienes producción

¡Vamos! 🎉
