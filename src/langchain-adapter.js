const { BaseListChatMessageHistory } = require('@langchain/core/chat_history')
const { HumanMessage, AIMessage, SystemMessage } = require('@langchain/core/messages')
const database = require('./database')

/**
 * Adaptador de historial de chat para SQLite usando la estructura de base de datos existente.
 */
class SQLiteHistory extends BaseListChatMessageHistory {
    constructor(chatId) {
        super()
        this.chatId = chatId
    }

    /**
     * Obtiene los mensajes almacenados en la base de datos y los convierte al formato de LangChain.
     */
    async getMessages() {
        const messages = database.getRecentMessages(this.chatId, 20) // Obtener historial reciente
        
        // Convertir formato simple {role, content} a clases de LangChain
        return messages.map(msg => {
            if (msg.role === 'user') {
                return new HumanMessage(msg.content)
            } else if (msg.role === 'assistant') {
                return new AIMessage(msg.content)
            } else if (msg.role === 'system') {
                return new SystemMessage(msg.content)
            }
            // Fallback para roles desconocidos
            return new HumanMessage(msg.content)
        })
    }

    /**
     * Agrega un mensaje al historial.
     * @param {BaseMessage} message - El mensaje a agregar.
     */
    async addMessage(message) {
        let role
        if (message instanceof HumanMessage) {
            role = 'user'
        } else if (message instanceof AIMessage) {
            role = 'assistant'
        } else if (message instanceof SystemMessage) {
            role = 'system'
        } else {
            // Manejar otros tipos como FunctionMessage si fuera necesario
            role = 'user'
        }

        database.saveMessage(this.chatId, role, message.content)
    }

    /**
     * Limpia el historial de chat para este usuario.
     */
    async clear() {
        database.clearConversationHistory(this.chatId)
    }
}

module.exports = { SQLiteHistory }
