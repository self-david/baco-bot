const database = require('./database')
const utils = require('./utils')

let client = null
let reminderCheckInterval = null

function initReminders(whatsappClient) {
    client = whatsappClient
    console.log('⏰ Iniciando sistema de recordatorios...')
    
    // Verificar recordatorios cada minuto
    reminderCheckInterval = setInterval(checkReminders, 60 * 1000)
    
    console.log('✅ Sistema de recordatorios activo')
}

async function checkReminders() {
    try {
        const pendingReminders = database.getPendingReminders()
        
        for (const reminder of pendingReminders) {
            await sendReminder(reminder)
            database.updateReminderStatus(reminder.id, 'completed')
        }
    } catch (error) {
        console.error('❌ Error verificando recordatorios:', error)
    }
}

async function sendReminder(reminder) {
    if (!client) {
        console.error('❌ Cliente de WhatsApp no inicializado')
        return
    }
    
    try {
        const message = `🔔 *RECORDATORIO*\n\n${reminder.message}`
        await client.sendMessage(reminder.chat_id, message)
        console.log(`✅ Recordatorio enviado a ${reminder.chat_id}`)
    } catch (error) {
        console.error('❌ Error enviando recordatorio:', error)
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
    stopReminders
}
