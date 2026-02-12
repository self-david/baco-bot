const { ChatOllama } = require('@langchain/ollama')
const { ChatPromptTemplate, MessagesPlaceholder } = require('@langchain/core/prompts')
const { RunnableWithMessageHistory } = require('@langchain/core/runnables')
const { StringOutputParser } = require('@langchain/core/output_parsers')
const { SQLiteHistory } = require('./langchain-adapter')
const vectorMemory = require('./vector-store')
const { TOOLS_DESCRIPTION, executeToolCall } = require('./tools')

const { Ollama } = require('ollama') //  Mantener para funciones legacy
const database = require('./database')
const utils = require('./utils')

// Cliente legacy para funciones auxiliares
const ollamaLegacy = new Ollama({ host: 'http://127.0.0.1:11434' })

const OLLAMA_OPTIONS = {
    num_ctx: 4096,
    temperature: 0.7
}

/**
 * Genera una respuesta usando un AGENTE con herramientas (prompt-based).
 */
async function generateResponse(chatId, userMessage, personality, modelName) {
    try {
        // 1. Configurar el modelo
        const chatModel = new ChatOllama({
            baseUrl: 'http://127.0.0.1:11434',
            model: modelName,
            temperature: 0.7,
            numCtx: 4096,
            repeatPenalty: 1.1, // Evitar bucles
            stop: ["<|start_header_id|>", "<|end_header_id|>", "<|eot_id|>", "Human:", "User:"] // Stop tokens comunes
        })

        // 2. Preparar contexto dinámico
        const botName = database.getConfig('nombre') || 'Leslye'
        const now = new Date()
        const timeContext = `Fecha y hora actual: ${now.toLocaleString('es-MX', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
        })}`
        
        // RECUPERACIÓN (RAG): Buscar memorias relevantes
        const memoryContext = await getVectorMemoryContext(userMessage)
        
        // 3. Definir el Prompt con descripción de herramientas
        const prompt = ChatPromptTemplate.fromMessages([
            ["system", `${personality}

Tu nombre es ${botName}.
${timeContext}

INSTRUCCIONES CLAVE:
1. Responde de forma CONCISA y DIRECTA. Evita parrafadas innecesarias.
2. NO repitas tu respuesta.
3. Si ya respondiste, detente.

${memoryContext}

${TOOLS_DESCRIPTION}`],
            new MessagesPlaceholder("history"),
            ["human", "{input}"]
        ])

        // 4. Crear la cadena con historial
        const chain = new RunnableWithMessageHistory({
            runnable: prompt.pipe(chatModel).pipe(new StringOutputParser()),
            getMessageHistory: (sessionId) => new SQLiteHistory(sessionId),
            inputMessagesKey: "input",
            historyMessagesKey: "history",
        })

        console.log(`🤖 Generando respuesta con agente (prompt-based) para ${chatId}...`)

        // 5. Invocar la cadena
        const response = await chain.invoke(
            { input: userMessage },
            { configurable: { sessionId: chatId } }
        )

        // 6. Detectar si la respuesta es una llamada a herramienta
        // Regex ajustada para permitir params vacíos: params": {}
        const toolCallMatch = response.match(/\{["']function["']:\s*["'](\w+)["'],\s*["']params["']:\s*\{[^}]*\}\}/)
        
        if (toolCallMatch) {
            try {
                // Extraer el JSON limpio
                const jsonStart = response.indexOf('{')
                const jsonEnd = response.lastIndexOf('}') + 1
                const toolCallJson = response.substring(jsonStart, jsonEnd)
                
                const toolCall = JSON.parse(toolCallJson)
                console.log('🔧 Ejecutando herramienta:', toolCall.function)
                
                // Ejecutar la herramienta
                const toolResult = await executeToolCall(toolCall, chatId)
                
                // Opcionalmente, podemos darle el resultado al LLM para que lo formatee mejor
                // Por ahora, devolvemos el resultado directamente
                return toolResult
                
            } catch (error) {
                console.error('Error ejecutando herramienta:', error)
                return response // Si falla el parsing, devolver respuesta original
            }
        }

        return response
        
    } catch (error) {
        console.error('❌ Error en LangChain:', error)
        throw new Error('No pude generar una respuesta. Verifica que Ollama esté corriendo.')
    }
}

function detectImportantContext(userMessage, aiResponse) {
    if (userMessage.startsWith('/')) return false
    const hasImportantKeywords = utils.containsImportantKeywords(userMessage) || utils.containsImportantKeywords(aiResponse)
    const datePatterns = [/\d{1,2}[\/\-]\d{1,2}/, /\d{1,2}\s+de\s+\w+/, /mañana/i, /próxim[oa]/i, /siguiente/i, /\d{1,2}:\d{2}/]
    const hasDates = datePatterns.some(pattern => pattern.test(userMessage) || pattern.test(aiResponse))
    return hasImportantKeywords && hasDates
}

async function humanizeReminder(text, personality, model) {
    try {
        const prompt = [
            { role: 'system', content: `${personality}\n\nTU OBJETIVO: Tienes un recordatorio: "${text}".\n\nTU TAREA: Reescríbe lo como un ÚNICO mensaje de notificación que TÚ (el asistente) le envías al usuario.\n\nREGLAS:\n1. NO des opciones.\n2. NO uses listas.\n3. NO hables en primera persona como le usuario.\n4. Sé breve, directo y usa tu personalidad.\n5. El mensaje debe ser la notificación final.` },
            { role: 'user', content: 'Genera el mensaje.' }
        ]
        const response = await ollamaLegacy.chat({ model: model, messages: prompt, keep_alive: '10m', options: OLLAMA_OPTIONS })
        return response.message.content.trim().replace(/^["']|["']$/g, '').replace(/^(Opción \d:|Aquí tienes|Claro,|El mensaje es:)\s*/i, '')
    } catch (error) {
        console.error('❌ Error humanizando:', error)
        return `🔔 *RECORDATORIO*\n\n${text}`
    }
}

async function analyzePostponeIntent(text, lastReminder, model) {
    if (!lastReminder) return { isPostpone: false }
    const postponeKeywords = ['posponer', 'luego', 'después', 'mañana', 'minutos', 'horas', 'días', 'semana', 'tarde', 'noche', 'recuérdame', 'otra vez', 'más tarde', 'mueve', 'cambia', 'a las', 'para las', 'en', 'el']
    if (!postponeKeywords.some(kw => text.toLowerCase().includes(kw)) && text.length < 3) return { isPostpone: false }

    const context = `Fecha: ${new Date().toLocaleDateString('es-MX')} ${new Date().toLocaleTimeString('es-MX')}\nRecordatorio: "${lastReminder.message}"\nMensaje: "${text}"`
    try {
        const response = await ollamaLegacy.chat({
            model: model,
            messages: [{ role: 'system', content: 'Eres un motor de inferencia temporal. Retorna SOLO JSON: {"isPostpone": true/false, "newDate": "YYYY-MM-DD HH:mm:ss"}.' }, { role: 'user', content: context }],
            format: 'json', keep_alive: '10m', options: OLLAMA_OPTIONS
        })
        const result = JSON.parse(response.message.content)
        if (result.isPostpone && result.newDate) return { isPostpone: true, newDate: new Date(result.newDate) }
    } catch (error) { console.error('Error analizando posposición:', error) }
    return { isPostpone: false }
}

// ========== MEMORIA VECTORIAL ==========

async function getVectorMemoryContext(query) {
    try {
        await vectorMemory.init()
        const results = await vectorMemory.searchMemories(query, 3)
        if (results.length === 0) return ''
        
        return `[MEMORIA KNOWLEDGE BASE]
Información relevante recuperada de conversaciones pasadas:
${results.map(r => `- ${r.content}`).join('\n')}
[FIN MEMORIA]`
    } catch (error) {
        console.error('⚠️ Error recuperando memoria vectorial:', error)
        return ''
    }
}

async function processMemory(chatId, userMessage, assistantResponse, model) {
    if (userMessage.length < 5 || userMessage.startsWith('/')) return
    
    const prompt = [
        { role: 'system', content: 'Analiza la conversación y extrae cualquier HECHO IMPORTANTE sobre el usuario (preferencias, datos personales, planes). Si no hay nada relevante que valga la pena recordar a largo plazo, responde "NULL". Si hay algo, responde SOLO con el hecho extraído en una frase concisa.' },
        { role: 'user', content: `Usuario: "${userMessage}"\nIA: "${assistantResponse}"` }
    ]

    try {
        const response = await ollamaLegacy.chat({
            model: model,
            messages: prompt,
            keep_alive: '10m',
            options: OLLAMA_OPTIONS
        })
        
        const content = response.message.content.trim()
        
        if (content !== 'NULL' && content.length > 5 && !content.includes('NULL')) {
            console.log('🧠 Memoria detectada:', content)
            await vectorMemory.init()
            await vectorMemory.addMemory(content, { chatId, type: 'extracted_fact' })
            database.saveMemory(chatId, content, 'general', 100, userMessage)
            console.log('💾 Memoria guardada en Vector Store y DB')
        }
        
    } catch (error) {
        console.error('❌ Error procesando memoria:', error)
    }
}

async function unloadModel(modelName) {
    if (!modelName) return
    try {
        await ollamaLegacy.chat({ model: modelName, messages: [], keep_alive: 0 })
        return true
    } catch (error) { return false }
}

async function listOllamaModels() {
    try {
        const response = await ollamaLegacy.list()
        return response.models.map(m => m.name)
    } catch (error) { return [] }
}

module.exports = {
    generateResponse,
    detectImportantContext,
    humanizeReminder,
    analyzePostponeIntent,
    processMemory,
    listOllamaModels,
    unloadModel
}
