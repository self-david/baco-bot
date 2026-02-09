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
    
    // Emojis de números del 0-9 y luego usaremos formato alternativo
    const numberEmojis = ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣']
    
    let message = `📋 *Recordatorios (${reminders.length})*\n\n`
    
    if (scheduled.length > 0) {
        message += '⏰ *CON FECHA*\n\n'
        
        scheduled.forEach((r, index) => {
            const date = new Date(r.trigger_date * 1000)
            const dateStr = formatDateShort(date)
            const emoji = index < 10 ? numberEmojis[index + 1] : `*[${index + 1}]*`
            message += `${emoji} ${r.message}\n`
            message += `   _📅 ${dateStr}_\n`
            message += `   ~ID: ${r.id}~\n\n`
        })
    }
    
    if (tasks.length > 0) {
        message += '📝 *SIN FECHA*\n\n'
        
        tasks.forEach((r, index) => {
            const emoji = index < 10 ? numberEmojis[index + 1] : `*[${index + 1}]*`
            message += `${emoji} ${r.message}\n`
            message += `   ~ID: ${r.id}~\n\n`
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
