# 💰 Estimación de Costos - Azure para StayEvent

## Créditos de Estudiante
- **Cantidad**: $100 USD (típicamente)
- **Duración**: 12 meses
- **Suficiente para**: Una aplicación completa en producción

---

## Desglose de Costos Mensuales

| Servicio | Tier | Costo/mes (pausado) | Costo si está encendido 24/7 |
|----------|------|---------------------|------------------------------|
| **Static Web Apps** | Free | **$0** | **$0** |
| **App Service** | Free | **$0** | **$0** (free tier) |
| **Database MySQL** | Basic | **$0** (pausado) | **~$25** |
| **Total** | | **$0 (pausado)** | **~$25 (24/7 encendido)** |

### 🎯 ESTRATEGIA PARA AHORRAR
```
Encender: Día de presentación (2-3 horas)
Apagado: Resto de los días

Costo real: ~$1-2 por presentación
4 presentaciones = ~$5-8 de créditos
```

### Con crédito de estudiante:
- Tienes **$100** por año
- Esto te cubre **3-4 meses completos**
- Después: negocia renovación o downgrade

---

## ✅ SOLUCIÓN: AZURE 100% + PAUSABLE

### 🎯 SÍ, PUEDES APAGAR TODO EN AZURE

Azure permite pausar/reanudar servicios SIN COSTO cuando están detenidos:

#### **APP SERVICE (Backend)**
```
✅ Se pausa/reactiva en 5 segundos
✅ Sin costo cuando está pausado
✅ Reanuda instantáneamente

Pausa: Portal → App Service → Stop
Reanuda: Portal → App Service → Start
```

#### **DATABASE FOR MYSQL**
```
✅ Se puede pausar (opción en settings)
✅ Sin costo mientras esté pausado
✅ Se reanuda en 10-30 segundos

Pausa: Portal → Database → Stop
Reanuda: Portal → Database → Start
```

#### **STATIC WEB APPS**
```
✅ Free tier = casi sin costo
✅ Se pausa automáticamente sin tráfico
✅ Reanuda al recibir solicitud

Ventaja: No necesita pausarlo manualmente
```

---

## 🎯 RECOMENDACIÓN: TODO EN AZURE

**Porque:**
- ✅ Todo en el mismo entorno
- ✅ Sin dependencias externas
- ✅ Puedes pausar/reanudar fácil
- ✅ Sin costo cuando está pausado
- ✅ Interfaz unificada

**Costo con pausas inteligentes:**
- Presentación 1 día = ~$1-2 (depende horas encendido)
- Entre presentaciones = $0 (pausado)
- Total 4 presentaciones = ~$5-8 de créditos

---

## 📊 Checklist de Despliegue

### ✅ ANTES DE EMPEZAR
- [ ] Cuenta Azure con créditos activada
- [ ] Repositorio GitHub públicable
- [ ] Base de datos MySQL lista

### ✅ CONFIGURACIÓN AZURE
- [ ] Grupo de recursos creado
- [ ] Base de datos MySQL creada
- [ ] App Service backend creado
- [ ] Static Web Apps frontend creada
- [ ] Publish profile descargado

### ✅ CÓDIGO LISTO
- [ ] .env.example en repositorio
- [ ] GitHub Actions workflows en `.github/workflows/`
- [ ] Variables de entorno configuradas
- [ ] Secrets en GitHub configurados

### ✅ DESPLIEGUE
- [ ] Push a rama main hecho
- [ ] Workflows de GitHub ejecutados
- [ ] Backend responde en Azure
- [ ] Frontend carga correctamente
- [ ] CORS configurado
- [ ] Base de datos conectada

### ✅ AUTOMATIZACIÓN
- [ ] Próximo push = despliegue automático
- [ ] Emails de notificación configurados
- [ ] Monitoring básico activo

---

## 🎯 EXPECTATIVAS REALISTAS

### ¿Qué funciona bien?
- ✅ Despliegue automático al hacer push
- ✅ Base de datos en la nube
- ✅ Frontend cargado rápido
- ✅ Certificado HTTPS automático
- ✅ Backups automáticos

### ⚠️ Limitaciones del tier Free/Basic
- ⏱️ Inicio lento si no hay tráfico (cold start)
- 🚫 Sin monitoreo avanzado
- 📊 Sin autoscaling
- ❌ Sin SLA garantizado

---

## 📞 SOPORTE PARA TU DOCENTE

Si tu docente pregunta, puedes reportar:

**URL de Producción:**
```
Frontend: https://[tuapp].azurestaticapps.net
Backend API: https://stayevent-backend.azurewebsites.net
```

**Servicios Utilizados:**
- Azure Static Web Apps (React frontend)
- Azure App Service (Node.js backend)
- Azure Database for MySQL
- GitHub Actions (CI/CD automatizado)

**Automatización:**
- Cada push a main = despliegue automático
- 0 minutos de downtime en despliegues

---

## 🆘 PREGUNTAS FRECUENTES PARA TU DOCENTE

**P: ¿Está realmente en producción?**
R: Sí, es accesible 24/7 en URLs públicas de Azure.

**P: ¿Tiene automatización?**
R: Sí, GitHub Actions desplega automáticamente al hacer push.

**P: ¿Cómo de seguro es?**
R: HTTPS automático, variables de entorno seguras, rate limiting.

**P: ¿Qué pasa si se acaban los créditos?**
R: La aplicación se pausa. Opción: cambiar a Always Free tier.

---

## 📚 RECURSOS ÚTILES

- [Documentación Azure para Estudiantes](https://azure.microsoft.com/es-es/education/)
- [GitHub Actions + Azure](https://docs.microsoft.com/en-us/azure/developer/github/)
- [Free tier Azure](https://azure.microsoft.com/es-es/free/)
