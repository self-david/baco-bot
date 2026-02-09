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

Asegúrate de tener el modelo base y crear el personalizado:

```bash
ollama pull gemma3:1b
ollama create leslye -f Modelfile
```

> **Nota:** Puedes usar otros modelos editando el código, pero `leslye` es el predeterminado.

### 3. Ejecución

#### Modo Desarrollo (con logs en pantalla)

```bash
npm run dev
```

La primera vez te pedirá escanear un código QR con tu WhatsApp. Luego verás los logs de mensajes y errores en tiempo real.

#### Modo Producción (24/7 en segundo plano)

```bash
npm run start
```

Usa `pm2` para mantener el bot activo incluso si cierras la terminal.

- `npm run stop`: Detener el bot
- `npm run restart`: Reiniciar el bot (útil tras cambios)

### 4. Gestión de Usuarios (Whitelist)

Por defecto, nadie puede usar el bot hasta que sea autorizado. Usa estos comandos en la terminal:

- **Listar usuarios:** `npm run whitelist list`
- **Agregar usuario:** `npm run whitelist add 521xxxxxxxx@c.us`
- **Eliminar usuario:** `npm run whitelist remove 521xxxxxxxx@c.us`

### 5. Configuración Inicial (Wizard)

Puedes configurar el nombre y personalidad del bot interactivamente:

```bash
npm run init
```

## 🔧 Comandos del Bot (En WhatsApp)

Aunque el bot entiende lenguaje natural, también tiene comandos directos:

| Comando        | Descripción                                                        |
| -------------- | ------------------------------------------------------------------ |
| `/menu`        | Muestra la lista de comandos disponibles                           |
| `/tareas`      | Lista tus recordatorios pendientes                                 |
| `/borrar [ID]` | Elimina una tarea específica                                       |
| `/limpiar`     | Borra el historial de conversación con la IA (reinicio de memoria) |
| `/stats`       | Muestra estadísticas del sistema (admin)                           |

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
