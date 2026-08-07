# Plan: Publicación y App Review de Xerpā_Staging en Meta

> **Objetivo**: Desbloquear la entrega de webhooks reales en Staging (Fase 1) y obtener acceso avanzado como proveedor de tecnología (Fase 2).

---

## Fase 1: Publicar la App y Desbloquear Webhooks

**Tiempo estimado**: 15–30 minutos  
**Resultado esperado**: Los mensajes de WhatsApp enviados desde un celular generan webhooks que llegan al Backend API de Staging, la IA procesa el mensaje y responde.

### 1.0 Crear la página de Política de Privacidad
- [x] Diseñar y programar una página de privacidad profesional y pública.
  - **Ubicación en el código**: `frontend/app/privacy/page.tsx`
  - **Ruta pública configurada**: `/privacy` (se actualizó el middleware y layout de Next.js para acceso sin login).
  - **Estado**: ¡HECHO y validado con compilación exitosa!

### 1.1 Completar App Settings Básicos
- [ ] Ir a **Configuración de la app** → **Básica** en Meta Developer.
- [ ] Llenar los campos obligatorios:
  - **Nombre para mostrar**: `Xerpā Staging` (o el que ya tenga).
  - **Dominio de la app**: `[tu-backend-staging].up.railway.app`
  - **URL de la política de privacidad**: Pega la URL pública de tu frontend seguida de `/privacy` (ej: `https://[frontend-staging].up.railway.app/privacy`).
  - **Ícono de la app**: Subir cualquier imagen cuadrada (mínimo 1024x1024 px). Puede ser el logo de Xerpā.
  - **Categoría**: Seleccionar `Business and Pages` o `Messaging`.
- [ ] Hacer clic en **Guardar cambios**.

### 1.2 Publicar la App (Modo En Vivo)
- [ ] En el menú lateral izquierdo, hacer clic en **Publicar**.
- [ ] Activar el interruptor para cambiar de **Desarrollo** → **En vivo (Live)**.
- [ ] Confirmar el cambio si Meta lo solicita.
- [ ] Verificar que el estado de la app cambie a **Publicada** (etiqueta verde).

### 1.3 Suscribir la App al WABA via Graph API
- [ ] Obtener el **WABA ID** de Staging (visible en Paso 1 de Meta Developer o en la configuración de WhatsApp).
- [ ] Obtener el **System User Token** de Staging (el que generamos para `sherpa-platform` con permisos `whatsapp_business_management` + `whatsapp_business_messaging`).
- [ ] Verificar la suscripción actual ejecutando en terminal:
```bash
curl -X GET "https://graph.facebook.com/v21.0/{WABA_ID}/subscribed_apps" \
  -H "Authorization: Bearer {SYSTEM_USER_TOKEN}"
```
- [ ] Si la respuesta es `{"data": []}`, suscribir la app:
```bash
curl -X POST "https://graph.facebook.com/v21.0/{WABA_ID}/subscribed_apps" \
  -H "Authorization: Bearer {SYSTEM_USER_TOKEN}" \
  -d "subscribed_fields=messages"
```
- [ ] Confirmar que la respuesta es `{"success": true}`.

### 1.4 Verificar que los Webhooks Llegan
- [ ] Abrir los **Deploy Logs** del servicio **Backend API** en Railway.
- [ ] Enviar un mensaje de texto desde tu celular al número de pruebas de WhatsApp Staging (`+15556737202`).
- [ ] Verificar que en los logs del Backend API aparece: `WHATSAPP WEBHOOK PING RECEIVED`.
- [ ] Verificar que en los logs del **Asynchronous Processor** (Worker) aparece: `Task app.tasks.messages.send_twilio_reply[...] received`.
- [ ] Verificar que recibes la respuesta de la IA en tu celular.

### 1.5 Verificar Servicios Activos en Railway
- [ ] Confirmar que los siguientes servicios tienen **Serverless DESACTIVADO**:
  - **Backend API** (debe estar siempre activo para recibir webhooks).
  - **Asynchronous Processor** (worker Celery, no tiene puerto HTTP).
  - **Redis** (conexión TCP, no puede dormir).
  - **PostgreSQL** (conexión TCP, no puede dormir).

---

## Fase 2: App Review para Acceso Avanzado (Proveedor de Tecnología)

**Tiempo estimado**: 1–3 semanas (depende de la velocidad de revisión de Meta)  
**Resultado esperado**: Acceso avanzado a `whatsapp_business_messaging` y `whatsapp_business_management`, permitiendo onboardear WABAs de clientes externos.

### 2.1 Prerrequisitos
- [ ] **Verificación del negocio**: Asegurar que el Business Manager de Xerpā esté verificado en Meta Business Suite (Settings → Business Info → Verification Status).
- [ ] **Fase 1 completada**: La app debe estar publicada y funcionando antes de grabar los videos.
- [ ] **Política de privacidad real**: Crear una página de política de privacidad accesible públicamente (puede ser una página estática en el frontend).

### 2.2 Video 1: `whatsapp_business_messaging`
Meta requiere un video que demuestre que la app puede enviar y recibir mensajes.

**Contenido del video**:
- [ ] Mostrar la interfaz de la app (dashboard de Sherpa) donde se visualizan los mensajes.
- [ ] Enviar un mensaje desde la app a un número de WhatsApp (puede ser el de pruebas).
- [ ] Mostrar el mensaje llegando a la interfaz de WhatsApp (web o móvil).
- [ ] Mostrar un mensaje entrante desde WhatsApp llegando al dashboard de Sherpa.

**Tips para el video**:
- Duración: 1–3 minutos.
- No necesita audio narrado, pero puede ayudar.
- Grabar en resolución clara (1080p mínimo).
- Usar una herramienta como QuickTime (Mac) o Loom.

### 2.3 Video 2: `whatsapp_business_management`
Meta requiere un video que demuestre la capacidad de gestionar recursos del WABA (plantillas de mensaje).

**Contenido del video**:
- [ ] Mostrar una llamada a la Graph API que crea una plantilla de mensaje.
- [ ] Puede ser desde Postman, curl, o directamente desde la interfaz de Sherpa si tiene esa funcionalidad.
- [ ] Mostrar la respuesta exitosa de la API.

**Ejemplo de llamada para el video**:
```bash
curl -X POST "https://graph.facebook.com/v21.0/{WABA_ID}/message_templates" \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "sherpa_test_template",
    "language": "es_MX",
    "category": "UTILITY",
    "components": [
      {
        "type": "BODY",
        "text": "Hola {{1}}, tu pedido está confirmado."
      }
    ]
  }'
```

### 2.4 Enviar a Revisión
- [ ] Subir el **Video 1** en la sección de `whatsapp_business_messaging`.
- [ ] Subir el **Video 2** en la sección de `whatsapp_business_management`.
- [ ] Hacer clic en **"Iniciar revisión de la aplicación"**.
- [ ] Esperar aprobación de Meta (típicamente 1–5 días hábiles).

### 2.5 Post-Aprobación
- [ ] Verificar que los permisos avanzados están activos en la sección **Permisos y funciones**.
- [ ] Probar el flujo completo de Embedded Signup desde el frontend de Sherpa.
- [ ] Documentar los tokens y configuraciones finales en el `.env` de producción.

---

## Checklist Rápido

| # | Tarea | Estado |
|---|---|---|
| 1.1 | App Settings (privacidad, ícono, categoría) | ⬜ |
| 1.2 | Publicar app (modo En vivo) | ⬜ |
| 1.3 | `POST subscribed_apps` al WABA | ⬜ |
| 1.4 | Verificar webhook llega al Backend API | ⬜ |
| 1.5 | Servicios Railway sin Serverless | ⬜ |
| 2.1 | Verificación del negocio | ⬜ |
| 2.2 | Video `whatsapp_business_messaging` | ⬜ |
| 2.3 | Video `whatsapp_business_management` | ⬜ |
| 2.4 | Enviar App Review | ⬜ |
| 2.5 | Post-aprobación: probar Embedded Signup | ⬜ |
