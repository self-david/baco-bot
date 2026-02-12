const express = require('express')
const bodyParser = require('body-parser')
const morgan = require('morgan')
const { processCommand } = require('./commands')
const aiProcessor = require('./ai-processor')
const database = require('./database')

const app = express()
const port = process.env.PORT || 3000

// Middleware
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

// 1. Chat with Agent (AI)
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

        // Generate response
        const response = await aiProcessor.generateResponse(chatId, message, personality, model)
        
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

// 2. Execute Command
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
    console.log(`Endpoints:`)
    console.log(`- POST /chat    { "chatId": "test-user", "message": "hello" }`)
    console.log(`- POST /command { "chatId": "test-user", "command": "/help" }`)
})
