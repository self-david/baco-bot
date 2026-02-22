const Fuse = require('fuse.js')
const database = require('./database')
const reminders = require('./reminders')
const utils = require('./utils')
const aiProcessor = require('./ai-processor')
const calendarService = require('./calendar-service')

async function processCommand(message, chatId, client) {
    const texto = message.body.trim()
    
    // No es un comando
    if (!texto.startsWith('/')) return null
    
    const parts = texto.slice(1).split(' ')
    const command = parts[0].toLowerCase()
    const args = parts.slice(1)
    
    try {
        // Lista de comandos válidos para fuzzy search
        const validCommands = [
            'nombre', 'personalidad', 'refinar', 'modelo', 'apiurl',
            'whitelist', 'lista', 'w', 'l',
            'recordar', 'posponer',
            'tarea', 'tareas', 't',
            'recordatorios', // 'tareas', 't' ya están arriba
            'completar',
            'cancelar',
            'fecha', 'f',
            'limpiar',
            'memoria', 'memorias',
            'olvidar',
            'stats',
            'activar',
            'generar',
            'inactivar',
            'ayuda', 'help', 'menu'
        ]

        let commandToExecute = command

        // Si el comando no es exacto, intentar fuzzy match
        if (!validCommands.includes(command)) {
            const fuse = new Fuse(validCommands.map(c => ({ name: c })), {
                keys: ['name'],
                threshold: 0.4,
            })
            
            const results = fuse.search(command)
            
            if (results.length > 0) {
                const bestMatch = results[0].item.name
                console.log(`🎯 Fuzzy command match: "${command}" -> "${bestMatch}"`)
                commandToExecute = bestMatch
            }
        }

        switch (commandToExecute) {
            case 'nombre':
                if (!database.isAdmin(chatId)) return '⛔ Acceso denegado. Se requiere rol de administrador.'
                return handleNombre(args)
                
            case 'personalidad':
                if (!database.isAdmin(chatId)) return '⛔ Acceso denegado. Se requiere rol de administrador.'
                return handlePersonalidad(args)
                
            case 'refinar':
                if (!database.isAdmin(chatId)) return '⛔ Acceso denegado. Se requiere rol de administrador.'
                return handleRefinar(args)
                
            case 'modelo':
                if (!database.isAdmin(chatId)) return '⛔ Acceso denegado. Se requiere rol de administrador.'
                return await handleModelo(args)
                
            case 'apiurl':
                if (!database.isAdmin(chatId)) return '⛔ Acceso denegado. Se requiere rol de administrador.'
                return handleApiUrl(args)
                
            case 'whitelist':
            case 'lista':
            case 'w':
            case 'l':
                if (!database.isAdmin(chatId)) return '⛔ Acceso denegado. Se requiere rol de administrador.'
                return handleWhitelist(args, chatId)
                
            case 'recordar':
                return await handleRecordar(args, chatId)
                
            case 'posponer':
                return await handlePosponer(args, chatId)
                
            case 'tarea':
            case 't':
                return await handleTarea(args, chatId)
                
            case 'recordatorios':
            case 'tareas':
                return handleListarRecordatorios(chatId)
                
            case 'completar':
                return handleCompletar(args)
                
            case 'cancelar':
                return handleCancelar(args)
                
            case 'fecha':
            case 'f':
                return handleAgregarFecha(args, chatId)
                
            case 'calendario':
            case 'cal':
                return await handleCalendario(args, chatId)

            case 'resumen':
                return handleResumen(args, chatId)

            case 'limpiar':
                return handleLimpiar(chatId)

            case 'memoria':
            case 'memorias':
                return handleMemoria(chatId)

            case 'olvidar':
                return handleOlvidar(args, chatId)

            case 'stats':
                if (!database.isAdmin(chatId)) return '⛔ Acceso denegado. Se requiere rol de administrador.'
                return handleStats()
                
            case 'activar':
                if (!database.isAdmin(chatId)) return '⛔ Acceso denegado. Se requiere rol de administrador para activar usuarios.'
                return handleActivar(args, chatId, client)

            case 'generar':
                return handleGenerar(chatId)

            case 'inactivar':
                if (!database.isAdmin(chatId)) return '⛔ Acceso denegado. Se requiere rol de administrador.'
                return handleInactivar(args)

            case 'ayuda':
            case 'help':
            case 'menu': // Alias
                return showHelp(chatId)
                
            default:
                // Si llegamos aquí es porque ni el fuzzy match encontró algo decente
                return `❌ Comando desconocido: /${command}\n\nUsa /ayuda para ver comandos disponibles`
        }
    } catch (error) {
        console.error('Error procesando comando:', error)
        return `❌ Error: ${error.message}`
    }
}

// ========== COMANDOS DE CONFIGURACIÓN ==========

function handleNombre(args) {
    if (args.length === 0) {
        const nombreActual = database.getConfig('nombre')
        return `Mi nombre actual es: *${nombreActual || 'Sin configurar'}*`
    }
    
    const nuevoNombre = args.join(' ')
    database.setConfig('nombre', nuevoNombre)
    return `✅ Nombre cambiado. Ahora me llamo: *${nuevoNombre}*`
}

function handlePersonalidad(args) {
    if (args.length === 0) {
        const personalidadActual = database.getConfig('personalidad')
        return `Mi personalidad actual es:\n\n"${personalidadActual || 'Sin configurar'}"`
    }
    
    const nuevaPersonalidad = args.join(' ')
    database.setConfig('personalidad', nuevaPersonalidad)
    return `✅ Personalidad actualizada:\n\n"${nuevaPersonalidad}"`
}

function handleRefinar(args) {
    if (args.length === 0) {
        return '❌ Debes proporcionar instrucciones para refinar la personalidad\n\nEjemplo: /refinar sé más formal en tus respuestas'
    }
    
    const refinamiento = args.join(' ')
    const personalidadActual = database.getConfig('personalidad') || ''
    const nuevaPersonalidad = `${personalidadActual}\n${refinamiento}`
    
    database.setConfig('personalidad', nuevaPersonalidad)
    return `✅ Personalidad refinada. Nueva personalidad:\n\n"${nuevaPersonalidad}"`
}

async function handleModelo(args) {
    const modelosDisponibles = await aiProcessor.listOllamaModels()
    
    if (args.length === 0) {
        const modeloActual = database.getConfig('modelo')
        let msg = `🤖 *Gestión de Modelos*\n\n`
        msg += `Modelo actual: *${modeloActual || 'No configurado'}*\n\n`
        
        if (modelosDisponibles.length > 0) {
            msg += `Modelos instalados en Ollama:\n`
            modelosDisponibles.forEach((m, i) => {
                msg += `${i + 1}. ${m}\n`
            })
            msg += `\nUsa */modelo [nombre]* para cambiar.`
        } else {
            msg += `⚠️ No se detectaron modelos en Ollama. Asegúrate de que Ollama esté corriendo.`
        }
        return msg
    }
    
    const nuevoModelo = args[0]
    const modeloAnterior = database.getConfig('modelo')
    
    // Validar si el modelo existe en Ollama
    if (modelosDisponibles.length > 0 && !modelosDisponibles.includes(nuevoModelo)) {
        // Intentar buscar coincidencia parcial (por si falta el tag :latest)
        const match = modelosDisponibles.find(m => m.startsWith(nuevoModelo + ':'))
        if (!match) {
            return `❌ El modelo *${nuevoModelo}* no parece estar instalado en Ollama.\n\nInstálalo con: \`ollama pull ${nuevoModelo}\``
        }
    }
    
    // Descargar el modelo anterior si es diferente
    if (modeloAnterior && modeloAnterior !== nuevoModelo) {
        aiProcessor.unloadModel(modeloAnterior).catch(() => {})
    }

    database.setConfig('modelo', nuevoModelo)
    return `✅ Modelo cambiado a: *${nuevoModelo}*`
}

function handleApiUrl(args) {
    if (args.length === 0) {
        const urlActual = database.getConfig('api_url')
        return `🔗 *Gestión de API URL*\n\nURL actual: *${urlActual || 'Por defecto (http://127.0.0.1:11434)'}*\n\nUsa /apiurl [url] para cambiar, o /apiurl default para restablecer.`
    }
    
    const nuevaUrl = args[0]
    if (nuevaUrl.toLowerCase() === 'default' || nuevaUrl.toLowerCase() === 'reset') {
        database.setConfig('api_url', '')
        return '✅ API URL restablecida a local por defecto.'
    }
    
    database.setConfig('api_url', nuevaUrl)
    return `✅ API URL cambiada a: *${nuevaUrl}*`
}

// ========== COMANDOS DE WHITELIST ==========

function handleWhitelist(args, chatId) {
    if (!database.isAdmin(chatId)) {
        return '⛔ Acceso denegado. Se requiere rol de administrador.'
    }

    const subcommand = args[0]
    
    if (!subcommand) {
        return '📱 *Gestión de Whitelist*\n\nComandos:\n- /whitelist add [número]\n- /whitelist remove [número]\n- /whitelist list'
    }
    
    switch (subcommand.toLowerCase()) {
        case 'add':
            const numeroAdd = args[1]
            if (!numeroAdd) {
                return '❌ Debes proporcionar un número\n\nEjemplo: /whitelist add 521xxxxxxxxxx@c.us'
            }
            
            const formattedAdd = utils.formatPhoneNumber(numeroAdd)
            
            if (database.addToWhitelist(formattedAdd)) {
                return `✅ Usuario ${formattedAdd} agregado a la whitelist`
            } else {
                return `⚠️ El usuario ${formattedAdd} ya está en la whitelist`
            }
            
        case 'remove':
            const numeroRemove = args[1]
            if (!numeroRemove) {
                return '❌ Debes proporcionar un número'
            }
            
            const formattedRemove = utils.formatPhoneNumber(numeroRemove)
            
            if (database.removeFromWhitelist(formattedRemove)) {
                return `✅ Usuario ${formattedRemove} eliminado de la whitelist`
            } else {
                return `⚠️ El usuario ${formattedRemove} no estaba en la whitelist`
            }
            
        case 'list':
            const users = database.getAllWhitelist()
            
            if (users.length === 0) {
                return '📱 La whitelist está vacía'
            }
            
            let mensaje = `📱 *Usuarios autorizados (${users.length})*\n\n`
            users.forEach((user, index) => {
                const date = new Date(user.added_at * 1000)
                mensaje += `${index + 1}. ${user.phone_number}\n`
                mensaje += `   Agregado: ${date.toLocaleDateString('es-MX')}\n\n`
            })
            
            return mensaje
            
        default:
            return `❌ Subcomando desconocido: ${subcommand}\n\nUsa: add, remove o list`
    }
}

// ========== GOOGLE CALENDAR ==========

async function handleCalendario(args, chatId) {
    const subcomando = args[0] ? args[0].toLowerCase() : 'menu'
    
    // 1. Verificar autenticación (excepto para conectar/codigo)
    const isAuth = calendarService.isUserAuthenticated(chatId)
    
    if (subcomando === 'conectar') {
        const url = calendarService.getAuthUrl()
        return `🔗 *Vincula tu Google Calendar*\n\n1. Abre este link: ${url}\n2. Autoriza la aplicación.\n3. Copia el código que te dan.\n4. Escribe aquí:\n\`/calendario codigo TU_CODIGO_AQUI\``
    }
    
    if (subcomando === 'codigo') {
        const code = args[1]
        if (!code) return '❌ Debes pegar el código.\nEjemplo: `/calendario codigo 4/0AeaY...`'
        
        try {
            await calendarService.redeemCode(chatId, code)
            return '✅ *¡Conexión exitosa!*\nAhora puedes usar `/calendario listar` o pedirme agregar eventos.'
        } catch (error) {
            return '❌ Error al vincular: Código inválido o expirado.'
        }
    }
    
    if (!isAuth) {
        return '⚠️ *No estás conectado a Google Calendar*\n\nUsa `/calendario conectar` para empezar.'
    }
    
    if (subcomando === 'listar' || subcomando === 'eventos') {
        try {
            const events = await calendarService.listUpcomingEvents(chatId)
            if (!events || events.length === 0) return '📅 No tienes próximos eventos.'
            
            let response = '📅 *Próximos Eventos:*\n\n'
            events.forEach((ev, i) => {
                const start = ev.start.dateTime || ev.start.date
                const dateStr = new Date(start).toLocaleString('es-ES', { 
                    weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                })
                response += `${i+1}. *${ev.summary}*\n   🕒 ${dateStr}\n\n`
            })
            return response
        } catch (error) {
            return '❌ Error obteniendo eventos. Tu sesión puede haber expirado. Intenta `/calendario conectar` de nuevo.'
        }
    }
    
    if (subcomando === 'agregar' || subcomando === 'crear') {
        const text = args.slice(1).join(' ')
        if (!text) return '❌ Dime qué agregar.\nEjemplo: `/calendario agregar Cena mañana a las 8pm`'
        
        try {
            // Intento de Quick Add
            const event = await calendarService.quickAddEvent(chatId, text)
            return `✅ *Evento Creado*\n\n📝 ${event.summary}\n🔗 [Ver en Calendar](${event.htmlLink})`
        } catch (error) {
             return '❌ No pude crear el evento.'
        }
    }

    if (subcomando === 'desconectar') {
        database.deleteGoogleCredentials(chatId)
        return '👋 Te has desconectado de Google Calendar.'
    }
    
    // Menú Principal
    return `📅 *Google Calendar Bot*\n\nEstado: ${isAuth ? '✅ Conectado' : '❌ Desconectado'}\n\nComandos:\n- \`/calendario conectar\`\n- \`/calendario listar\`\n- \`/calendario agregar [texto]\`\n- \`/calendario desconectar\``
}

function handleResumen(args, chatId) {
    if (args.length === 0) {
        const currentTime = database.getUserSetting(chatId, 'daily_summary_time', '07:00')
        return `📅 *Resumen Diario*\n\nTu horario actual de reporte es: *${currentTime}*\n\nPara cambiarlo usa: \`/resumen HH:MM\`\nEjemplo: \`/resumen 08:30\``
    }

    const time = args[0]
    // Validar formato HH:MM
    if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time)) {
        return '❌ Formato inválido. Usa HH:MM (ej: 07:00, 14:30, 20:00)'
    }

    // Normalizar a HH:MM (por si ponen 7:00 -> 07:00)
    const [h, m] = time.split(':')
    const normalizedTime = `${h.padStart(2, '0')}:${m}`

    database.setUserSetting(chatId, 'daily_summary_time', normalizedTime)
    
    return `✅ *Horario actualizado*\n\nRecibirás tu resumen de eventos todos los días a las *${normalizedTime}*.`
}

// ========== COMANDOS DE RECORDATORIOS ==========

async function handleRecordar(args, chatId) {
    if (args.length === 0) {
        return '❌ Debes proporcionar un mensaje para recordar\n\nEjemplo: /recordar Comprar leche en 2 horas'
    }
    
    const texto = args.join(' ')
    const model = database.getConfig('modelo')
    
    // Usar IA para parsing si hay modelo, sino fallback a utils
    let extracted
    if (model) {
        console.log('🤖 Usando IA para interpretar recordatorio...')
        extracted = await aiProcessor.parseReminderWithAI(texto, model)
    } else {
        extracted = utils.extractReminderFromText(texto)
    }
    
    const message = extracted.message || texto
    const timeExpression = extracted.timeExpression || null
    
    try {
        const result = reminders.createReminder(chatId, message, timeExpression)
        
        if (result.type === 'scheduled') {
            return `✅ Recordatorio creado\n\n📅 ${utils.formatDate(result.triggerDate)}\n💬 ${message}\n🆔 ID: ${result.id}`
        } else {
            return `✅ Tarea creada (sin fecha)\n\n💬 ${message}\n🆔 ID: ${result.id}\n\n💡 Usa /fecha ${result.id} [fecha] para agregar fecha`
        }
    } catch (error) {
        return `❌ ${error.message}\n\nEjemplo: /recordar Llamar al doctor en 2 horas`
    }
}

async function handleTarea(args, chatId) {
    if (args.length === 0) {
        return '❌ Debes proporcionar una descripción para la tarea\n\nEjemplo: /tarea Revisar documentos pendientes'
    }
    
    const texto = args.join(' ')
    const model = database.getConfig('modelo')

    let extracted
    if (model) {
        console.log('🤖 Usando IA para interpretar tarea...')
        extracted = await aiProcessor.parseReminderWithAI(texto, model)
    } else {
        extracted = utils.extractReminderFromText(texto)
    }
    
    const message = extracted.message || texto
    const timeExpression = extracted.timeExpression || null
    
    try {
        // createReminder maneja null timeExpression creando una 'task' normal
        const result = reminders.createReminder(chatId, message, timeExpression)
        
        if (result.type === 'scheduled') {
             return `✅ Tarea programada\n\n📅 ${utils.formatDate(result.triggerDate)}\n💬 ${message}\n🆔 ID: ${result.id}`
        } else {
            return `✅ Tarea creada\n\n💬 ${message}\n🆔 ID: ${result.id}\n\n💡 Usa /fecha ${result.id} [fecha] para agregar fecha`
        }
    } catch (error) {
         return `❌ Error creando tarea: ${error.message}`
    }
}

function handleListarRecordatorios(chatId) {
    return reminders.listReminders(chatId, false)
}

function handleCompletar(args) {
    if (args.length === 0) {
        return '❌ Debes proporcionar el ID del recordatorio\n\nEjemplo: /completar 5'
    }
    
    const id = parseInt(args[0])
    
    if (isNaN(id)) {
        return '❌ El ID debe ser un número'
    }
    
    if (reminders.completeReminder(id)) {
        return `✅ Recordatorio #${id} marcado como completado`
    } else {
        return `❌ No se encontró el recordatorio #${id}`
    }
}

function handleCancelar(args) {
    if (args.length === 0) {
        return '❌ Debes proporcionar el ID del recordatorio\n\nEjemplo: /cancelar 5'
    }
    
    const id = parseInt(args[0])
    
    if (isNaN(id)) {
        return '❌ El ID debe ser un número'
    }
    
    if (reminders.cancelReminder(id)) {
        return `✅ Recordatorio #${id} cancelado`
    } else {
        return `❌ No se encontró el recordatorio #${id}`
    }
}

function handleAgregarFecha(args, chatId) {
    if (args.length < 2) {
        return '❌ Debes proporcionar el ID y la fecha\n\nEjemplo: /fecha 5 en 2 horas'
    }
    
    const id = parseInt(args[0])
    
    if (isNaN(id)) {
        return '❌ El ID debe ser un número'
    }
    
    const dateString = args.slice(1).join(' ')
    
    try {
        // Primero intentar actualizar (funciona para cualquier recordatorio)
        try {
            const result = reminders.updateReminderDate(id, dateString, chatId)
            return `✅ Fecha modificada del recordatorio #${id}\n\n📅 ${result.formatted}`
        } catch (updateError) {
            // Si falla updateReminderDate, intentar addDateToTask (por compatibilidad)
            const result = reminders.addDateToTask(id, dateString, chatId)
            return `✅ Fecha agregada al recordatorio #${id}\n\n📅 ${result.formatted}`
        }
    } catch (error) {
        return `❌ ${error.message}`
    }
}

function handleLimpiar(chatId) {
    const deleted = database.clearConversationHistory(chatId)
    if (deleted > 0) {
        return '🧹 *Memoria borrada*\n\nHe olvidado nuestra conversación anterior. ¿De qué quieres hablar?'
    } else {
        return '🧹 La memoria ya estaba vacía.'
    }
}

function handleStats() {
    const stats = database.getStats()
    return `📊 *Estadísticas del Bot*
    
💬 Mensajes totales: ${stats.totalMessages}
📅 Recordatorios pendientes: ${stats.totalReminders}
👥 Usuarios en whitelist: ${stats.whitelistCount}`
}

// ========== ACTIVACIÓN Y ROLES ==========

function handleActivar(args, chatId, client) {
    if (args.length === 0) {
        return '🔑 Para activar a un usuario, usa:\n/activar [codigo]'
    }

    const code = args[0]
    const requesterId = database.useActivationCode(code, chatId)

    if (!requesterId) {
        return '❌ Código inválido, ya utilizado o no existe.'
    }

    if (database.addToWhitelist(requesterId)) {
        // Intentar notificar al usuario (opcional, si logramos obtener el chat)
        client.sendMessage(requesterId, '✨ ¡Tu cuenta ha sido ACTIVADA por un administrador! ✨\n\nYa puedes usar todas las funciones del bot.')
        return `✅ Usuario ${requesterId} activado correctamente.`
    }

    return '⚠️ El usuario ya estaba en la whitelist, pero el código fue marcado como usado.'
}

function handleGenerar(chatId) {
    if (database.isInWhitelist(chatId)) {
        return '✅ Ya tienes acceso al sistema. No necesitas generar un código.'
    }

    const code = database.createActivationCode(chatId)
    return `🔑 *Tu código de solicitud:* ${code}\n\nEnvía este código a un administrador para que active tu acceso.`
}

function handleInactivar(args) {
    if (args.length === 0) {
        return '❌ Debes proporcionar el número a inactivar.'
    }

    const numero = utils.formatPhoneNumber(args[0])

    if (database.removeFromWhitelist(numero)) {
        return `✅ Usuario ${numero} ha sido inactivado y removido de la whitelist.`
    } else {
        return `⚠️ El usuario ${numero} no estaba activo.`
    }
}

// ========== AYUDA ==========

function showHelp(chatId) {
    const isAdmin = database.isAdmin(chatId)
    
    let help = `📚 *Comandos Disponibles*

*General:*
/menu - Ver este menú
/tareas - Ver tus pendientes
/borrar [ID] - Eliminar una tarea
/limpiar - Reiniciar conversación IA
/memoria - Ver lo que sé de ti
/generar - Solicitar código de acceso

*Recordatorios:*
/recordar [mensaje] en [tiempo] - Crear recordatorio
/tarea [mensaje] - Crear tarea sin fecha
/recordatorios - Ver todos pendientes
/fecha [ID] [fecha] - Agregar fecha a tarea
/completar [ID] - Marcar como hecho
/posponer [tiempo] - Posponer el último recordatorio
/cancelar [ID] - Cancelar recordatorio

*Ejemplos:*
/recordar Comprar leche en 30 minutos
/recordar Reunión el 15 de marzo a las 10am
/tarea Revisar documentos
/fecha 3 mañana a las 9am
/posponer en 2 horas`

    if (isAdmin) {
        help += `

*Administración (ADMIN):*
/activar [código] - Activar a un solicitante
/inactivar [número] - Quitar acceso
/stats - Estadísticas generales
/whitelist [add/remove/list] - Gestión de usuarios

*Configuración (ADMIN):*
/nombre [nombre] - Cambiar nombre del bot
/personalidad [texto] - Cambiar personalidad
/refinar [texto] - Ajustar personalidad
/modelo [nombre] - Cambiar modelo de Ollama
/apiurl [url] - Cambiar URL de API (Ollama/Web)`
    }

    return help
}

function handleMemoria(chatId) {
    const memories = database.getMemories(chatId, 10)
    
    if (memories.length === 0) {
        return '🧠 No tengo memorias guardadas sobre ti aún.'
    }
    
    let mensaje = `🧠 *Memorias sobre ti*\n\n`
    memories.forEach(m => {
        mensaje += `🆔 *${m.id}* (${m.category}): ${m.content}\n`
    })
    
    mensaje += `\nPara borrar una memoria usa: /olvidar [ID]`
    return mensaje
}

function handleOlvidar(args, chatId) {
    if (args.length === 0) {
        return '❌ Debes especificar el ID de la memoria a olvidar.\nEjemplo: /olvidar 5'
    }
    
    const id = parseInt(args[0])
    if (isNaN(id)) {
        return '❌ El ID debe ser un número.'
    }
    
    // Verificar que la memoria pertenezca al chat (aunque deleteMemory solo borra por ID, es bueno validar o asumir que el ID es único globalmente, mejor: deleteMemory debería checar ownership si fuera multi-user estricto, pero por ahora confiamos en el ID)
    // En una implementación más estricta, getMemoryById comprobaría el chatId.
    // Asumiremos que el usuario ve sus propios IDs con /memoria
    
    if (database.deleteMemory(id)) {
        return `🗑️ Memoria ${id} eliminada para siempre.`
    } else {
        return `❌ No se encontró la memoria con ID ${id}.`
    }
}

async function handlePosponer(args, chatId) {
    const lastReminder = database.getLastCompletedReminder(chatId)
    if (!lastReminder) {
        return '❌ No hay ningún recordatorio reciente para posponer.'
    }

    const model = database.getConfig('modelo')
    if (!model) return '❌ Error: No hay modelo configurado'

    const texto = args.join(' ')
    if (!texto) {
        return '❌ Dime cuánto tiempo lo pospongo (ej: /posponer 10 min)'
    }

    const result = await aiProcessor.analyzePostponeIntent(texto, lastReminder, model)
    
    if (result.isPostpone && result.newDate) {
        try {
            const newReminder = reminders.createReminder(
                chatId, 
                lastReminder.message, 
                result.newDate.toISOString()
            )
            
            return `✅ *Recordatorio pospuesto*\n\nOriginal: "${lastReminder.message}"\nNueva fecha: ${utils.formatDate(newReminder.triggerDate)}\n🆔 ID: ${newReminder.id}`
        } catch (error) {
            console.error('❌ Error al posponer:', error)
            return '❌ Error al crear el nuevo recordatorio pospuesto.'
        }
    } else {
        return '❌ No pude entender cuánto tiempo quieres posponerlo. Intenta algo como "10 min" o "mañana".'
    }
}

module.exports = {
    processCommand
}
