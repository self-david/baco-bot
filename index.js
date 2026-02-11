require('dotenv').config()
const qrcode = require('qrcode-terminal')
const { Client, LocalAuth } = require('whatsapp-web.js')
const fs = require('fs')
const database = require('./src/database')
const reminders = require('./src/reminders')
const commands = require('./src/commands')
const aiProcessor = require('./src/ai-processor')
const dailySummary = require('./src/daily-summary')

// Detectar sistema operativo
const esWindows = process.platform === 'win32'

// Detectar modo de configuración
const esModoSetup = process.env.SETUP_MODE ? process.env.SETUP_MODE.trim() === 'true' : false

// Inicializar base de datos
database.initDatabase()

// Validación de sesión para modo normal
if (!esModoSetup && !fs.existsSync('./.wwebjs_auth')) {
    console.error('\n❌ ERROR: No se encontró una sesión activa.')
    console.error('👉 Por favor, ejecuta primero: baco-bot qr\n')
    process.exit(1)
}

// Buscar Chrome en ubicaciones comunes
function findChrome() {
    const paths = esWindows ? [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe'
    ] : [
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        '/usr/bin/google-chrome'
    ]
    
    for (const p of paths) {
        if (fs.existsSync(p)) {
            console.log('🌐 Chrome encontrado:', p)
            return p
        }
    }
    console.log('🌐 Usando Chrome integrado de Puppeteer')
    return undefined
}

// Limpiar archivos de bloqueo de Chrome
function cleanSessionLocks() {
    // console.log('🧹 Limpiando archivos de bloqueo...')
    const sessionPath = './.wwebjs_auth/session'
    const lockFiles = ['SingletonLock', 'SingletonSocket', 'SingletonCookie']
    
    lockFiles.forEach(file => {
        const filePath = `${sessionPath}/${file}`
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath)
                // console.log(`   - Eliminado: ${file}`)
            }
        } catch (e) {
            // Ignorar errores
        }
    })
}

const chromePath = findChrome()
cleanSessionLocks()

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        executablePath: chromePath,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ],
        timeout: 60000
    }
})

console.log('📱 Cliente configurado, registrando eventos...')

// ========== EVENTOS DEL CLIENTE ==========

client.on('loading_screen', (percent, message) => {
    console.log(`⌛ Cargando: ${percent}% - ${message}`)
})

client.on('authenticated', () => {
    console.log('✅ Autenticado correctamente')
})

client.on('auth_failure', msg => {
    console.error('❌ Error de autenticación:', msg)
})

client.on('qr', qr => {
    if (esModoSetup) {
        console.log('Sigue los pasos para vincular tu cuenta:')
        qrcode.generate(qr, { small: true })
    } else {
        console.log('\n⚠️  Se requiere escanear nuevo código QR')
        console.log('Por favor ejecuta:baco-bot qr\n')
        client.destroy()
        process.exit(1)
    }
})

client.on('ready', () => {
    console.log('\n🎉 ¡BOT LISTO!')
    
    const nombre = database.getConfig('nombre')
    console.log(nombre ? `¡${nombre} está activo!` : '⚠️  Bot activo - Usabaco-bot init para configurar')
    
    // Iniciar sistema de recordatorios
    reminders.initReminders(client)

    // Iniciar resumen diario
    dailySummary.init(client)
})

// ========== MANEJO DE MENSAJES ==========

client.on('message_create', async message => {
    // Ignorar mensajes enviados por el propio bot
    if (message.fromMe) return

    const chatId = message.from
    const texto = message.body.trim()

    // Ignorar grupos (@g.us)
    if (chatId.endsWith('@g.us')) return

    console.log(`📩 Mensaje recibido de ${chatId}: ${texto}`)

    // 2. Procesamiento de Comandos (Antes de whitelist para permitir /activar)
    const commandResult = await commands.processCommand(message, chatId, client)
    if (commandResult) {
        return message.reply(commandResult)
    }

    // 1. Validar Whitelist (Después de verificar comandos habilitados para todos)
    if (!database.isInWhitelist(chatId)) {
        console.log(`⚠️  Ignorando mensaje: ${chatId} no está en la whitelist`)
        // Responder solo en chat directo
        if (chatId.endsWith('@c.us') || chatId.endsWith('@lid')) {
            return message.reply('❌ No tienes acceso a este bot. Usa */generar* para solicitar un código de acceso y envíaselo a un administrador.')
        }
        return
    }

    // 2.5 Verificar si es una petición para posponer el último recordatorio (IA)
    const lastReminder = database.getLastCompletedReminder(chatId)
    if (lastReminder && !texto.startsWith('/')) {
        const model = database.getConfig('modelo')
        if (!model) return console.error('❌ Error: No hay modelo configurado')
        const postponeIntent = await aiProcessor.analyzePostponeIntent(texto, lastReminder, model)
        if (postponeIntent.isPostpone) {
            try {
                // Notificar que se está procesando (opcional)
                const result = reminders.createReminder(
                    chatId, 
                    lastReminder.message, 
                    postponeIntent.newDate.toISOString()
                )
                
                const utils = require('./src/utils')
                return message.reply(`✅ *Recordatorio pospuesto*\n\nOriginal: "${lastReminder.message}"\nNueva fecha: ${utils.formatDate(result.triggerDate)}\n🆔 ID: ${result.id}`)
            } catch (error) {
                console.error('❌ Error al posponer:', error)
            }
        }
    }


    // 3. Integración con Agente LangChain (maneja recordatorios automáticamente)

    // 4. Generar respuesta con Agente (incluye herramientas automáticas)
    try {
        // Obtener personalidad y modelo configurados
        const personality = database.getConfig('personalidad') || 'Eres un asistente útil y amigable.'
        const model = database.getConfig('modelo')
        
        if (!model) {
            console.error('❌ Error: No hay modelo configurado')
            return message.reply('❌ No tengo ningún modelo de IA configurado. Por favor, usa */modelo [nombre]* (ej: /modelo gemma3:1b) para empezar.')
        }
        
        // Generar respuesta
        const response = await aiProcessor.generateResponse(chatId, texto, personality, model)
        
        // generateResponse ya guarda los mensajes en la DB, no necesitamos guardarlos aquí explícitamente doble
        // pero validamos si la implementación de generateResponse lo hace (sí lo hace en línea 8 y 29 de ai-processor.js)
        
        return message.reply(response).then(() => {
            // 5. Procesar memoria en segundo plano (Fire and forget)
            aiProcessor.processMemory(chatId, texto, response, model)
                .catch(err => console.error('Error procesando memoria:', err))
        })
    } catch (error) {
        console.error('Error generando respuesta:', error)
        return message.reply('❌ Lo siento, tuve un error procesando tu mensaje.')
    }
})

client.on('disconnected', (reason) => {
    console.log('🔌 Cliente desconectado:', reason)
    reminders.stopReminders()
})

// ========== MANEJO DE ERRORES GLOBALES ==========

process.on('uncaughtException', (error) => {
    console.error('❌ Error no capturado:', error.message)
    console.error(error.stack)
})

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promesa rechazada no manejada:', reason)
})

process.on('SIGINT', async () => {
    console.log('\n🛑 Deteniendo bot (SIGINT)...')
    const currentModel = database.getConfig('modelo')
    if (currentModel) {
        await aiProcessor.unloadModel(currentModel).catch(() => {})
    }
    reminders.stopReminders()
    client.destroy()
    process.exit(0)
})

process.on('SIGTERM', async () => {
    console.log('\n🛑 Deteniendo bot (SIGTERM)...')
    const currentModel = database.getConfig('modelo')
    if (currentModel) {
        await aiProcessor.unloadModel(currentModel).catch(() => {})
    }
    reminders.stopReminders()
    client.destroy()
    process.exit(0)
})

// Iniciar cliente
console.log('🚀 Iniciando cliente...')
client.initialize().catch(err => {
    console.error('❌ Error inicializando cliente:', err.message)
    console.error(err.stack)
})
