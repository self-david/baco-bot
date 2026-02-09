const ollama = require('ollama').default
const database = require('./database')
const utils = require('./utils')

async function generateResponse(chatId, userMessage, personality, model = 'Leslye') {
    try {
        // Guardar mensaje del usuario
        database.saveMessage(chatId, 'user', userMessage)
        
        // Obtener historial reciente
        const recentMessages = database.getRecentMessages(chatId, 8)
        
        // Construir prompt con personalidad
        const promptMessages = [
            { role: 'system', content: personality },
            ...recentMessages
        ]
        
        // Llamar a Ollama
        const response = await ollama.chat({
            model: model,
            messages: promptMessages,
            keep_alive: -1
        })
        
        const replyIA = response.message.content
        
        // Guardar respuesta de la IA
        database.saveMessage(chatId, 'assistant', replyIA)
        
        return replyIA
        
    } catch (error) {
        console.error('❌ Error en Ollama:', error)
        throw new Error('No pude generar una respuesta. Verifica que Ollama esté corriendo')
    }
}

function analyzeReminderIntent(text) {
    const lowerText = text.toLowerCase()
    
    // Patrones explícitos de recordatorios
    const explicitPatterns = [
        /recu[ée]rdame/i,
        /no olvides/i,
        /avísame/i,
        /notif[íi]came/i
    ]
    
    const isExplicit = explicitPatterns.some(pattern => pattern.test(text))
    
    if (isExplicit) {
        const extracted = utils.extractReminderFromText(text)
        return {
            isReminder: true,
            message: extracted.message || text,
            timeExpression: extracted.timeExpression
        }
    }
    
    return {
        isReminder: false,
        message: null,
        timeExpression: null
    }
}

function detectImportantContext(userMessage, aiResponse) {
    // No sugerir si ya es un comando
    if (userMessage.startsWith('/')) {
        return false
    }
    
    // Verificar palabras clave importantes
    const hasImportantKeywords = utils.containsImportantKeywords(userMessage) || 
                                  utils.containsImportantKeywords(aiResponse)
    
    // Verificar si menciona fechas
    const datePatterns = [
        /\d{1,2}[\/\-]\d{1,2}/, // 15/03 o 15-03
        /\d{1,2}\s+de\s+\w+/, // 15 de marzo
        /mañana/i,
        /próxim[oa]/i,
        /siguiente/i,
        /\d{1,2}:\d{2}/, // 10:30
    ]
    
    const hasDates = datePatterns.some(pattern => 
        pattern.test(userMessage) || pattern.test(aiResponse)
    )
    
    // Sugerir recordatorio si tiene ambos: keywords y fechas
    return hasImportantKeywords && hasDates
}

module.exports = {
    generateResponse,
    analyzeReminderIntent,
    detectImportantContext
}
