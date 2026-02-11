const reminders = require('./reminders')
const calendar = require('./calendar-service')

/**
 * Herramientas disponibles para el bot (enfoque simple sin LangChain Tools)
 */

async function createReminder(chatId, mensaje, tiempo) {
    try {
        const resultado = reminders.createReminder(chatId, mensaje, tiempo || null)
        
        if (resultado.type === 'scheduled') {
            return `✅ Recordatorio programado para ${resultado.triggerDate.toLocaleString('es-MX')}: "${mensaje}"`
        } else {
            return `✅ Tarea agregada a tu lista: "${mensaje}"`
        }
    } catch (error) {
        return `❌ Error: ${error.message}`
    }
}

async function listReminders(chatId) {
    try {
        const lista = reminders.listReminders(chatId, false)
        return lista || 'No tienes recordatorios pendientes.'
    } catch (error) {
        return `Error: ${error.message}`
    }
}

async function deleteReminder(id) {
    try {
        const resultado = reminders.cancelReminder(id)
        if (resultado) {
            return `✅ Recordatorio ${id} eliminado correctamente.`
        } else {
            return `❌ No se encontró el recordatorio ${id}.`
        }
    } catch (error) {
        return `Error: ${error.message}`
    }
}

async function listCalendarEvents(chatId, cantidad = 5) {
    try {
        const isAuthenticated = calendar.isUserAuthenticated(chatId)
        if (!isAuthenticated) {
            return '❌ No has conectado tu cuenta de Google Calendar. Usa el comando /calendario conectar para vincularla.'
        }
        
        const eventos = await calendar.listUpcomingEvents(chatId, cantidad)
        
        if (!eventos || eventos.length === 0) {
            return 'No tienes eventos próximos en tu calendario.'
        }
        
        let mensaje = `📅 Tus próximos ${eventos.length} eventos:\n\n`
        eventos.forEach((evento, idx) => {
            const inicio = evento.start?.dateTime || evento.start?.date
            mensaje += `${idx + 1}. ${evento.summary} - ${new Date(inicio).toLocaleString('es-MX')}\n`
        })
        
        return mensaje
    } catch (error) {
        return `Error: ${error.message}`
    }
}

async function createCalendarEvent(chatId, texto) {
    try {
        const isAuthenticated = calendar.isUserAuthenticated(chatId)
        if (!isAuthenticated) {
            return '❌ No has conectado tu cuenta de Google Calendar.'
        }
        
        const evento = await calendar.quickAddEvent(chatId, texto)
        return `✅ Evento creado: "${evento.summary}" el ${new Date(evento.start.dateTime || evento.start.date).toLocaleString('es-MX')}`
    } catch (error) {
        return `Error: ${error.message}`
    }
}

// Descripción de herramientas para el prompt del LLM
const TOOLS_DESCRIPTION = `
HERRAMIENTAS DISPONIBLES:

Tienes acceso a las siguientes funciones. Para usarlas, responde EXACTAMENTE en este formato JSON:

{{"function": "nombre_funcion", "params": {{"param1": "valor1", "param2": "valor2"}}}}

**crear_recordatorio**
- Descripción: Crea un recordatorio o tarea
- Parámetros:
  * mensaje (string, requerido): El mensaje del recordatorio
  * tiempo (string, opcional): Expresión temporal como "mañana a las 15:00", "en 2 horas", "el viernes"
- Ejemplo: {{"function": "crear_recordatorio", "params": {{"mensaje": "Hacer ejercicio", "tiempo": "mañana a las 7am"}}}}

**listar_recordatorios**
- Descripción: Lista los recordatorios pendientes
- Parámetros: ninguno
- Ejemplo: {{"function": "listar_recordatorios", "params": {{}}}}

**borrar_recordatorio**
- Descripción: Elimina un recordatorio por ID
- Parámetros:
  * id (number, requerido): ID del recordatorio
- Ejemplo: {{"function": "borrar_recordatorio", "params": {{"id": 5}}}}

**listar_eventos_calendario**
- Descripción: Muestra los próximos eventos del calendario
- Parámetros:
  * cantidad (number, opcional, default 5): Número de eventos
- Ejemplo: {{"function": "listar_eventos_calendario", "params": {{"cantidad": 10}}}}

**crear_evento_calendario**
- Descripción: Crea un evento en Google Calendar
- Parámetros:
  * texto (string, requerido): Descripción natural del evento
- Ejemplo: {{"function": "crear_evento_calendario", "params": {{"texto": "Reunión con Juan mañana a las 3pm"}}}}

SI el usuario pide algo que requiere una de estas funciones, responde SOLO con el JSON. En caso contrario, responde normalmente.
`

async function executeToolCall(toolCall, chatId) {
    const { function: funcName, params } = toolCall
    
    switch (funcName) {
        case 'crear_recordatorio':
            return await createReminder(chatId, params.mensaje, params.tiempo)
        case 'listar_recordatorios':
            return await listReminders(chatId)
        case 'borrar_recordatorio':
            return await deleteReminder(params.id)
        case 'listar_eventos_calendario':
            return await listCalendarEvents(chatId, params.cantidad)
        case 'crear_evento_calendario':
            return await createCalendarEvent(chatId, params.texto)
        default:
            return `Error: Función ${funcName} no reconocida`
    }
}

module.exports = {
    TOOLS_DESCRIPTION,
    executeToolCall
}
