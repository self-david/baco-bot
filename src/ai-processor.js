const { ChatOllama } = require('@langchain/ollama')
const { ChatPromptTemplate, MessagesPlaceholder } = require('@langchain/core/prompts')
const { RunnableWithMessageHistory } = require('@langchain/core/runnables')
const { StringOutputParser } = require('@langchain/core/output_parsers')
const { HumanMessage, SystemMessage } = require('@langchain/core/messages')
const { SQLiteHistory } = require('./langchain-adapter')
const vectorMemory = require('./vector-store') // Nueva memoria vectorial

const { Ollama } = require('ollama') // Mantener para funciones legacy por ahora
const database = require('./database')
const utils = require('./utils')

// Cliente legacy para funciones auxiliares (se puede migrar después)
const ollamaLegacy = new Ollama({ host: 'http://127.0.0.1:11434' })

const OLLAMA_OPTIONS = {
    num_ctx: 4096,
    temperature: 0.7
}

/**
 * Genera una respuesta usando LangChain con manejo de historial y RAG.
 */
async function generateResponse(chatId, userMessage, personality, modelName) {
    try {
        // 1. Configurar el modelo
        const chatModel = new ChatOllama({
            baseUrl: 'http://127.0.0.1:11434',
            model: modelName,
            temperature: 0.7,
            numCtx: 4096
        })

        // 2. Preparar contexto dinámico
        const botName = database.getConfig('nombre') || 'Leslye'
        const now = new Date()
        const timeContext = `Fecha: ${now.toLocaleDateString('es-MX')} Hora: ${now.toLocaleTimeString('es-MX')}`
        
        // RECUPERACIÓN (RAG): Buscar memorias relevantes
        const memoryContext = await getVectorMemoryContext(userMessage)
        
        // 3. Definir el Prompt
        const prompt = ChatPromptTemplate.fromMessages([
            ["system", personality],
            new MessagesPlaceholder("history"),
            ["system", "{memory_context}"], 
            ["system", "[SYSTEM CONTEXT: {time_context}]\n[INSTRUCCIÓN SUPREMA: Tu nombre es {bot_name}. Usa la información de 'MEMORIA KNOWLEDGE BASE' si es relevante para responder. Si no, ignórala.]"],
            ["human", "{input}"]
        ])

        // 4. Crear la cadena
        // Usamos RunnableWithMessageHistory para manejar la memoria automáticamente
        const chain = new RunnableWithMessageHistory({
            runnable: prompt.pipe(chatModel).pipe(new StringOutputParser()),
            getMessageHistory: (sessionId) => new SQLiteHistory(sessionId),
            inputMessagesKey: "input",
            historyMessagesKey: "history",
        })

        console.log(`🤖 Generando respuesta con LangChain + RAG para ${chatId}...`)

        // 5. Invocar la cadena
        const response = await chain.invoke(
            {
                input: userMessage,
                memory_context: memoryContext,
                time_context: timeContext,
                bot_name: botName
            },
            { configurable: { sessionId: chatId } }
        )

        return response
        
    } catch (error) {
        console.error('❌ Error en LangChain:', error)
        throw new Error('No pude generar una respuesta. Verifica que Ollama esté corriendo.')
    }
}

function analyzeReminderIntent(text) {
    const lowerText = text.toLowerCase()
    const explicitPatterns = [
        /recu[ée]rdame/i, /no olvides/i, /avísame/i, /notif[íi]came/i,
        /acu[ée]rdate/i, /tengo que/i, /hay que/i, /debemos/i, /hazme acordar/i
    ]
    
    if (explicitPatterns.some(pattern => pattern.test(text))) {
        const extracted = utils.extractReminderFromText(text)
        return { isReminder: true, message: extracted.message || text, timeExpression: extracted.timeExpression }
    }
    return { isReminder: false, message: null, timeExpression: null }
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
            { role: 'system', content: `${personality}\n\nTU OBJETIVO: Tienes un recordatorio: "${text}".\n\nTU TAREA: Reescríbelo como un ÚNICO mensaje de notificación que TÚ (el asistente) le envías al usuario.\n\nREGLAS:\n1. NO des opciones.\n2. NO uses listas.\n3. NO hables en primera persona como le usuario.\n4. Sé breve, directo y usa tu personalidad.\n5. El mensaje debe ser la notificación final.` },
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
    const postponeKeywords = ['posponer', 'luego', 'después', 'mañana', 'minutos', 'horas', 'días', 'semana', 'tarde', 'noche', 'recuérdame', 'otra vez', 'más tarde', 'mueve', 'cambia']
    if (!postponeKeywords.some(kw => text.toLowerCase().includes(kw)) && text.length < 10) return { isPostpone: false }

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

// ========== MEMORIA VECTORIAL (NUEVO) ==========

async function getVectorMemoryContext(query) {
    try {
        await vectorMemory.init()
        const results = await vectorMemory.searchMemories(query, 3) // Top 3 relevantes
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
    
    // Extracción simplificada para guardar en vector store
    const prompt = [
        { role: 'system', content: 'Analiza la conversación y extrae cualquier HECHO IMPORTANTE sobre el usuario (preferencias, datos personales, planes). Si no hay nada relevante que valga la pena recordar a largo plazo, responde "NULL". Si hay algo, responde SOLO con el hecho extraído en una frase concisa.' },
        { role: 'user', content: `Usuario: "${userMessage}"\nIA: "${assistantResponse}"` }
    ]

    try {
        // Usamos una llamada rápida sin JSON mode para mayor flexibilidad en modelos pequeños
        const response = await ollamaLegacy.chat({
            model: model,
            messages: prompt,
            keep_alive: '10m',
            options: OLLAMA_OPTIONS
        })
        
        const content = response.message.content.trim()
        
        if (content !== 'NULL' && content.length > 5 && !content.includes('NULL')) {
            console.log('🧠 Memoria detectada:', content)
            // Guardar en Vector Store (Nuevo)
            await vectorMemory.init()
            await vectorMemory.addMemory(content, { chatId, type: 'extracted_fact' })
            
            // Guardar también en SQLite (Legacy/Backup)
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

async function parseReminderWithAI(text, model) {
    try {
        const response = await ollamaLegacy.chat({
            model: model,
            messages: [{ role: 'system', content: 'Extrae {"message": "...", "timeExpression": "..."} del texto.' }, { role: 'user', content: text }],
            format: 'json', keep_alive: '10m', options: { temperature: 0.1 }
        })
        let result = JSON.parse(response.message.content)
        if (!result.message) result.message = text
        return result
    } catch (error) { return { message: text, timeExpression: null, confidence: 0 } }
}

module.exports = {
    generateResponse,
    analyzeReminderIntent,
    detectImportantContext,
    humanizeReminder,
    analyzePostponeIntent,
    processMemory,
    listOllamaModels,
    unloadModel,
    parseReminderWithAI
}
