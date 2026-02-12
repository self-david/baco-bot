const express = require('express')
const bodyParser = require('body-parser')
const morgan = require('morgan')
const cors = require('cors')
const { processCommand } = require('./commands')
const aiProcessor = require('./ai-processor')
const database = require('./database')

const app = express()
const port = process.env.PORT || 3000

// Middleware
app.use(cors()) // Permitir peticiones desde el frontend
app.use(bodyParser.json())
app.use(morgan('dev'))

// Mock client for commands needing it (like sendMessage)
const mockClient = {
    sendMessage: async (to, body) => {
        console.log(`[MOCK SEND] To: ${to}, Body: ${body}`)
        return { fromMe: true, to, body }
    }
}

// Helper to mock a WhatsApp Message object
const createMockMessage = (chatId, body) => ({
    from: chatId,
    body: body,
    fromMe: false,
    reply: async (text) => {
        console.log(`[MOCK REPLY] To: ${chatId}, Text: ${text}`)
        return text // Return text for API response
    }
})

// --- Endpoints ---

// 1. Get Configuration
app.get('/config', (req, res) => {
    try {
        const config = {
            modelo: database.getConfig('modelo') || 'No configurado',
            personalidad: database.getConfig('personalidad') || 'Eres un asistente útil.',
            whitelist: database.getAllWhitelist() || []
        }
        res.json(config)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// 2. Update Configuration
app.post('/config', (req, res) => {
    const { modelo, personalidad } = req.body
    try {
        if (modelo) database.setConfig('modelo', modelo)
        if (personalidad) database.setConfig('personalidad', personalidad)
        res.json({ success: true, message: 'Configuración actualizada' })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// 3. Get Models (Mock wrapper for Ollama)
// En el futuro esto podría llamar a 'ollama list' real
app.get('/models', async (req, res) => {
    res.json({ models: ['gemma3:1b', 'llama3', 'mistral', 'qwen2:0.5b'] })
})

// 4. Get Memory/History
app.get('/memory/:chatId', (req, res) => {
    const { chatId } = req.params
    try {
        // Limit to last 50 messages for UI
        const history = database.getConversationHistory(chatId, 50)
        res.json({ history })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// 5. Clear Memory
app.delete('/memory/:chatId', (req, res) => {
    const { chatId } = req.params
    try {
        database.clearConversationHistory(chatId)
        res.json({ success: true, message: 'Historial borrado' })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// 6. Chat with Agent (AI)
app.post('/chat', async (req, res) => {
    const { chatId, message } = req.body
    
    if (!chatId || !message) {
        return res.status(400).json({ error: 'Missing chatId or message' })
    }

    try {
        // Init DB/User if needed (naive check)
        if (!database.getConfig('modelo')) {
             return res.status(503).json({ error: 'Bot not configured. Run init or basic setup first.' })
        }

        const personality = database.getConfig('personalidad') || 'Eres un asistente útil.'
        const model = database.getConfig('modelo')

        // 1. Guardar mensaje del usuario en DB
        database.saveMessage(chatId, 'user', message)

        // Generate response
        let response
        try {
            response = await aiProcessor.generateResponse(chatId, message, personality, model)
        } catch (aiError) {
            console.error('Error generando respuesta IA:', aiError)
            // Si falla la IA, guardar un mensaje de error del sistema o devolverlo
            // Pero no guardamos la respuesta fallida como 'assistant' si es un error técnico
            throw aiError
        }
        
        // 2. Guardar respuesta del bot en DB
        // Nota: LangChain también podría estar guardando, lo cual duplicaría. 
        // Vamos a verificar si aiProcessor ya guarda.
        // Si aiProcessor usa SQLiteHistory, ya guarda. 
        // Pero para asegurar consistencia en la UI, mejor controlamos el guardado aqui
        // o confiamos en SQLiteHistory.
        
        // Asumiremos que aiProcessor YA guarda en el historial de LangChain (que va a la misma DB)
        // pero por si acaso, verificaremos si es necesario.
        // Dado que el usuario reportó que no se guarda, vamos a forzarlo.
        
        // Guardar explícitamente la respuesta
        database.saveMessage(chatId, 'assistant', response)
        
        res.json({ 
            chatId,
            userMessage: message,
            botResponse: response 
        })

    } catch (error) {
        console.error('API Chat Error:', error)
        res.status(500).json({ error: error.message })
    }
})

// 7. Execute Command
app.post('/command', async (req, res) => {
    const { chatId, command } = req.body

    if (!chatId || !command) {
        return res.status(400).json({ error: 'Missing chatId or command' })
    }

    if (!command.startsWith('/')) {
         return res.status(400).json({ error: 'Command must start with /' })
    }

    try {
        const mockMsg = createMockMessage(chatId, command)
        
        // Process command
        const result = await processCommand(mockMsg, chatId, mockClient)
        
        res.json({
            chatId,
            command,
            result: result || 'No output (command might have executed silently or failed match)'
        })

    } catch (error) {
        console.error('API Command Error:', error)
        res.status(500).json({ error: error.message })
    }
})

// Start server
app.listen(port, () => {
    console.log(`🚀 Test API running on http://localhost:${port}`)
    console.log(`Endpoints available for UI`)
})
