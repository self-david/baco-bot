const chrono = require('chrono-node')
const Fuse = require('fuse.js')

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
    
    // Fallback con Fuse.js para unidades con typos
    // Extracción más genérica con regex para capturar número y "algo" que parece unidad
    // Patrón: (número) (palabra)
    const manualPattern = /(?:en\s+)?(\d+)\s+([a-zA-ZñÑ]+)/i
    const match = text.match(manualPattern)
    
    if (match) {
        const amount = parseInt(match[1])
        const unitInput = match[2].toLowerCase()
        
        // Unidades base y sus variantes mapeadas a milisegundos
        const units = [
            { name: 'segundos', value: 1000, keys: ['segundos', 'segundo', 'segs', 'seg', 's'] },
            { name: 'minutos', value: 60 * 1000, keys: ['minutos', 'minuto', 'mins', 'min', 'm', 'mintos', 'minuts'] },
            { name: 'horas', value: 60 * 60 * 1000, keys: ['horas', 'hora', 'hrs', 'hs', 'h'] },
            { name: 'dias', value: 24 * 60 * 60 * 1000, keys: ['dias', 'dia', 'días', 'día', 'd'] },
            { name: 'semanas', value: 7 * 24 * 60 * 60 * 1000, keys: ['semanas', 'semana', 'sem'] }
        ]
        
        // Aplanar lista para Fuse
        const flatUnits = []
        units.forEach(u => {
            u.keys.forEach(k => {
                flatUnits.push({ token: k, value: u.value })
            })
        })
        
        const fuse = new Fuse(flatUnits, {
            keys: ['token'],
            threshold: 0.4, // Tolerancia a typos (0.0 exacto, 1.0 cualquier cosa)
        })
        
        const results = fuse.search(unitInput)
        
        if (results.length > 0) {
            const bestMatch = results[0].item
            console.log(`🎯 Fuzzy match: "${unitInput}" -> "${bestMatch.token}" (${bestMatch.value}ms)`)
            return new Date(Date.now() + amount * bestMatch.value)
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
    // 1. Intentar extraer fecha con chrono-node
    const parsedDate = chrono.es.parse(text, new Date(), { forwardDate: true })
    
    if (parsedDate.length > 0) {
        // Usar la primera fecha encontrada convertida a objeto Date
        const dateResult = parsedDate[0]
        const triggerDate = dateResult.start.date()
        
        // 2. Limpiar el texto: Quitar la parte de la fecha identificada
        let cleanText = text.replace(dateResult.text, '').trim()
        
        // 3. Limpiar prefijos comunes y palabras de relleno
        const prefixes = [
            /^(?:hey|hola|ojo|bueno|entonces),?\s*/i,
            /^(?:recu[ée]rdame|no olvides|acu[ée]rdate|av[íi]same|notif[íi]came)\s+(?:que|de|para|por)?\s*/i,
            /^(?:tengo que|debo|hay que|necesito)\s+/i,
            /^(?:a las?|a la|en|el|dentro de|a)\s+/i // "a" solitario o "a la(s)"
        ]

        // 3.1 Limpieza específica para restos de hora (ej: "de la tarde" si chrono solo agarró "5")
        const timeLeftovers = [
            /^(?:de|por) la (?:mañana|tarde|noche)/i,
            /^(?:am|pm)/i
        ]
        
        // Aplicar limpieza iterativa
        let previousText = ''
        while (cleanText !== previousText) {
            previousText = cleanText
            
            // Prefijos
            for (const prefix of prefixes) {
                cleanText = cleanText.replace(prefix, '').trim()
            }
            // Restos de hora
            for (const leftover of timeLeftovers) {
                cleanText = cleanText.replace(leftover, '').trim()
            }
        }

        // 4. Limpieza final de conectores sueltos al inicio o final
        // Ej: "paga la tarjeta el" -> "paga la tarjeta"
        cleanText = cleanText.replace(/\s+(?:el|la|en|a|de|para|por)$/i, '').trim()
        
        // Si después de limpiar no queda nada, usar el texto original (menos la fecha)
        if (!cleanText) {
            cleanText = text.replace(dateResult.text, '').trim()
        }

        return {
            found: true,
            message: cleanText,
            timeExpression: dateResult.text, 
            date: triggerDate
        }
    }
    
    // Fallback regex (se mantiene igual)
    const relativePattern = /(?:en|dentro de)\s+(\d+)\s+(minutos?|mins?|m|horas?|hrs?|h|segundos?|segs?|s)/i
    const match = text.match(relativePattern)
    
    if (match) {
        const timeExpression = match[0]
        let message = text.replace(timeExpression, '').trim()
         
        const prefixes = [
             /^(?:hey|hola|ojo),?\s*/i,
             /^(?:recu[ée]rdame|no olvides|acu[ée]rdate|av[íi]same)\s+(?:que|de|para)?\s*/i,
             /^(?:tengo que|debo)\s+/i
        ]
        for (const prefix of prefixes) {
            message = message.replace(prefix, '').trim()
        }
        
        return {
            found: true,
            message: message,
            timeExpression: timeExpression
        }
    }

    return { found: false }
}

function containsImportantKeywords(text) {
    const keywords = [
        'importante', 'urgente', 'no olvides', 'pendiente', 'reunión', 'junta', 
        'cita', 'deadline', 'entrega', 'recordar', 'acuérdate', 'compromiso', 
        'mañana', 'próximo', 'siguiente semana', 'pagar', 'vencimiento'
    ]
    
    // Configurar Fuse para buscar keywords en el texto
    // Truco: Fuse busca "pattern" en "list of documents".
    // Aquí queremos ver si alguna de las keywords está en el texto.
    // Podemos tokenizar el texto y buscar cada token en la lista de keywords.
    
    const tokens = text.toLowerCase().split(/\s+|[.,;?!]+/)
    
    const fuse = new Fuse(keywords.map(k => ({ key: k })), {
        keys: ['key'],
        threshold: 0.3, // Un poco estricto para no confundir palabras cortas
        includeScore: true
    })
    
    // Verificar si algún token del mensaje hace match con alguna keyword
    for (const token of tokens) {
        // Ignorar palabras muy cortas para evitar falsos positivos
        if (token.length < 4) continue 
        
        const results = fuse.search(token)
        if (results.length > 0) {
            console.log(`🎯 Fuzzy keyword match: "${token}" -> "${results[0].item.key}"`)
            return true
        }
    }
    
    return false
}

function formatRemindersList(reminders) {
    if (reminders.length === 0) {
        return '📋 No tienes recordatorios pendientes'
    }
    
    // Separar por tipo
    const scheduled = reminders.filter(r => r.type === 'scheduled')
    const tasks = reminders.filter(r => r.type === 'task')
    
    // Emojis de números del 0-9
    const numberEmojis = ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣']
    
    let message = `📋 *Recordatorios (${reminders.length})*\n\n`
    
    if (scheduled.length > 0) {
        message += '⏰ *CON FECHA*\n\n'
        
        scheduled.forEach((r) => {
            const date = new Date(r.trigger_date * 1000)
            const dateStr = formatDateShort(date)
            const emoji = r.id <= 9 ? numberEmojis[r.id] : `*[${r.id}]*`
            message += `${emoji} ${r.message}\n`
            message += `   _📅 ${dateStr}_\n\n`
        })
    }
    
    if (tasks.length > 0) {
        message += '📝 *SIN FECHA*\n\n'
        
        tasks.forEach((r) => {
            const emoji = r.id <= 9 ? numberEmojis[r.id] : `*[${r.id}]*`
            message += `${emoji} ${r.message}\n`
        })
    }
    
    message += '💡 _Usa /completar [ID] para marcar como hecho_\n'
    message += '💡 _Usa /fecha [ID] [fecha] para agregar/modificar fecha_'
    
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
