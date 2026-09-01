# Guía: Crear y Verificar Google OAuth Client ID para Xerpā

## 📋 Resumen Ejecutivo

Para que Xerpā pueda acceder al Google Calendar de tus usuarios (leer disponibilidad, crear/editar citas), necesitas:

1. Configurar la **Pantalla de Consentimiento OAuth** (OAuth Consent Screen)
2. Crear las **Credenciales OAuth 2.0** (Client ID + Client Secret)
3. **Verificar la aplicación** ante Google (obligatorio para scopes sensibles como Calendar)

> [!IMPORTANT]
> Los scopes que Xerpā solicita son **sensibles** (`calendar.readonly`, `calendar.events`). Esto significa que Google **no permitirá** que usuarios externos usen la integración hasta que completes el proceso de verificación.

---

## Fase 1: Configurar la Pantalla de Consentimiento OAuth

### Paso 1.1 — Acceder a la configuración
1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona tu proyecto existente en el dropdown superior
3. En el menú lateral: **APIs & Services** → **OAuth consent screen**

### Paso 1.2 — Seleccionar tipo de usuario
- Selecciona **External** (para permitir que cualquier usuario con cuenta Google se conecte)
- Haz clic en **Create**

### Paso 1.3 — Información de la aplicación
Completa los siguientes campos exactamente así:

| Campo | Valor |
|---|---|
| **App name** | `Xerpā` |
| **User support email** | `hello@xerpaa.com` (o tu correo de soporte) |
| **App logo** | Sube el logo de Xerpā (opcional pero recomendado para verificación) |
| **Application home page** | `https://www.xerpaa.com` |
| **Application privacy policy link** | `https://www.xerpaa.com/privacy` |
| **Application terms of service link** | `https://www.xerpaa.com/terms` (si existe) |
| **Authorized domains** | `xerpaa.com` |
| **Developer contact email** | Tu email personal o `hello@xerpaa.com` |

> [!WARNING]
> La **Privacy Policy** y la **Homepage** deben ser URLs públicas accesibles sin login. Google las verifica manualmente durante el proceso de revisión. Xerpā ya tiene una página de privacidad en `/privacy`.

### Paso 1.4 — Agregar Scopes
Haz clic en **Add or Remove Scopes** y busca/agrega estos 4 scopes:

| Scope | Tipo | Motivo |
|---|---|---|
| `openid` | No sensible | Autenticación base |
| `.../auth/userinfo.email` | No sensible | Identificar al usuario |
| `.../auth/calendar.readonly` | ⚠️ **Sensible** | Leer disponibilidad del calendario |
| `.../auth/calendar.events` | ⚠️ **Sensible** | Crear/editar citas en el calendario |

> [!NOTE]
> Los scopes sensibles disparan el proceso de verificación obligatorio. Sin verificación, solo los "Test Users" que agregues manualmente podrán usar la integración.

### Paso 1.5 — Test Users (Fase de Pruebas)
Mientras la app esté en estado "Testing":
- Agrega tu propio email como **Test User**
- Agrega emails de cualquier persona que necesite probar la integración
- **Máximo 100 test users** permitidos por Google

---

## Fase 2: Crear el Client ID (Credenciales OAuth 2.0)

### Paso 2.1 — Crear las credenciales
1. Ve a **APIs & Services** → **Credentials**
2. Haz clic en **+ Create Credentials** → **OAuth client ID**
3. Selecciona **Application type**: `Web application`
4. **Name**: `Xerpā Web App`

### Paso 2.2 — Configurar URIs autorizadas

#### Authorized JavaScript Origins:
```
https://www.xerpaa.com
https://xerpaa.com
https://web-production-XXXX.up.railway.app   ← (tu dominio de Railway del frontend)
http://localhost:3000                          ← (desarrollo local)
```

#### Authorized Redirect URIs:
Estas son las URLs donde Google redirige al usuario después de autorizar. Deben coincidir **exactamente** con lo configurado en el backend.

```
https://api-production-69b8.up.railway.app/api/v1/integrations/google/callback
http://127.0.0.1:8000/api/v1/integrations/google/callback
```

> [!CAUTION]
> La URL de redirect debe ser **exacta** carácter por carácter. Si tu backend en Railway usa `https://api-production-69b8.up.railway.app`, esa debe ser la URL registrada. Sin trailing slash.

### Paso 2.3 — Guardar y copiar credenciales
Después de hacer clic en **Create**, Google te mostrará:
- **Client ID**: `xxxxxxxxx.apps.googleusercontent.com`
- **Client Secret**: `GOCSPX-xxxxxxxx`

**Copia ambos valores inmediatamente.** Los necesitarás para configurar las variables de entorno.

---

## Fase 3: Habilitar la API de Google Calendar

1. Ve a **APIs & Services** → **Library**
2. Busca: `Google Calendar API`
3. Haz clic en el resultado y presiona **Enable**

> [!IMPORTANT]
> Sin habilitar la API, las llamadas de Xerpā al calendario fallarán con error 403 aunque las credenciales sean correctas.

---

## Fase 4: Configurar las credenciales en Xerpā

### Opción A: Variables de entorno en Railway (Backend Service `sherpa`)
En el servicio `sherpa` de Railway, agrega:

```
GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-tu-client-secret
GOOGLE_REDIRECT_URI=https://api-production-69b8.up.railway.app/api/v1/integrations/google/callback
```

### Opción B: Panel de Admin de Xerpā
Xerpā también soporta configuración dinámica desde el panel de Admin (`/admin`):
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`

> [!TIP]
> La configuración via Admin Panel tiene prioridad sobre las variables de entorno gracias al `ConfigService`.

---

## Fase 5: Verificación de la Aplicación (Obligatorio para Producción)

### ¿Por qué es necesario?
Mientras tu app esté en estado **"Testing"**, solo los Test Users que agregues manualmente podrán conectar su Google Calendar. Para que **cualquier usuario** pueda hacerlo, debes pasar por la verificación de Google.

### Paso 5.1 — Preparar requisitos previos

| Requisito | Estado en Xerpā | Notas |
|---|---|---|
| Homepage pública | ✅ `xerpaa.com` | No debe estar detrás de login |
| Privacy Policy pública | ✅ `/privacy` | Debe mencionar explícitamente el uso de datos de Google |
| Verificación de dominio | ⬜ Pendiente | Verificar `xerpaa.com` en Google Search Console |
| Video de demostración | ⬜ Pendiente | Video YouTube "No Listado" mostrando el flujo OAuth |

### Paso 5.2 — Verificar dominio en Google Search Console
1. Ve a [Google Search Console](https://search.google.com/search-console)
2. Agrega la propiedad `xerpaa.com`
3. Verifica propiedad via registro DNS TXT (el método más confiable)
4. Una vez verificado, regresa a Google Cloud Console → **OAuth consent screen** → **Authorized domains** y confirma que `xerpaa.com` aparece

### Paso 5.3 — Actualizar la Privacy Policy
Tu privacy policy en `/privacy` debe incluir **explícitamente** estas declaraciones para cumplir con la [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy):

```text
Uso de datos de Google Calendar:
- Xerpā accede a tu Google Calendar únicamente para consultar tu disponibilidad 
  y crear/modificar citas relacionadas con tu negocio.
- No compartimos, vendemos ni transferimos tus datos de calendario a terceros.
- El uso de información recibida de APIs de Google cumple con la Política de 
  Datos de Usuario de Google API Services, incluyendo los requisitos de Uso Limitado.
- Puedes revocar el acceso en cualquier momento desde tu cuenta de Google:
  https://myaccount.google.com/permissions
```

### Paso 5.4 — Grabar video de demostración
Google requiere un **video YouTube "No Listado"** que muestre:

1. ⬜ La URL de tu aplicación visible en la barra del navegador
2. ⬜ El usuario haciendo clic en "Conectar Google Calendar" en Xerpā
3. ⬜ La pantalla de consentimiento de Google mostrando los scopes solicitados
4. ⬜ El usuario autorizando el acceso
5. ⬜ Xerpā usando los datos del calendario (ej: mostrando disponibilidad o creando una cita)

> [!TIP]
> El video no necesita audio ni edición profesional. Solo debe ser claro y mostrar el flujo completo end-to-end.

### Paso 5.5 — Enviar a verificación
1. Ve a **OAuth consent screen** en Google Cloud Console
2. Cambia el estado de publicación a **"In Production"**
3. Google te pedirá que completes el formulario de verificación
4. Incluye:
   - Link a tu homepage
   - Link a tu privacy policy
   - Link al video de YouTube (No Listado)
   - Justificación de cada scope sensible

### Paso 5.6 — Esperar revisión
- **Tiempo estimado**: 3 a 10 días hábiles
- **Comunicación**: Google envía emails a la dirección de contacto del desarrollador
- **Posibles solicitudes**: Google puede pedir aclaraciones o cambios en tu privacy policy
- **Monitorea**: Revisa tu bandeja de entrada (incluido spam) buscando correos de `google-cloud-compliance@google.com`

---

## Fase 6: Prueba Rápida (Validar Antes de Verificación)

Una vez configuradas las credenciales, puedes probar el flujo completo con tu cuenta de Test User:

1. Inicia sesión en Xerpā
2. Ve a **Configuración** → **Integraciones** → **Google Calendar** → **Conectar**
3. Serás redirigido a la pantalla de consentimiento de Google
4. Acepta los permisos
5. Serás redirigido de vuelta a Xerpā con la integración activa
6. Ve al **Calendario** y verifica que tus eventos de Google aparecen

---

## 📝 Checklist Completo

### Configuración Inicial
- [ ] Proyecto creado en Google Cloud Console
- [ ] OAuth Consent Screen configurado (External)
- [ ] Scopes agregados (openid, email, calendar.readonly, calendar.events)
- [ ] Test Users agregados
- [ ] Client ID creado (Web application)
- [ ] Authorized redirect URIs configuradas (producción + local)
- [ ] Google Calendar API habilitada en la Library
- [ ] Credenciales configuradas en Railway/Admin Panel

### Verificación (Para Producción)
- [ ] Dominio `xerpaa.com` verificado en Google Search Console
- [ ] Privacy Policy actualizada con declaración de uso de datos de Google
- [ ] Video de demostración grabado y subido a YouTube (No Listado)
- [ ] App publicada como "In Production" en OAuth consent screen
- [ ] Formulario de verificación enviado
- [ ] Verificación aprobada por Google

---

## 🔗 Links de Referencia
- [Google Cloud Console](https://console.cloud.google.com/)
- [Google Search Console (Verificar dominio)](https://search.google.com/search-console)
- [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy)
- [OAuth Verification FAQ](https://support.google.com/cloud/answer/9110914)
- [Google Calendar API Reference](https://developers.google.com/calendar/api/v3/reference)
