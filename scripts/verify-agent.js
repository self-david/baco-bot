const aiProcessor = require('../src/ai-processor')
const database = require('../src/database')

async function verify() {
    console.log('🧪 Verificando Agente con Herramientas...\n')
    
    database.initDatabase()
    
    const chatId = 'test-agent-user'
    const model = database.getConfig('modelo') || 'llama3'
    const personality = 'Eres un asistente útil que ayuda con recordatorios y calendarios.'
    
    // Test 1: Crear recordatorio con tiempo relativo
    console.log('Test 1: Crear recordatorio')
    console.log('----------------------------')
    try {
        const response1 = await aiProcessor.generateResponse(
            chatId,
            'Recuérdame hacer ejercicio mañana a las 7am',
            personality,
            model
        )
        console.log('Respuesta:', response1)
        console.log('')
    } catch (error) {
        console.error('Error:', error.message)
    }
    
    // Test 2: Listar recordatorios
    console.log('Test 2: Listar recordatorios')
    console.log('----------------------------')
    try {
        const response2 = await aiProcessor.generateResponse(
            chatId,
            '¿Qué recordatorios tengo?',
            personality,
            model
        )
        console.log('Respuesta:', response2)
        console.log('')
    } catch (error) {
        console.error('Error:', error.message)
    }
    
    // Test 3: Conversación normal (sin herramientas)
    console.log('Test 3: Conversación normal')
    console.log('----------------------------')
    try {
        const response3 = await aiProcessor.generateResponse(
            chatId,
            '¿Cómo estás?',
            personality,
            model
        )
        console.log('Respuesta:', response3)
    } catch (error) {
        console.error('Error:', error.message)
    }
}

verify()
