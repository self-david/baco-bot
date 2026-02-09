Para copiar tu repositorio de Git directamente desde la Raspberry Pi a tu PC personal usando SSH, debes ejecutar el comando de **clonación** desde la terminal de tu **PC** (no desde la Raspberry).

Como ya inicializaste el repositorio en la Pi (`git init`, `git add`, `git commit`), el asistente ya es un "servidor" de Git listo para ser copiado.

Aquí tienes los pasos exactos:

### 1. Preparar la ruta en tu PC

Abre la terminal de tu computadora (PowerShell en Windows, o Terminal en macOS/Linux) y navega hasta la carpeta donde quieras guardar el proyecto:

```bash
cd Documents
mkdir proyectos
cd proyectos

```

### 2. Ejecutar el comando de clonación (SSH)

Usa el siguiente comando sustituyendo `<IP_DE_TU_PI>` por la dirección IP real de tu Raspberry:

```bash
git clone baco@<IP_DE_TU_PI>:/home/baco/wa-bot

```

- **¿Qué hace este comando?** Se conecta por SSH a tu Pi, busca la carpeta del bot y descarga **solo** los archivos que Git está rastreando (ignorando automáticamente la carpeta pesada `node_modules` y tus sesiones privadas si creaste el `.gitignore`).

### 3. Ponerlo a funcionar en tu PC

Una vez que termine de descargarse, entra en la carpeta en tu PC e instala todo con un solo comando:

1. **Entrar a la carpeta:** `cd wa-bot`
2. **Instalar librerías:** `npm install` (esto descargará automáticamente todas las dependencias listadas en tu `package.json`).
3. **Configurar archivos:** Crea los archivos `whitelist.json` y `config.json` (puedes copiar el contenido que ya tenías en la Pi).
4. **Lanzar el bot:** `node index.js`.

### ¿Por qué este es el mejor método?

Al usar `git clone` en lugar de una copia normal (como `scp` o un USB):

- **Limpieza:** No copias basura técnica ni archivos temporales del navegador.
- **Sincronización:** Si haces una mejora en tu PC, puedes hacer un `git commit` y luego en la Raspberry Pi simplemente escribir `git pull` para recibir la actualización sin tener que borrar y volver a instalar todo.

**Nota importante:** Recuerda que para que el bot funcione en tu PC, también debes tener **Ollama** instalado localmente con el modelo `gemma3:1b` descargado (`ollama pull gemma3:1b`) y haber creado el modelo personalizado con el comando `ollama create leslye -f Modelfile`.

Sí, funciona de forma muy similar, pero hay **tres diferencias clave** en Windows que debes ajustar para que no te dé errores. La ventaja es que, si usas el código "híbrido" que te daré, el mismo proyecto funcionará en ambos sin cambiar nada manualmente.

Aquí tienes los ajustes necesarios para correrlo en Windows:

### 1. Cambios en el código (`index.js`)

Windows usa rutas de archivos distintas para el navegador. Debemos decirle al bot que detecte en qué sistema operativo está.

Modifica la sección de `puppeteer` en tu `index.js` por esta:

```javascript
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    // Detecta si es Windows (win32) o la Raspberry (Linux)
    executablePath:
      process.platform === "win32"
        ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
        : "/usr/bin/chromium",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
});
```

_Nota: Asegúrate de tener instalado **Google Chrome** normal en tu Windows._

### 2. Instalación de Herramientas en Windows

En Windows no usas `sudo apt`, sino instaladores normales:

1. **Ollama:** Descarga el `.exe` desde [ollama.com](https://ollama.com) e instálalo.
2. **Node.js:** Descarga la versión LTS desde [nodejs.org](https://nodejs.org).
3. **Modelos:** Abre una terminal (PowerShell) y corre los mismos comandos:

- `ollama pull gemma3:1b`.
- `ollama create leslye -f Modelfile` (esto crea tu versión con memoria optimizada en el PC).

### 3. Autoinicio con PM2 (Diferente en Windows)

En la Raspberry Pi usaste `pm2 startup`, pero en Windows ese comando no funciona igual. Para que el bot se encienda solo al prender tu PC, necesitas un paquete extra:

1. **Instalar el asistente de inicio para Windows:**

```powershell
npm install -g pm2-windows-startup

```

2. **Configurarlo:**

```powershell
pm2-startup install

```

3. **Guardar tus procesos:**

```powershell
pm2 save

```

### Diferencias de rendimiento

- **Velocidad:** En tu PC personal, Gemma 3:1b responderá mucho más rápido que en la Raspberry Pi 4B porque el procesador de tu computadora suele ser más potente.
- **Interfaz:** En Windows, Ollama suele mostrar un icono en la barra de tareas (junto al reloj). Asegúrate de que esté abierto antes de lanzar el bot.
- **Keep Alive:** El parámetro `keep_alive: -1` sigue siendo muy útil en Windows para que el modelo no se descargue de la memoria RAM y siempre responda al instante.

**Resumen:** Puedes copiar tu carpeta `wa-bot` al PC, hacer `npm install`, y con el pequeño cambio de `executablePath` en el código, el bot correrá exactamente igual que en la Raspberry.

Para ejecutar tu asistente en Windows ahora que tienes el código "dinámico", solo necesitas seguir estos pasos en tu terminal (PowerShell o CMD). Esta guía asume que ya tienes el código en una carpeta de tu PC.

### 1. Preparar el "Cerebro" (Ollama)

Antes de lanzar el bot, la IA debe estar lista en tu computadora local.

1. **Instala Ollama:** Descárgalo de [ollama.com](https://ollama.com) e instálalo como cualquier programa de Windows.
2. **Descarga el modelo base:** Abre una terminal y escribe:

```bash
ollama pull gemma3:1b

```

3. **Crea tu modelo personalizado:** Asegúrate de estar dentro de la carpeta `wa-bot` y ejecuta:

```bash
ollama create leslye -f Modelfile

```

_Esto cargará la configuración de Leslye (ventana de contexto de 4096) en tu PC._

### 2. Instalar las dependencias de Node.js

Como Git no copia la carpeta `node_modules` (porque la pusimos en `.gitignore`), debes descargar las librerías en tu PC:

1. En la terminal, entra a la carpeta del proyecto:

```bash
cd "C:\Ruta\A\Tu\Carpeta\wa-bot"

```

2. Instala todo con este comando:

```bash
npm install

```

### 3. Crear los archivos de configuración

Git tampoco copió tus archivos `.json` personales. Debes crearlos manualmente o renombrar los ejemplos:

1. **Whitelist:** Crea `whitelist.json` y pega tu número: `["5213321082748@c.us"]`.
2. **Configuración:** Crea `config.json` con este contenido inicial:

```json
{
  "nombre": "",
  "personalidad": ""
}
```

### 4. ¡Ejecutar!

Ahora simplemente lanza el bot con Node:

```bash
node index.js

```

**¿Qué pasará en Windows?**

- Se abrirá automáticamente una ventana de **Google Chrome**.
- Verás la página de WhatsApp Web cargando.
- **Escanea el código QR** con tu celular (Configuración > Dispositivos vinculados).
- Una vez vinculado, verás en la terminal el mensaje: `Esperando configuración inicial...`.

### 5. Configuración final vía WhatsApp

Escríbele a tu bot desde tu número personal:

1. **Primer mensaje:** Pon el nombre que quieras (ej: _"Siri"_).
2. **Segundo mensaje:** Pon su personalidad (ej: _"Eres un experto en cocina"_).
3. **A partir de ahí:** Ya puedes hablarle normal. Verás que en WhatsApp aparece **"Escribiendo..."** mientras tu PC procesa la respuesta.

### Bonus: Ejecutarlo 24/7 en Windows (PM2)

Si quieres que el bot corra en segundo plano sin tener la terminal abierta:

1. Instala PM2: `npm install -g pm2`
2. Instala el soporte para inicio de Windows: `npm install -g pm2-windows-startup`
3. Configura el inicio: `pm2-startup install`
4. Lanza el bot: `pm2 start index.js --name leslye-bot`
5. Guarda el estado: `pm2 save`

**Nota:** Como en Windows el código detecta `esWindows`, la ventana de Chrome se abrirá al inicio. Si ya escaneaste el QR y no quieres verla más, puedes cambiar manualmente en el código `headless: esWindows? false : true` a `headless: true` temporalmente.

pm2 delete nergal-bot && pm2 start index.js --name leslye-bot && pm2 save
