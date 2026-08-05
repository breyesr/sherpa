# Guía de Migración de Twilio a Meta WhatsApp Cloud API
*Una guía simplificada para administradores, DevOps y desarrolladores*

> **¿De qué se trata este proyecto?**  
> Estamos reemplazando **Twilio** por la **API oficial de Meta WhatsApp Cloud** (usando el modelo de Meta Tech Provider). Esto permitirá que los clientes vinculen sus propios números de forma instantánea a través de Facebook Login (Embedded Signup) sin tener que comprar números en Twilio, eliminando intermediarios y reduciendo costos significativamente.

---

## 📋 Resumen de Beneficios
1. **Registro Inmediato**: Los clientes vinculan su número en 3 minutos usando su cuenta de Facebook.
2. **Cero costos extras**: No pagamos renta mensual por número a Twilio.
3. **Mayor velocidad**: Envío directo sin pasar por servidores de Twilio.

---

## PARTE 1 — Configuración en el Portal de Meta (Paso a Paso)
*Esta sección es para el Administrador del Negocio o el equipo de DevOps.*

### Paso 1.1: Verificar el Negocio en Meta
* **Dónde**: Ve a [Configuración del Negocio en Facebook](https://business.facebook.com).
* **Qué hacer**: Ve a **Información del negocio** y completa la **Verificación del negocio** subiendo los documentos legales de tu empresa (RFC, Acta Constitutiva, comprobante de domicilio).
* **Por qué**: WhatsApp requiere que el negocio esté verificado para permitir volúmenes altos de mensajes.

### Paso 1.2: Crear la App de Meta
* **Dónde**: En el portal de [Meta for Developers](https://developers.facebook.com).
* **Qué hacer**:
  1. Haz clic en **Crear App** y selecciona el tipo **Negocio (Business)**.
  2. Nombra tu App (ej. *Sherpa Platform*).
  3. Agrega el producto **WhatsApp** a tu App desde el panel izquierdo.

### Paso 1.3: Configurar el Usuario del Sistema y el Token Permanente
* **Dónde**: En Configuración del Negocio → Usuarios del Sistema.
* **Qué hacer**:
  1. Crea un nuevo **Usuario del Sistema** con rol de **Administrador** (llámalo `sherpa-platform-user`).
  2. Asígnale a este usuario la App de Meta creada en el paso anterior.
  3. Dale los permisos `whatsapp_business_management`, `whatsapp_business_messaging` y `business_management`.
  4. Haz clic en **Generar Token** y guarda ese token largo de manera segura en las variables de entorno de tu servidor (`META_SYSTEM_USER_TOKEN`). ¡Este token no expira!

### Paso 1.4: Registrar el Token de Verificación de Webhooks y el Secreto de la App
1. Ve al panel de la App de Meta → Configuración → Básica, y copia el **Secreto de la App** (`META_APP_SECRET`). Esto protege al servidor de ciberataques.
2. Ve a WhatsApp → Configuración de Webhooks en Meta.
   * **URL de la dirección de retorno**: `https://<tu-servidor-sherpa>/api/v1/whatsapp/webhook`
   * **Token de verificación**: Pon un texto secreto inventado por ti (guárdalo como `WHATSAPP_VERIFY_TOKEN`).
   * **Campos a suscribirse**: Activa la casilla `messages` para recibir mensajes entrantes de los usuarios.

---

## PARTE 2 — Explicación Sencilla de los Cambios en el Código
*Para programadores o jefes de tecnología de nivel junior/medio.*

Nuestros desarrolladores van a modificar el sistema Sherpa en 4 partes principales:

### 1. El motor de mensajería (El "Cartero" de Meta)
* **Antes**: Usábamos código de Twilio para enviar los mensajes.
* **Ahora**: Escribiremos un nuevo archivo de código (`meta_cloud_engine.py`) que se conecta directamente a los servidores de Meta usando solicitudes HTTP estándar (usando la biblioteca `httpx` de Python). Este nuevo motor sabe cómo enviar textos comunes, imágenes, PDFs y plantillas aprobadas.

### 2. Seguridad en los Webhooks (La "Identificación" de mensajes)
* **El problema**: Cualquiera podría enviar un mensaje falso a nuestra base de datos simulando ser WhatsApp.
* **La solución**: Implementaremos un middleware de seguridad. Meta firma cada mensaje con una clave secreta (`META_APP_SECRET`) usando criptografía SHA-256. Sherpa ahora calculará y comparará esta firma en cada mensaje recibido. Si no coincide, se descarta por seguridad.

### 3. La Regla de Cumplimiento de las 24 Horas
* **Qué es**: WhatsApp no permite molestar a los usuarios con publicidad. Si el usuario no te escribe primero, solo puedes mandarle plantillas aprobadas. Si el usuario te responde, se abre una "ventana de servicio" de 24 horas donde puedes chatear libremente.
* **Cómo lo hacemos**: Usaremos la base de datos rápida **Redis**. Cada vez que un usuario envíe un mensaje, guardamos su número con un temporizador de 24 horas. Antes de que Sherpa envíe un mensaje automático, revisa si el temporizador sigue activo. Si ya expiró, el sistema automáticamente usará una plantilla de WhatsApp en lugar de texto libre.

### 4. El "Embedded Signup" (Facebook Login para clientes)
* **Qué es**: En lugar de comprar números telefónicos manualmente, el cliente entra al panel de configuración de Sherpa, da clic en **"Conectar WhatsApp"**, se abre una ventana flotante de Facebook, ingresa su contraseña, selecciona su número y listo.
* **Cómo funciona en el código**:
  1. El cliente inicia sesión en Facebook en la pantalla.
  2. Facebook le da un código temporal al cliente.
  3. El frontend de Sherpa manda ese código a nuestra API de backend (`POST /integrations/whatsapp/connect-meta`).
  4. El backend cambia el código por un token permanente para ese número de teléfono y lo guarda encriptado en la base de datos.

---

## 🚀 Lista de Tareas para la Implementación (Checklist)

### Para el Diseñador/Frontend
- [ ] Integrar el botón oficial de Facebook Login en el panel de integraciones del cliente.
- [ ] Actualizar el modal de WhatsApp para mostrar el estatus de conexión de Meta (Calificación de calidad verde/amarilla/roja y límites de envío).
- [ ] Reemplazar las referencias visuales e instructivos de Twilio por las de Meta WhatsApp Cloud.

### Para el Desarrollador Backend
- [ ] Crear el archivo `meta_cloud_engine.py` para envíos a Meta Graph API `v22.0`.
- [ ] Implementar la validación de firma `X-Hub-Signature-256` en el webhook.
- [ ] Crear las claves de temporizador en Redis para controlar la ventana de 24 horas.
- [ ] Crear el endpoint de intercambio de token del Embedded Signup.
- [ ] Crear una rutina de migración para mover los clientes actuales uno a uno.

### Para el Líder de Proyecto / QA
- [ ] Validar que los mensajes entrantes activen la IA de manera aislada por negocio.
- [ ] Asegurarse de que el servidor no se caiga ante ráfagas de Webhooks (retornar `200 OK` inmediatamente).
- [ ] Limpiar y borrar todas las librerías antiguas de Twilio una vez terminada la migración para mantener el código limpio.
