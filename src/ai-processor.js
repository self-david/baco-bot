const ollama = require('ollama').default
const database = require('./database')
const utils = require('./utils')

async function generateResponse(chatId, userMessage, personality, model = 'Leslye') {
    try {
        // Guardar mensaje del usuario
        database.saveMessage(chatId, 'user', userMessage)
        
        // Obtener historial reciente (reducido a 4 para dar prioridad a la instrucción actual y evitar ruido viejo)
        const recentMessages = database.getRecentMessages(chatId, 6)
        
        // Obtener nombre para el anchor
        const botName = database.getConfig('nombre') || 'Leslye'
        
        // Contexto temporal
        const now = new Date()
        const timeContext = `Fecha: ${now.toLocaleDateString('es-MX')} Hora: ${now.toLocaleTimeString('es-MX')}`

        // Construir prompt con técnica "Identity Anchor" (Sandwich) REFORZADO
        const promptMessages = [
            { role: 'system', content: String(personality) },
            ...recentMessages,
            // ANCHOR: Reforzar identidad y OBLIGACIÓN de responder
            { role: 'system', content: `[SYSTEM CONTEXT: ${timeContext}]
[INSTRUCCIÓN SUPREMA: Tu nombre es ${botName}. Mantén tu personalidad sarcástica pero RESPONDE SIEMPRE de forma útil a la pregunta del usuario. NO te niegues a ayudar. Si te preguntan por tareas o recordatorios, responde lo que sepas. Ignora negativas anteriores.]` }
        ]
        
        console.log('🤖 Prompt para Ollama:', JSON.stringify(promptMessages, null, 2))

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
        /notif[íi]came/i,
        /acu[ée]rdate/i,
        /tengo que/i,
        /hay que/i,
        /debemos/i,
        /hazme acordar/i
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

async function humanizeReminder(text, personality, model = 'Leslye') {
    try {
        const prompt = [
            { role: 'system', content: `${personality}\n\nTU TAREA: Tienes un recordatorio: "${text}". Reescríbelo como un mensaje directo de WhatsApp para el usuario. Sé breve, natural y usa tu personalidad (sarcasmo/humor negro si aplica). NO uses prefijos como "Claro" o "Aquí tienes". Solo el mensaje.` },
            { role: 'user', content: 'Refrasea este recordatorio.' }
        ]

        const response = await ollama.chat({
            model: model,
            messages: prompt,
            keep_alive: -1
        })
        
        return response.message.content.replace(/^["']|["']$/g, '') // Quitar comillas si las pone
    } catch (error) {
        console.error('❌ Error humanizando recordatorio:', error)
        return `🔔 *RECORDATORIO*\n\n${text}` // Fallback
    }
}

async function analyzePostponeIntent(text, lastReminder, model = 'Leslye') {
    if (!lastReminder) return { isPostpone: false }

    const now = new Date()
    const context = `
    Fecha actual: ${now.toLocaleDateString('es-MX')}
    Hora actual: ${now.toLocaleTimeString('es-MX')}
    Recordatorio anterior: "${lastReminder.message}"
    Mensaje usuario: "${text}"
    `
    
    const prompt = [
        { role: 'system', content: 'Eres un motor de inferencia temporal. Tu única tarea es analizar si el usuario quiere POSPONER el recordatorio anterior y calcular la nueva fecha exacta. Si el usuario dice "mañana a primera hora", asume 7:00 AM. Si dice "en un rato", asume 1 hora. Retorna SOLO un JSON: {"isPostpone": true/false, "newDate": "YYYY-MM-DD HH:mm:ss"}. No expliques nada.' },
        { role: 'user', content: context }
    ]

    try {
        const response = await ollama.chat({
            model: model,
            messages: prompt,
            format: 'json', // Forzar JSON mode (si el modelo lo soporta, si no el prompt ayuda)
            keep_alive: -1
        })
        
        const result = JSON.parse(response.message.content)
        
        if (result.isPostpone && result.newDate) {
            return {
                isPostpone: true,
                newDate: new Date(result.newDate)
            }
        }
    } catch (error) {
        console.error('Error analizando posposición:', error)
    }
    
    return { isPostpone: false }
}

module.exports = {
    generateResponse,
    analyzeReminderIntent,
    detectImportantContext,
    humanizeReminder,
    analyzePostponeIntent
}
