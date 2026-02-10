# 🤖 WhatsApp Bot "Leslye" con IA y Recordatorios

Este es un bot avanzado de WhatsApp que utiliza Inteligencia Artificial (Ollama) local para conversar y un sistema robusto de recordatorios y tareas. Funciona tanto en Windows como en Linux (Raspberry Pi/Servidores).

## ✨ Características Principales

### 🧠 Inteligencia Artificial

- **Conversación Natural:** Utiliza modelos locales (como Gemma 3, Llama 3) vía Ollama.
- **Memoria de Contexto:** Recuerda los últimos mensajes de la conversación para mantener el hilo.
- **Personalidad Configurable:** Puedes definir quién es, cómo habla y su nombre.

### 📅 Sistema de Recordatorios Inteligentes

Detecta automáticamente intenciones de recordatorio en tu lenguaje natural.

- **Ejemplos:**
  - "Recuérdame sacar la basura mañana a las 8am"
  - "Avísame en 30 minutos apagar la estufa"
  - "No olvides la cita con el médico el viernes"
- **Gestión Manual:** Comandos para crear, listar y borrar recordatorios.

### 🛠️ Comandos y Herramientas

- **Whitelist:** Sistema de seguridad para que solo números autorizados puedan usar el bot.
- **Persistencia:** Base de datos SQLite para guardar conversaciones, configuración y tareas de forma segura.
- **Multi-plataforma:** Se adapta automáticamente a Windows o Linux.

## 🚀 Guía de Instalación y Uso

### Requisitos Previos

1. **Node.js** (v18 o superior)
2. **Ollama** instalado y corriendo ([ollama.com](https://ollama.com))
3. **Google Chrome** instalado

### 1. Instalación

Clona el repositorio e instala las dependencias:

```bash
git clone https://github.com/self-david/baco-bot.git
cd baco-bot
npm install
```

### 2. Configuración de IA (Ollama)

Solo necesitas descargar el modelo que desees usar:

```bash
ollama pull gemma3:1b
```

> **Nota:** Puedes usar cualquier modelo que tengas en Ollama. Configúralo desde WhatsApp con el comando `/modelo`.

### 3. Ejecución

Primero, activa el comando globalmente (solo una vez):

```bash
npm link
```

#### Modo Desarrollo (con logs en pantalla)

```bash
baco-bot dev
```

La primera vez te pedirá escanear un código QR con tu WhatsApp. Luego verás los logs de mensajes y errores en tiempo real.

#### Modo Producción (24/7 en segundo plano)

```bash
baco-bot start
```

Usa `pm2` para mantener el bot activo incluso si cierras la terminal.

- `baco-bot stop`: Detener el bot
- `baco-bot restart`: Reiniciar el bot (útil tras cambios)

### 4. Gestión de Usuarios (Whitelist)

Por defecto, nadie puede usar el bot hasta que sea autorizado. Usa estos comandos en la terminal:

- **Listar usuarios:** `baco-bot whitelist list`
- **Agregar usuario:** `baco-bot whitelist add 521xxxxxxxx@c.us`
- **Eliminar usuario:** `baco-bot whitelist remove 521xxxxxxxx@c.us`
- **Promover a Administrador:** `node scripts/set-admin.js 521xxxxxxxx@c.us`

### 5. Configuración Inicial (Wizard)

Puedes configurar el nombre y personalidad del bot interactivamente:

```bash
baco-bot init
```

## 🔧 Comandos del Bot (En WhatsApp)

Aunque el bot entiende lenguaje natural, también tiene comandos directos:

| Comando        | Descripción                                                        |
| -------------- | ------------------------------------------------------------------ |
| `/menu`        | Muestra la lista de comandos disponibles                           |
| `/tareas`      | Lista tus recordatorios pendientes                                 |
| `/calendario`  | Gestión de Google Calendar (conectar, listar, agregar)             |
| `/resumen [H]` | Configura la hora del resumen diario (ej: /resumen 07:00)          |
| `/borrar [ID]` | Elimina una tarea específica                                       |
| `/limpiar`     | Borra el historial de conversación con la IA (reinicio de memoria) |
| `/modelo [N]`  | Cambia el modelo de IA o lista los disponibles (admin)             |
| `/generar`     | Solicita un código de acceso (público)                             |
| `/activar [C]` | Activa a un usuario usando su código de solicitud (admin)          |
| `/inactivar`   | Remueve el acceso de un usuario (admin)                            |

> **Nota:** Los comandos marcados como `(admin)` requieren que el usuario tenga el rol de administrador. Usa `node scripts/set-admin.js` para asignarlo.

### 📅 Integración con Google Calendar

Para usar el comando `/calendario`, debes configurar las credenciales de Google OAuth 2.0.

1.  Crea un proyecto en [Google Cloud Console](https://console.cloud.google.com/).
2.  Habilita la **Google Calendar API**.
3.  Crea credenciales de tipo **ID de cliente OAuth**:
    - **Tipo de aplicación:** `App de escritorio` (Desktop App).
    - Esto es necesario para el flujo de autorización manual (copiar/pegar código).
4.  **Pantalla de Consentimiento (OAuth Consent Screen):**
    - Mantén la aplicación en modo **Testing**.
    - **IMPORTANTE:** Debes agregar tu correo de Gmail en la sección de **Test Users** (Usuarios de prueba). De lo contrario, Google bloqueará el acceso.
5.  Agrega las variables a tu archivo `.env`:

```env
GOOGLE_CLIENT_ID=tu_cliente_id_de_google
GOOGLE_CLIENT_SECRET=tu_secreto_de_google
```

6.  **Vincular cuenta en WhatsApp:**
    - Usa `/calendario conectar` y abre el link.
    - Si sale un aviso de "App no veridificada", haz clic en **Configuración avanzada** > **Ir a [Nombre App] (no seguro)**.
    - Copia el código resultante y envíalo: `/calendario codigo TU_CODIGO`.

7.  **Resumen Diario:**
    - El bot enviará automáticamente un resumen de tus eventos a las **07:00 AM**.
    - Puedes cambiar esta hora con el comando `/resumen HH:MM` (ej: `/resumen 08:30`).
    - Si no hay eventos esa semana, no se enviará ningún mensaje.
    - El resumen incluye eventos de hoy y del resto de la semana como mensajes independientes.

---

## 📂 Estructura del Proyecto

- `index.js`: Punto de entrada principal. Maneja la conexión de WhatsApp.
- `src/calendar-service.js`: Gestión de Google Calendar API y OAuth.
- `src/database.js`: Gestión de base de datos SQLite (conversaciones, tareas, credenciales Google).
- `src/ai-processor.js`: Lógica para interactuar con Ollama y analizar intenciones.
- `src/reminders.js`: Motor de recordatorios y gestión de estados.
- `src/daily-summary.js`: Servicio de resúmenes diarios programados.
- `src/commands.js`: Procesador de comandos explícitos (`/`).
- `scripts/`: Herramientas de utilidad (init, migrate, whitelist-cli).

## 🐛 Solución de Problemas Comunes

- **El bot no responde:** Verifica que Ollama esté corriendo (`ollama list` en terminal).
- **QR no carga:** Si la terminal no muestra el QR correctamente, intenta agrandar la ventana o usa `baco-bot qr` para limpiar sesión y reintentar.
- **Error "Browser already running":** Ejecuta `baco-bot stop` para matar procesos zombies de Chrome.
