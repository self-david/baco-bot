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
git clone <URL_DEL_REPO>
cd wa-bot
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
asistente dev
```

La primera vez te pedirá escanear un código QR con tu WhatsApp. Luego verás los logs de mensajes y errores en tiempo real.

#### Modo Producción (24/7 en segundo plano)

```bash
asistente start
```

Usa `pm2` para mantener el bot activo incluso si cierras la terminal.

- `asistente stop`: Detener el bot
- `asistente restart`: Reiniciar el bot (útil tras cambios)

### 4. Gestión de Usuarios (Whitelist)

Por defecto, nadie puede usar el bot hasta que sea autorizado. Usa estos comandos en la terminal:

- **Listar usuarios:** `asistente whitelist list`
- **Agregar usuario:** `asistente whitelist add 521xxxxxxxx@c.us`
- **Eliminar usuario:** `asistente whitelist remove 521xxxxxxxx@c.us`
- **Promover a Administrador:** `node scripts/set-admin.js 521xxxxxxxx@c.us`

### 5. Configuración Inicial (Wizard)

Puedes configurar el nombre y personalidad del bot interactivamente:

```bash
asistente init
```

## 🔧 Comandos del Bot (En WhatsApp)

Aunque el bot entiende lenguaje natural, también tiene comandos directos:

| Comando        | Descripción                                                        |
| -------------- | ------------------------------------------------------------------ |
| `/menu`        | Muestra la lista de comandos disponibles                           |
| `/tareas`      | Lista tus recordatorios pendientes                                 |
| `/borrar [ID]` | Elimina una tarea específica                                       |
| `/limpiar`     | Borra el historial de conversación con la IA (reinicio de memoria) |
| `/modelo [N]`  | Cambia el modelo de IA o lista los disponibles (admin)             |
| `/generar`     | Solicita un código de acceso (público)                             |
| `/activar [C]` | Activa a un usuario usando su código de solicitud (admin)          |
| `/inactivar`   | Remueve el acceso de un usuario (admin)                            |

> **Nota:** Los comandos marcados como `(admin)` requieren que el usuario tenga el rol de administrador. Usa `node scripts/set-admin.js` para asignarlo.

## 📂 Estructura del Proyecto

- `index.js`: Punto de entrada principal. Maneja la conexión de WhatsApp.
- `src/database.js`: Gestión de base de datos SQLite (conversaciones, tareas, config).
- `src/ai-processor.js`: Lógica para interactuar con Ollama y detectar recordatorios.
- `src/reminders.js`: Motor de cron y gestión de fechas para recordatorios.
- `src/commands.js`: Procesador de comandos explícitos (`/`).
- `scripts/`: Herramientas de utilidad (init, migrate, whitelist-cli).

## 🐛 Solución de Problemas Comunes

- **El bot no responde:** Verifica que Ollama esté corriendo (`ollama list` en terminal).
- **QR no carga:** Si la terminal no muestra el QR correctamente, intenta agrandar la ventana o usa `npm run qr` para limpiar sesión y reintentar.
- **Error "Browser already running":** Ejecuta `npm run stop` para matar procesos zombies de Chrome.
