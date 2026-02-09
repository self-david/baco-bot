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
        { regex: /en (\d+) segundo/i, multiplier: 1000 },
        { regex: /en (\d+) minuto/i, multiplier: 60 * 1000 },
        { regex: /en (\d+) hora/i, multiplier: 60 * 60 * 1000 },
        { regex: /en (\d+) d[ií]a/i, multiplier: 24 * 60 * 60 * 1000 },
        { regex: /en (\d+) semana/i, multiplier: 7 * 24 * 60 * 60 * 1000 }
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
        /recu[ée]rdame\s+(.+?)\s+(en|el)\s+(.+)/i,
        /recu[ée]rdame\s+(.+)/i,
        /no\s+olvides?\s+(.+)/i,
        /importante\s*[:.]?\s*(.+)/i
    ]
    
    for (const pattern of patterns) {
        const match = text.match(pattern)
        if (match) {
            return {
                found: true,
                message: match[1].trim(),
                timeExpression: match[3] ? match[3].trim() : null
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
