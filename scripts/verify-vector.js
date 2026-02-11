const aiProcessor = require('../src/ai-processor')
const database = require('../src/database')
const vectorMemory = require('../src/vector-store')

async function verify() {
    console.log('🧪 Iniciando verificación de Memoria Vectorial (RAG)...')
    
    // Inicializar DB
    database.initDatabase()
    
    const chatId = 'test-vector-user'
    const model = database.getConfig('modelo') || 'llama3'
    
    try {
        // 1. Inyectar una memoria manualmente
        console.log('\n📥 Inyectando memoria de prueba...')
        await vectorMemory.init()
        await vectorMemory.addMemory('El usuario test-vector-user es alérgico a los camarones y le encanta la pizza de piña.', { chatId })
        console.log('✅ Memoria inyectada.')

        // 2. Preguntar algo que requiera esa memoria
        const question = '¿Qué debería pedir de comer si no quiero enfermarme?'
        console.log(`\n❓ Pregunta: "${question}"`)
        
        const response = await aiProcessor.generateResponse(chatId, question, 'Eres un asistente nutricional sarcástico.', model)
        console.log('\n🤖 Respuesta IA:')
        console.log(response)
        
        // 3. Verificar si menciona la alergia
        if (response.toLowerCase().includes('camarones') || response.toLowerCase().includes('alérgic')) {
            console.log('\n✅ ÉXITO: La IA recordó la alergia usando RAG.')
        } else {
            console.log('\n⚠️ ADVERTENCIA: La IA podría no haber usado el contexto recuperado (o decidió ignorarlo).')
        }

    } catch (error) {
        console.error('❌ Error durante la verificación:', error)
    }
}

verify()
