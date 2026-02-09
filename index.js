const qrcode = require('qrcode-terminal')
const { Client, LocalAuth } = require('whatsapp-web.js')
const database = require('./src/database')
const reminders = require('./src/reminders')
const commands = require('./src/commands')
const aiProcessor = require('./src/ai-processor')

// Detectar sistema operativo
const esWindows = process.platform === 'win32'

// Detectar modo de configuración
const esModoSetup = process.env.SETUP_MODE ? process.env.SETUP_MODE.trim() === 'true' : false

// Inicializar base de datos
database.initDatabase()

// Validación de sesión para modo normal
if (!esModoSetup && !require('fs').existsSync('./.wwebjs_auth')) {
    console.error('\n❌ ERROR: No se encontró una sesión activa.')
    console.error('👉 Por favor, ejecuta primero: npm run qr\n')
    process.exit(1)
}

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        executablePath: esWindows 
           ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' 
            : '/usr/bin/chromium',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
})

// ========== EVENTOS DEL CLIENTE ==========

client.on('qr', qr => {
    if (esModoSetup) {
        console.log('Sigue los pasos para vincular tu cuenta:')
        qrcode.generate(qr, {small: true})
    }
})

client.on('loading_screen', (percent, message) => {
    console.log(`⏳ Cargando: ${percent}% - ${message}`)
})

client.on('authenticated', () => {
    console.log('✅ Autenticación exitosa')
})

client.on('auth_failure', msg => {
    console.error('❌ Error de autenticación:', msg)
})

client.on('disconnected', (reason) => {
    console.log('🔌 Cliente desconectado:', reason)
    reminders.stopReminders()
})

client.on('change_state', state => {
    console.log('🔄 Estado del cliente:', state)
})

client.on('ready', () => {
    if (esModoSetup) {
        console.log('\n✅ ¡Vinculación exitosa!')
        console.log('Ahora puedes cerrar esta terminal y usar: npm run dev\n')
        setTimeout(() => process.exit(0), 2000)
    } else {
        const nombre = database.getConfig('nombre')
        console.log(nombre ? `¡${nombre} está activo!` : '⚠️  Bot activo - Usa npm run init para configurar')
        
        // Iniciar sistema de recordatorios
        reminders.initReminders(client)
    }
})

// ========== MANEJO DE MENSAJES ==========

client.on('message_create', async message => {
    const chatId = message.from
    const texto = message.body.trim()

    console.log(`📩 Mensaje recibido de ${chatId}: ${texto}`)

    // 1. Validar Whitelist
    if (!database.isInWhitelist(chatId)) {
        console.log(`⚠️  Ignorando mensaje: ${chatId} no está en la whitelist`)
        return
    }

    const chat = await message.getChat()

    // 2. Procesamiento de Comandos
    const commandResult = await commands.processCommand(message, chatId, client)
    if (commandResult) {
        return message.reply(commandResult)
    }

    // 3. Verificar intención explícita de recordatorio
    const reminderIntent = aiProcessor.analyzeReminderIntent(texto)
    if (reminderIntent.isReminder) {
        try {
            const result = reminders.createReminder(
                chatId, 
                reminderIntent.message, 
                reminderIntent.timeExpression
            )
            
            if (result.type === 'scheduled') {
                const utils = require('./src/utils')
                return message.reply(`✅ Recordatorio creado\n\n📅 ${utils.formatDate(result.triggerDate)}\n🆔 ID: ${result.id}`)
            } else {
                return message.reply(`✅ Tarea creada\n\n🆔 ID: ${result.id}\n\n💡 Usa /fecha ${result.id} [fecha] para agregar fecha`)
            }
        } catch (error) {
            return message.reply(`❌ ${error.message}`)
        }
    }

    // 4. Generar respuesta con IA
    try {
        await chat.sendStateTyping()
        
        const modelo = database.getConfig('modelo') || 'Leslye'
        const personalidad = database.getConfig('personalidad') || 'Eres un asistente útil y amigable'
        
        const response = await aiProcessor.generateResponse(chatId, texto, personalidad, modelo)
        
        // 5. Detectar si es un contexto importante para sugerir recordatorio
        if (aiProcessor.detectImportantContext(texto, response)) {
            await client.sendMessage(chatId, response)
            return message.reply('💡 ¿Quieres que te lo recuerde? Responde con /recordar [mensaje] en [fecha/tiempo]')
        }
        
        await client.sendMessage(chatId, response)
        
    } catch (error) {
        console.error('❌ Error procesando mensaje:', error)
        await client.sendMessage(chatId, '❌ Hubo un error procesando tu mensaje. Verifica que Ollama esté corriendo.')
    }
})

// ========== LIMPIEZA AL SALIR ==========

process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo bot...')
    reminders.stopReminders()
    client.destroy()
    process.exit(0)
})

process.on('SIGTERM', () => {
    console.log('\n🛑 Deteniendo bot...')
    reminders.stopReminders()
    client.destroy()
    process.exit(0)
})

// Iniciar cliente
console.log('🚀 Iniciando cliente...')
client.initialize()
