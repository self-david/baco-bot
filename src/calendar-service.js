const { google } = require('googleapis')
const database = require('./database')

// Nota: Estos deben estar en proceso.env
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob' // Para flujo manual (copy-paste code)

function createOAuth2Client() {
    if (!CLIENT_ID || !CLIENT_SECRET) {
        throw new Error('Faltan credenciales de Google (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)')
    }
    return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)
}

function getAuthUrl() {
    const oauth2Client = createOAuth2Client()
    
    // Generar URL de autorización
    const scopes = [
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/calendar.readonly'
    ]
    
    return oauth2Client.generateAuthUrl({
        access_type: 'offline', // Importante para obtener refresh_token
        scope: scopes,
        prompt: 'consent' // Forzar refresh_token
    })
}

async function redeemCode(chatId, code) {
    const oauth2Client = createOAuth2Client()
    
    try {
        // Canjear código por tokens
        const { tokens } = await oauth2Client.getToken(code)
        
        // Guardar tokens en BD
        database.saveGoogleCredentials(chatId, tokens)
        
        return true
    } catch (error) {
        console.error('Error canjeando código Google:', error)
        throw new Error('Código inválido o expirado.')
    }
}

async function getAuthenticatedClient(chatId) {
    const tokens = database.getGoogleCredentials(chatId)
    
    if (!tokens) {
        return null
    }
    
    const oauth2Client = createOAuth2Client()
    oauth2Client.setCredentials(tokens)
    
    // Manejo automático de refresh token
    oauth2Client.on('tokens', (newTokens) => {
        console.log('🔄 Actualizando tokens de Google para', chatId)
        // Fusionar con los viejos por si solo vino access_token
        const updatedTokens = { ...tokens, ...newTokens }
        database.saveGoogleCredentials(chatId, updatedTokens)
    })
    
    return oauth2Client
}

async function listUpcomingEvents(chatId, maxResults = 5) {
    const auth = await getAuthenticatedClient(chatId)
    if (!auth) return null // No autenticado
    
    const calendar = google.calendar({ version: 'v3', auth })
    
    try {
        const res = await calendar.events.list({
            calendarId: 'primary',
            timeMin: (new Date()).toISOString(),
            maxResults: maxResults,
            singleEvents: true,
            orderBy: 'startTime',
        })
        
        return res.data.items
    } catch (error) {
        console.error('Error listando eventos:', error)
        throw new Error('No pude conectar con tu calendario.')
    }
}

async function quickAddEvent(chatId, text) {
    const auth = await getAuthenticatedClient(chatId)
    if (!auth) return null
    
    const calendar = google.calendar({ version: 'v3', auth })
    
    try {
        const res = await calendar.events.quickAdd({
            calendarId: 'primary',
            text: text
        })
        return res.data
    } catch (error) {
        console.error('Error creando evento rápido:', error)
        throw new Error('Falló la creación del evento.')
    }
}

// Función avanzada para crear evento estructurado (pendiente de uso si la IA devuelve JSON completo)
async function createEvent(chatId, eventData) {
    const auth = await getAuthenticatedClient(chatId)
    if (!auth) return null
    
    const calendar = google.calendar({ version: 'v3', auth })
    
    try {
        const res = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: eventData
        })
        return res.data
    } catch (error) {
        console.error('Error creando evento:', error)
        throw new Error('Falló la creación del evento estructurado.')
    }
}

module.exports = {
    getAuthUrl,
    redeemCode,
    listUpcomingEvents,
    quickAddEvent,
    createEvent,
    isUserAuthenticated: (chatId) => !!database.getGoogleCredentials(chatId)
}
