const database = require('./database')
const reminders = require('./reminders')
const utils = require('./utils')

async function processCommand(message, chatId, client) {
    const texto = message.body.trim()
    
    // No es un comando
    if (!texto.startsWith('/')) return null
    
    const parts = texto.slice(1).split(' ')
    const command = parts[0].toLowerCase()
    const args = parts.slice(1)
    
    try {
        switch (command) {
            case 'nombre':
                return handleNombre(args)
                
            case 'personalidad':
                return handlePersonalidad(args)
                
            case 'refinar':
                return handleRefinar(args)
                
            case 'modelo':
                return handleModelo(args)
                
            case 'whitelist':
                return handleWhitelist(args)
                
            case 'recordar':
                return handleRecordar(args, chatId)
                
            case 'tarea':
                return handleTarea(args, chatId)
                
            case 'recordatorios':
                return handleListarRecordatorios(chatId)
                
            case 'completar':
                return handleCompletar(args)
                
            case 'cancelar':
                return handleCancelar(args)
                
            case 'fecha':
                return handleAgregarFecha(args, chatId)
                
            case 'ayuda':
            case 'help':
                return showHelp()
                
            default:
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

function handleModelo(args) {
    if (args.length === 0) {
        const modeloActual = database.getConfig('modelo') || 'Leslye'
        return `Modelo actual: *${modeloActual}*`
    }
    
    const nuevoModelo = args[0]
    database.setConfig('modelo', nuevoModelo)
    return `✅ Modelo cambiado a: *${nuevoModelo}*\n\n⚠️ Asegúrate de que el modelo esté disponible en Ollama`
}

// ========== COMANDOS DE WHITELIST ==========

function handleWhitelist(args) {
    const subcommand = args[0]
    
    if (!subcommand) {
        return '📱 *Gestión de Whitelist*\n\nComandos:\n- /whitelist add [número]\n- /whitelist remove [número]\n- /whitelist list'
    }
    
    switch (subcommand.toLowerCase()) {
        case 'add':
            const numeroAdd = args[1]
            if (!numeroAdd) {
                return '❌ Debes proporcionar un número\n\nEjemplo: /whitelist add 5213321082748@c.us'
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

// ========== COMANDOS DE RECORDATORIOS ==========

function handleRecordar(args, chatId) {
    if (args.length === 0) {
        return '❌ Debes proporcionar un mensaje para recordar\n\nEjemplo: /recordar Comprar leche en 2 horas'
    }
    
    const texto = args.join(' ')
    
    // Intentar extraer tiempo del texto
    const patterns = [
        /(.+?)\s+(en|el)\s+(.+)/i,
        /(.+)/i
    ]
    
    let message = texto
    let timeExpression = null
    
    for (const pattern of patterns) {
        const match = texto.match(pattern)
        if (match) {
            if (match[3]) {
                message = match[1].trim()
                timeExpression = match[3].trim()
            } else {
                message = match[1].trim()
            }
            break
        }
    }
    
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

function handleTarea(args, chatId) {
    if (args.length === 0) {
        return '❌ Debes proporcionar una descripción para la tarea\n\nEjemplo: /tarea Revisar documentos pendientes'
    }
    
    const message = args.join(' ')
    const result = reminders.createReminder(chatId, message, null)
    
    return `✅ Tarea creada\n\n💬 ${message}\n🆔 ID: ${result.id}\n\n💡 Usa /fecha ${result.id} [fecha] para agregar fecha`
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
        const result = reminders.addDateToTask(id, dateString, chatId)
        return `✅ Fecha agregada al recordatorio #${id}\n\n📅 ${result.formatted}`
    } catch (error) {
        return `❌ ${error.message}`
    }
}

// ========== AYUDA ==========

function showHelp() {
    return `📚 *Comandos Disponibles*

*Configuración:*
/nombre [nombre] - Cambiar mi nombre
/personalidad [texto] - Cambiar personalidad
/refinar [instrucciones] - Refinar personalidad
/modelo [nombre] - Cambiar modelo de IA

*Whitelist:*
/whitelist add [número] - Agregar usuario
/whitelist remove [número] - Quitar usuario
/whitelist list - Ver usuarios autorizados

*Recordatorios:*
/recordar [mensaje] en [tiempo] - Crear recordatorio
/tarea [mensaje] - Crear tarea sin fecha
/recordatorios - Ver todos pendientes
/fecha [ID] [fecha] - Agregar fecha a tarea
/completar [ID] - Marcar como hecho
/cancelar [ID] - Cancelar recordatorio

*Ejemplos:*
/recordar Comprar leche en 30 minutos
/recordar Reunión el 15 de marzo a las 10am
/tarea Revisar documentos
/fecha 3 mañana a las 9am`
}

module.exports = {
    processCommand
}
