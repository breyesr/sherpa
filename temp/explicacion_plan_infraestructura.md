# Plan de Optimización de Costos y Escalabilidad: Explicación Sencilla para el Equipo
**Proyecto:** Sherpa MVP  
**Destinatarios:** Equipo No Técnico y Stakeholders  
**Fecha:** 29 de junio de 2026  

---

## 🚀 Resumen del Plan (¿De qué se trata esto?)

Hemos analizado las facturas de nuestro servidor de pruebas (**Railway Staging**) y descubrimos que estamos pagando **$10.16** dólares por recursos que no estamos aprovechando. Casi el **97% de este costo** se va en "alquilar" memoria RAM que está completamente ociosa. 

Con los cambios que vamos a realizar, reduciremos la factura de este servidor a solo **$1.30 dólares al mes (un ahorro del 87.2%)** sin afectar el desarrollo del software. Además, este plan nos preparará para soportar miles de usuarios concurrentes de forma eficiente en el servidor de producción (el que usarán los clientes reales).

---

## 🔍 Explicación de Conceptos Técnicos (con Analogías)

Para entender qué vamos a hacer y por qué, definamos algunos términos técnicos de forma sencilla:

### 1. El Servidor API (*FastAPI Backend*)
* **¿Qué es?** Es como la **recepcionista** de nuestra aplicación. Cuando abres la app o llega un mensaje de WhatsApp, este servidor recibe la solicitud, la procesa y te devuelve una respuesta.
* **El Problema:** Estaba encendido las 24 horas del día, los 7 días de la semana, cobrándonos alquiler de memoria todo el tiempo, incluso a las 3:00 AM cuando nadie estaba programando.

### 2. El Procesador de Tareas (*Celery Worker*)
* **¿Qué es?** Es nuestro **asistente en el cuarto de atrás**. Se encarga de hacer los trabajos pesados y lentos que no queremos que retrasen a la recepcionista (como sincronizar calendarios de Google, enviar recordatorios o usar Inteligencia Artificial para extraer información de los chats de los clientes).
* **El Problema ("El Multiplicador de Concurrencia"):** Por defecto, este asistente es muy ambicioso. Al arrancar en la nube, detectó que el edificio físico de servidores tenía 32 "escritorios" (núcleos de CPU). Así que decidió contratar a **32 sub-asistentes simultáneos**, cada uno con su propia oficina (memoria RAM), solo por si acaso. Sin embargo, en el servidor de pruebas casi nunca hay tareas acumuladas. Teníamos a 32 personas cobrando sueldo (RAM) sentadas cruzadas de brazos esperando trabajo. Esto representa el **60% de nuestra factura total**.

### 3. La Bandeja de Entrada (*Redis*)
* **¿Qué es?** Es la **bandeja de entrada** del asistente. Cuando la recepcionista (API) recibe un trabajo pesado, lo anota en un papel y lo deja en Redis para que el asistente lo recoja.
* **El Problema:** Al tener 32 asistentes ociosos, todos estaban preguntándole a la bandeja de entrada cada milisegundo: *"¿Hay trabajo? ¿Hay trabajo? ¿Hay trabajo?"*. Esta insistencia constante hacía que el servidor de Redis trabajara demasiado, consumiendo mucha energía de procesamiento (CPU).

### 4. La Base de Datos (*Postgres*) y el "Pool" de Conexiones
* **¿Qué es?** Es el **archivero gigante** donde guardamos los datos de las empresas, clientes y citas.
* **El Problema:** Actualmente, cada vez que la app necesita buscar un dato, un programador o un asistente camina hasta el archivero, abre una puerta blindada con llave, saca el papel, lo lee, cierra la puerta con llave y se va (*NullPool*). Hacer esto cientos de veces al día es muy lento y desgasta la cerradura de la base de datos.

---

## 🛠️ ¿Qué vamos a hacer para solucionarlo?

Implementaremos 4 mejoras clave para optimizar los recursos:

### Paso 1: Reducir el Asistente a un solo empleado (*Limitar Concurrencia*)
En el servidor de pruebas, le ordenaremos al procesador de tareas que **solo contrate a 1 asistente** en lugar de 32. 
* **Por qué:** Un solo asistente es más que suficiente para procesar las pruebas de desarrollo una por una. Esto reducirá el consumo de memoria RAM de este servicio en un **95%** de inmediato.

### Paso 2: Poner los Servidores a Dormir (*Sleep on Idle*)
Configuraremos a nuestra recepcionista (API) y la interfaz de usuario (Frontend) para que **se apaguen automáticamente si no reciben visitas en 30 minutos**.
* **Por qué:** Los desarrolladores solo trabajan unas 40 horas a la semana (~24% del tiempo total). El servidor dormirá el otro 76% del tiempo (noches y fines de semana), por lo cual Railway no nos cobrará nada durante esas horas.
* **¿Qué pasa si despiertan?** Si un desarrollador entra a la app por la mañana o se recibe un mensaje de prueba de WhatsApp, el servidor tardará entre **5 y 10 segundos en "despertar"** y encender la luz. Es una pequeña espera que vale la pena por el ahorro económico.

### Paso 3: Crear un Sistema de Llaves Compartidas (*Connection Pooling*)
Implementaremos un sistema de **puertas abiertas en el archivero** (un *Connection Pool* de 5 conexiones). 
* **Por qué:** En lugar de abrir y cerrar la puerta blindada con llave en cada consulta, dejaremos 5 conexiones abiertas listas para que cualquiera las use y las devuelva. Esto hace que las consultas sean instantáneas y la base de datos consuma mucha menos memoria.

### Paso 4: Espaciar las Preguntas del Asistente (*Optimizar Polling*)
Le diremos al asistente que solo revise la bandeja de entrada (Redis) cada **5 segundos**, en lugar de hacerlo de manera incesante en milisegundos.
* **Por qué:** Esto le dará un respiro a la bandeja de entrada, reduciendo su consumo de CPU en un 80% y abaratando su costo.

---

## 📈 Beneficios para la Escalabilidad en Producción

Es natural preguntarse: *¿Si limitamos todo esto, cómo vamos a escalar cuando tengamos clientes reales?*

La respuesta es que **esta optimización es justamente la base para poder escalar de forma masiva y económica**:
1. **Evitamos Caídas por Saturación de Base de Datos:** El sistema de "puertas compartidas" (*Connection Pool*) evitará que la base de datos colapse cuando tengamos cientos de usuarios haciendo clic al mismo tiempo.
2. **Escalamiento Horizontal Inteligente:** En lugar de tener un único servidor gigante y costoso de tareas, en producción duplicaremos los asistentes clonando contenedores pequeños y baratos únicamente cuando haya mucho trabajo acumulado, y los apagaremos automáticamente cuando el trabajo termine.
3. **División de Trabajo (Colas de Tareas):** En producción separaremos las tareas en dos bandejas de entrada: una **Bandeja Rápida** (para alertas y mensajes de chat inmediatos) y una **Bandeja Lenta** (para tareas pesadas de Inteligencia Artificial). Esto garantiza que si un proceso de IA tarda 45 segundos, ningún usuario experimentará retrasos al recibir sus recordatorios o notificaciones.
