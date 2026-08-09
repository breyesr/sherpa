# Guía de Onboarding para Proveedor de Tecnología de Meta (App Review)

Esta guía detalla los pasos exactos y los recursos técnicos necesarios para completar las tres secciones de la revisión en tu panel de desarrolladores de Meta.

---

## 📋 1. Configuración de la App (Review your app settings)

Para completar esta sección, debes proporcionar la información básica de la aplicación:

### 📑 Política de Privacidad
*   **Enlace de Privacidad**: Utiliza la URL pública de tu frontend en producción con la ruta `/privacy`.
    *   *Ejemplo*: `https://web-production-ee436.up.railway.app/privacy`
*   **Estado en el Código**: La página de política de privacidad ya está completamente implementada y optimizada en [`frontend/app/privacy/page.tsx`](file:///Users/bernardo/projects/sherpa/frontend/app/privacy/page.tsx). Está configurada en el middleware de Next.js para ser de libre acceso público (sin requerir autenticación).

### 🎨 Icono y Categoría
*   **Ícono de la App**: Sube un archivo de imagen cuadrado (mínimo 1024x1024 px) que represente el logotipo de **Xerpā**.
*   **Categoría**: Selecciona **Negocios y páginas (Business and Pages)** o **Mensajería (Messaging)**.

---

## 📹 2. Documentación en Video (Record video documentation)

Meta solicita dos evidencias en video separadas (puedes grabarlas usando herramientas gratuitas como Loom, QuickTime o Zoom):

### 🔹 Video 1: Enviar Mensajes (`whatsapp_business_messaging`)
Este video debe demostrar que la aplicación puede enviar y recibir mensajes de manera exitosa.

*   **Paso a paso para grabar**:
    1.  Muestra la pantalla de tu celular con WhatsApp abierto y el chat con el bot de pruebas de Xerpā.
    2.  Envía un mensaje de texto desde el celular (por ejemplo: *"Hola bot, ¿cuál es mi agenda de hoy?"*).
    3.  Muestra los logs de Railway del servicio **Backend API** o la respuesta del bot en tu teléfono celular para validar que el webhook entrante fue procesado.
    4.  Muestra la respuesta en texto que la IA del bot de Xerpā devuelve a tu WhatsApp.
*   **Consejo**: Asegúrate de que tanto el envío como la recepción del mensaje sean claramente visibles en pantalla.

### 🔹 Video 2: Gestión de Plantillas (`whatsapp_business_management`)
Este video debe demostrar la creación de plantillas de mensajes (Templates) haciendo llamadas directas a la API de Meta.

Como no tenemos una interfaz de usuario directa para crear plantillas de Meta en Sherpa, debes realizar una llamada de prueba usando `curl` desde tu terminal y grabar este proceso.

*   **Paso a paso para grabar**:
    1.  Abre una terminal en tu computadora.
    2.  Ejecuta el siguiente comando `curl` (reemplazando `{WABA_ID}` con tu ID de cuenta de WhatsApp Business y `{ACCESS_TOKEN}` con tu System User Token):

    ```bash
    curl -X POST "https://graph.facebook.com/v21.0/{WABA_ID}/message_templates" \
      -H "Authorization: Bearer {ACCESS_TOKEN}" \
      -H "Content-Type: application/json" \
      -d '{
        "name": "xerpa_test_template_review",
        "language": "es_MX",
        "category": "UTILITY",
        "components": [
          {
            "type": "BODY",
            "text": "Hola, esta es una plantilla de prueba para verificar el flujo de creación."
          }
        ]
      }'
    ```

    3.  Graba la pantalla mientras ejecutas el comando y muestra la respuesta exitosa JSON de Meta, que se verá similar a esto:
    ```json
    {
      "id": "1234567890123456",
      "status": "PENDING_APPROVAL",
      "category": "UTILITY"
    }
    ```

---

## 🚀 3. Envío para Revisión de la App (Submit for App Review)

Una vez completados los dos pasos anteriores:

1.  Sube el **Video 1** en el bloque de `whatsapp_business_messaging`.
2.  Sube el **Video 2** en el bloque de `whatsapp_business_management`.
3.  Haz clic en el botón azul **"Iniciar revisión de la aplicación"** (Submit App Review).
4.  La revisión suele tomar entre **1 y 5 días hábiles** por parte del equipo de Meta.
