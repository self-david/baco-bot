const chrono = require('chrono-node')

function formatPhoneNumber(number) {
    if (number.includes('@c.us')) return number
    return `${number}@c.us`
}

function isValidWhatsAppNumber(number) {
    return /^\d{10,}@c\.us$/.test(number)
}

function parseRelativeTime(text) {
    // Intentar parsear con chrono-node primero (soporta español)
    const parsed = chrono.es.parseDate(text, new Date(), { forwardDate: true })
    if (parsed) return parsed
    
    // Fallback manual para patrones simples
    const patterns = [
        { regex: /(?:en\s+)?(\d+)\s+segundos?/i, multiplier: 1000 },
        { regex: /(?:en\s+)?(\d+)\s+minutos?/i, multiplier: 60 * 1000 },
        { regex: /(?:en\s+)?(\d+)\s+horas?/i, multiplier: 60 * 60 * 1000 },
        { regex: /(?:en\s+)?(\d+)\s+d[ií]as?/i, multiplier: 24 * 60 * 60 * 1000 },
        { regex: /(?:en\s+)?(\d+)\s+semanas?/i, multiplier: 7 * 24 * 60 * 60 * 1000 }
    ]
    
    for (const pattern of patterns) {
        const match = text.match(pattern.regex)
        if (match) {
            const amount = parseInt(match[1])
            return new Date(Date.now() + amount * pattern.multiplier)
        }
    }
    
    return null
}

function formatDate(date) {
    if (!date) return 'Sin fecha'
    
    const options = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    }
    
    return date.toLocaleString('es-MX', options)
}

function formatDateShort(date) {
    if (!date) return 'Sin fecha'
    
    return date.toLocaleString('es-MX', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
}

function extractReminderFromText(text) {
    // Patrones para detectar recordatorios
    const patterns = [
        // 1. Estándar: "Recuérdame comprar leche en 10 minutos"
        /(?:recu[ée]rdame|no olvides|acu[ée]rdate|av[íi]same)\s+(?:que|de)?\s*(.+?)\s+(?:en|el|dentro de)\s+(.+)/i,
        
        // 2. Inverso: "En 10 minutos recuérdame comprar leche"
        /(?:en|el|dentro de)\s+(.+?)\s+(?:recu[ée]rdame|no olvides|av[íi]same)\s+(?:que|de)?\s*(.+)/i,
        
        // 3. Simple con tiempo al final: "Comprar leche en 10 minutos porfa" (requiere palabras clave de recordatorio en algún lado o ser muy explícito)
        /(?:recu[ée]rdame|no olvides|av[íi]same)\s+(.+)/i,
        
        // 4. "Tengo que X en Y" (experimental)
        /tengo que\s+(.+?)\s+(?:en|el|dentro de)\s+(.+)/i
    ]
    
    for (const pattern of patterns) {
        const match = text.match(pattern)
        if (match) {
            // Identificar qué grupo es mensaje y qué grupo es tiempo
            // Esto depende del regex. 
            // Para el patrón 2 (Inverso), match[1] es tiempo, match[2] es mensaje.
            // Para el patrón 1 (Estándar), match[1] es mensaje, match[2] es tiempo.
            
            let message, timeExpression
            
            if (pattern.source.startsWith('(?:en|el|dentro de)')) {
                // Caso inverso
                timeExpression = match[1].trim()
                message = match[2].trim()
            } else {
                // Caso estándar
                message = match[1].trim()
                timeExpression = match[2] ? match[2].trim() : null // Puede ser null en caso 3
            }

            return {
                found: true,
                message: message,
                timeExpression: timeExpression
            }
        }
    }
    
    return { found: false }
}

function containsImportantKeywords(text) {
    const keywords = [
        'importante',
        'urgente',
        'no olvides',
        'pendiente',
        'reunión',
        'junta',
        'cita',
        'deadline',
        'entrega',
        'recordar',
        'acuérdate',
        'compromiso',
        'mañana',
        'próximo',
        'siguiente semana'
    ]
    
    const lowerText = text.toLowerCase()
    return keywords.some(keyword => lowerText.includes(keyword))
}

function formatRemindersList(reminders) {
    if (reminders.length === 0) {
        return '📋 No tienes recordatorios pendientes'
    }
    
    let message = `📋 *Recordatorios Pendientes (${reminders.length})*\n\n`
    
    // Separar por tipo
    const scheduled = reminders.filter(r => r.type === 'scheduled')
    const tasks = reminders.filter(r => r.type === 'task')
    
    if (scheduled.length > 0) {
        message += '*⏰ Con fecha:*\n'
        scheduled.forEach((r, index) => {
            const date = new Date(r.trigger_date * 1000)
            message += `${index + 1}. ${r.message}\n`
            message += `   📅 ${formatDateShort(date)}\n`
            message += `   ID: ${r.id}\n\n`
        })
    }
    
    if (tasks.length > 0) {
        message += '*📝 Tareas pendientes:*\n'
        tasks.forEach((r, index) => {
            message += `${index + 1}. ${r.message}\n`
            message += `   ID: ${r.id}\n\n`
        })
    }
    
    message += '\n💡 Usa /completar [ID] para marcar como hecho'
    message += '\n💡 Usa /fecha [ID] [fecha] para agregar fecha a una tarea'
    
    return message
}

module.exports = {
    formatPhoneNumber,
    isValidWhatsAppNumber,
    parseRelativeTime,
    formatDate,
    formatDateShort,
    extractReminderFromText,
    containsImportantKeywords,
    formatRemindersList
}
