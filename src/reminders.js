const database = require('./database')
const utils = require('./utils')

let client = null
let reminderCheckInterval = null

function initReminders(whatsappClient) {
    client = whatsappClient
    console.log('⏰ Iniciando sistema de recordatorios...')
    
    // Verificar recordatorios cada 10 segundos para debug
    reminderCheckInterval = setInterval(checkReminders, 10 * 1000)
    
    console.log('✅ Sistema de recordatorios activo (Check cada 10s)')
}

async function checkReminders() {
    try {
        const pendingReminders = database.getPendingReminders()
        
        if (pendingReminders.length > 0) {
            console.log(`🔍 Encontrados ${pendingReminders.length} recordatorios pendientes de envío.`)
        }

        for (const reminder of pendingReminders) {
            console.log(`⚡ Procesando recordatorio ID ${reminder.id}...`)
            await sendReminder(reminder)
            database.updateReminderStatus(reminder.id, 'completed')
            console.log(`🏁 Recordatorio ID ${reminder.id} marcado como completado.`)
        }
    } catch (error) {
        console.error('❌ Error verificando recordatorios:', error)
    }
}

const aiProcessor = require('./ai-processor') // Importar AI Processor

// ...

async function sendReminder(reminder) {
    if (!client) {
        console.error('❌ CRÍTICO: Cliente de WhatsApp es NULL en sendReminder')
        return
    }
    
    console.log(`📤 Procesando envío de recordatorio a ${reminder.chat_id}...`)
    
    let messageToSend = `🔔 *RECORDATORIO*\n\n${reminder.message}`
    
    try {
        // Intentar humanizar el mensaje
        const personality = database.getConfig('personalidad') || 'Eres un asistente útil.'
        const model = database.getConfig('modelo')
        
        if (model) {
            const humanized = await aiProcessor.humanizeReminder(reminder.message, personality, model)
            messageToSend = `🔔 *RECORDATORIO*\n\n${humanized}`
        }
        
    } catch (error) {
        console.error('⚠️ Falló la humanización, enviando original:', error)
    }
    
    try {
        const chat = await client.getChatById(reminder.chat_id)
        if (chat) {
            await chat.sendMessage(messageToSend)
            console.log(`✅ Recordatorio enviado exitosamente a ${reminder.chat_id}`)
        } else {
            console.log(`⚠️ Chat ${reminder.chat_id} no encontrado con getChatById, intentando envío directo...`)
            await client.sendMessage(reminder.chat_id, messageToSend)
            console.log(`✅ Recordatorio enviado directo a ${reminder.chat_id}`)
        }
    } catch (error) {
        console.error(`❌ FALLÓ envío de recordatorio a ${reminder.chat_id}:`, error)
    }
}

function createReminder(chatId, message, dateString = null) {
    let triggerDate = null
    let type = 'task'
    
    if (dateString) {
        // Intentar parsear fecha
        triggerDate = utils.parseRelativeTime(dateString)
        
        if (triggerDate) {
            type = 'scheduled'
        } else {
            throw new Error('No pude entender la fecha/tiempo especificado')
        }
    }
    
    const reminderId = database.createReminder(chatId, message, triggerDate, type)
    
    return {
        id: reminderId,
        type,
        triggerDate,
        message
    }
}

function analyzeMessageForReminder(text) {
    const extracted = utils.extractReminderFromText(text)
    
    if (!extracted.found) {
        return null
    }
    
    return {
        message: extracted.message,
        timeExpression: extracted.timeExpression
    }
}

function shouldSuggestReminder(userMessage, aiResponse) {
    // No sugerir si ya es un comando de recordatorio
    if (userMessage.toLowerCase().includes('recordar') || userMessage.startsWith('/')) {
        return false
    }
    
    // Verificar si tiene palabras clave importantes
    const hasKeywords = utils.containsImportantKeywords(userMessage) || 
                        utils.containsImportantKeywords(aiResponse)
    
    // Verificar si contiene fechas
    const hasDates = /\d{1,2}[\/\-]\d{1,2}|\d{1,2}\s+de\s+\w+|mañana|próximo|siguiente/i.test(userMessage + ' ' + aiResponse)
    
    return hasKeywords && hasDates
}

function listReminders(chatId, includeCompleted = false) {
    const reminders = database.getAllReminders(chatId, includeCompleted)
    return utils.formatRemindersList(reminders)
}

function completeReminder(reminderId) {
    return database.updateReminderStatus(reminderId, 'completed')
}

function cancelReminder(reminderId) {
    return database.deleteReminder(reminderId)
}

function addDateToTask(taskId, dateString, chatId) {
    const triggerDate = utils.parseRelativeTime(dateString)
    
    if (!triggerDate) {
        throw new Error('No pude entender la fecha/tiempo especificado')
    }
    
    const success = database.addDateToTask(taskId, triggerDate)
    
    if (!success) {
        throw new Error('No se pudo actualizar la tarea. Verifica que el ID sea correcto y que sea una tarea sin fecha')
    }
    
    return {
        triggerDate,
        formatted: utils.formatDate(triggerDate)
    }
}

function updateReminderDate(reminderId, dateString, chatId) {
    const triggerDate = utils.parseRelativeTime(dateString)
    
    if (!triggerDate) {
        throw new Error('No pude entender la fecha/tiempo especificado')
    }
    
    const success = database.updateReminderDate(reminderId, triggerDate)
    
    if (!success) {
        throw new Error('No se pudo actualizar el recordatorio. Verifica que el ID sea correcto')
    }
    
    return {
        triggerDate,
        formatted: utils.formatDate(triggerDate)
    }
}

function stopReminders() {
    if (reminderCheckInterval) {
        clearInterval(reminderCheckInterval)
        console.log('⏸️  Sistema de recordatorios detenido')
    }
}

module.exports = {
    initReminders,
    createReminder,
    analyzeMessageForReminder,
    shouldSuggestReminder,
    listReminders,
    completeReminder,
    cancelReminder,
    addDateToTask,
    updateReminderDate,
    stopReminders
}
