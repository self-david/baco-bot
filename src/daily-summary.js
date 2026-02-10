const schedule = require('node-schedule')
const database = require('./database')
const calendarService = require('./calendar-service')
const utils = require('./utils')

let client = null

function init(whatsappClient) {
    client = whatsappClient
    console.log('📅 Iniciando servicio de resumen diario...')

    // Ejecutar cada minuto para verificar si hay resúmenes pendientes
    schedule.scheduleJob('* * * * *', checkDailySummaries)
}

async function checkDailySummaries() {
    const now = new Date()
    const currentHour = now.getHours().toString().padStart(2, '0')
    const currentMinute = now.getMinutes().toString().padStart(2, '0')
    const currentTime = `${currentHour}:${currentMinute}`

    // 1. Obtener todos los usuarios que tienen configurado un horario
    // (Por defecto nadie tiene, así que solo procesamos los que hayan configurado)
    // Pero el requerimiento dice "todos los dias a las 7am (con opcion de cambiar)".
    // Así que debemos iterar sobre TODOS los usuarios con token de Google, y si no tienen config, usar 07:00.
    
    // Obtener usuarios con Google Calendar conectado
    // No tenemos una función directa para esto, pero podemos ver quienes tienen token.
    // O mejor, iterar sobre la whitelist y checar si tienen token y preferencia.
    
    // Eficiencia: Iterar sobre whitelist es mejor que sobre toda la DB de tokens si hubiera muchos inactivos.
    // Pero `google_auth` es la fuente de verdad de quien puede recibir eventos.
    // Vamos a agregar una función en database.js para obtener todos los chat_ids con google_auth.
    // Por ahora, como no la tenemos, podemos usar getAllUsersWithSetting para 'daily_summary_time'
    // Y para los defaults (07:00), tendríamos que asumir que todos los de google_auth lo quieren.
    
    // ESTRATEGIA:
    // 1. Obtener todos los usuarios con credenciales de Google.
    // 2. Para cada uno, obtener su hora preferida (default 07:00).
    // 3. Si coincide con currentTime, enviar resumen.

    // Necesitamos una función para listar todos los usuarios con google calendar.
    // Como no quiero modificar database.js otra vez si no es necesario, usaré una query directa si es posible o asumiré
    // que el usuario configurará su hora.
    // PERO el prompt dice "todos los dias a las 7am".
    // Así que voy a modificar database.js levemente para obtener "getAllGoogleUsers" o similar.
    // O MEJOR: getAllWhitelist() y verificar si tienen credenciales.
    
    const users = database.getAllWhitelist()
    
    for (const user of users) {
        const chatId = user.phone_number
        
        // Verificar si tiene Google Calendar conectado
        if (!calendarService.isUserAuthenticated(chatId)) continue

        // Obtener hora configurada (Default: 07:00)
        const preferredTime = database.getUserSetting(chatId, 'daily_summary_time', '07:00')

        if (preferredTime === currentTime) {
            console.log(`✨ Enviando resumen diario a ${chatId} (${currentTime})`)
            await sendDailySummary(chatId)
        }
    }
}

async function sendDailySummary(chatId) {
    const now = new Date()
    
    // Rango: Hoy (00:00 - 23:59)
    const startOfDay = new Date(now)
    startOfDay.setHours(0, 0, 0, 0)
    
    const endOfDay = new Date(now)
    endOfDay.setHours(23, 59, 59, 999)
    
    // Rango: Semana (Hoy - Hoy+7)
    // El requerimiento dice "eventos del dia y de la semana".
    // "Semana" suele interpretarse como los próximos 7 días.
    const endOfWeek = new Date(now)
    endOfWeek.setDate(now.getDate() + 7)
    endOfWeek.setHours(23, 59, 59, 999)

    try {
        console.log(`🔍 Buscando eventos para ${chatId} de ${startOfDay.toISOString()} a ${endOfWeek.toISOString()}`)
        const allWeekEvents = await calendarService.listEventsForTimeRange(chatId, startOfDay, endOfWeek)
        
        if (!allWeekEvents || allWeekEvents.length === 0) {
            console.log(`ℹ️ No se encontraron eventos esta semana para ${chatId}`)
            return
        }

        console.log(`📊 Encontrados ${allWeekEvents.length} eventos en total para la semana.`)

        const todayEvents = allWeekEvents.filter(ev => {
            const evStart = new Date(ev.start.dateTime || ev.start.date)
            return evStart >= startOfDay && evStart <= endOfDay
        })

        const weekEvents = allWeekEvents.filter(ev => {
            const evStart = new Date(ev.start.dateTime || ev.start.date)
            return evStart > endOfDay && evStart <= endOfWeek
        })

        console.log(`✅ Hoy: ${todayEvents.length}, Resto semana: ${weekEvents.length}`)

        if (todayEvents.length > 0) {
            let msgToday = `📅 *Tu Agenda de Hoy:*\n\n`
            todayEvents.forEach((ev, i) => {
                const start = new Date(ev.start.dateTime || ev.start.date)
                const timeStr = isAllDay(ev) ? 'Todo el día' : start.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
                msgToday += `• ${timeStr} - *${ev.summary}*\n`
            })
            await safeSendMessage(chatId, msgToday, 'HOY')
        }

        if (weekEvents.length > 0) {
            let msgWeek = `🗓️ *Resto de la Semana:*\n\n`
            let currentDayStr = ''
            
            weekEvents.forEach(ev => {
                const start = new Date(ev.start.dateTime || ev.start.date)
                const dayStr = start.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
                const timeStr = isAllDay(ev) ? 'Todo el día' : start.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
                
                if (dayStr !== currentDayStr) {
                    msgWeek += `\n🔸 *${dayStr}*\n`
                    currentDayStr = dayStr
                }
                
                msgWeek += `   • ${timeStr} - ${ev.summary}\n`
            })
            await safeSendMessage(chatId, msgWeek, 'SEMANA')
        }

    } catch (error) {
        console.error(`❌ Error enviando resumen a ${chatId}:`, error)
    }
}

async function safeSendMessage(chatId, message, type) {
    try {
        console.log(`📤 Intentando enviar resumen (${type}) a ${chatId}...`)
        const chat = await client.getChatById(chatId)
        if (chat) {
            await chat.sendMessage(message)
            console.log(`✅ Resumen (${type}) enviado vía chat.sendMessage a ${chatId}`)
        } else {
            await client.sendMessage(chatId, message)
            console.log(`✅ Resumen (${type}) enviado vía client.sendMessage a ${chatId}`)
        }
    } catch (error) {
        console.error(`❌ Falló envío de resumen (${type}) a ${chatId}:`, error)
    }
}

function isAllDay(event) {
    return !event.start.dateTime && event.start.date
}

module.exports = {
    init
}
