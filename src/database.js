const Database = require('better-sqlite3')
const path = require('path')

const DB_PATH = path.join(__dirname, '..', 'bot.db')
const db = new Database(DB_PATH)

// Habilitar foreign keys y WAL mode para mejor rendimiento
db.pragma('foreign_keys = ON')
db.pragma('journal_mode = WAL')

function initDatabase() {
    console.log('📦 Inicializando base de datos...')

    // Tabla de configuración
    db.exec(`
        CREATE TABLE IF NOT EXISTS config (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )
    `)

    // Tabla de whitelist
    db.exec(`
        CREATE TABLE IF NOT EXISTS whitelist (
            phone_number TEXT PRIMARY KEY,
            added_at INTEGER DEFAULT (strftime('%s', 'now'))
        )
    `)

    // Tabla de conversaciones
    db.exec(`
        CREATE TABLE IF NOT EXISTS conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chat_id TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
            content TEXT NOT NULL,
            timestamp INTEGER DEFAULT (strftime('%s', 'now'))
        )
    `)

    // Índice para búsquedas rápidas por chat
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_conversations_chat 
        ON conversations(chat_id, timestamp DESC)
    `)

    // Tabla de recordatorios
    db.exec(`
        CREATE TABLE IF NOT EXISTS reminders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chat_id TEXT NOT NULL,
            message TEXT NOT NULL,
            trigger_date INTEGER,
            type TEXT NOT NULL CHECK(type IN ('scheduled', 'task')),
            status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'cancelled')),
            created_at INTEGER DEFAULT (strftime('%s', 'now'))
        )
    `)

    // Índice para recordatorios pendientes
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_reminders_pending 
        ON reminders(status, trigger_date)
    `)

    // Tabla de memorias (Smart Memory)
    db.exec(`
        CREATE TABLE IF NOT EXISTS memories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chat_id TEXT NOT NULL,
            content TEXT NOT NULL,
            category TEXT DEFAULT 'general',
            confidence INTEGER DEFAULT 100,
            conversation_context TEXT,
            created_at INTEGER DEFAULT (strftime('%s', 'now')),
            updated_at INTEGER DEFAULT (strftime('%s', 'now'))
        )
    `)

    // Índice para búsquedas rápidas de memoria
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_memories_chat 
        ON memories(chat_id, category)
    `)

    console.log('✅ Base de datos inicializada correctamente')
}

// ========== CONFIGURACIÓN ==========

function getConfig(key) {
    const stmt = db.prepare('SELECT value FROM config WHERE key = ?')
    const row = stmt.get(key)
    return row ? row.value : null
}

function setConfig(key, value) {
    const stmt = db.prepare(`
        INSERT INTO config (key, value) VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `)
    stmt.run(key, value)
}

function getAllConfig() {
    const stmt = db.prepare('SELECT key, value FROM config')
    const rows = stmt.all()
    const config = {}
    rows.forEach(row => {
        config[row.key] = row.value
    })
    return config
}

// ========== WHITELIST ==========

function isInWhitelist(phoneNumber) {
    const stmt = db.prepare('SELECT 1 FROM whitelist WHERE phone_number = ?')
    return stmt.get(phoneNumber) !== undefined
}

function addToWhitelist(phoneNumber) {
    try {
        const stmt = db.prepare('INSERT INTO whitelist (phone_number) VALUES (?)')
        stmt.run(phoneNumber)
        return true
    } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT' || error.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
            return false // Ya existe
        }
        throw error
    }
}

function removeFromWhitelist(phoneNumber) {
    const stmt = db.prepare('DELETE FROM whitelist WHERE phone_number = ?')
    const result = stmt.run(phoneNumber)
    return result.changes > 0
}

function getAllWhitelist() {
    const stmt = db.prepare('SELECT phone_number, added_at FROM whitelist ORDER BY added_at DESC')
    return stmt.all()
}

// ========== CONVERSACIONES ==========

function saveMessage(chatId, role, content) {
    const stmt = db.prepare(`
        INSERT INTO conversations (chat_id, role, content) 
        VALUES (?, ?, ?)
    `)
    stmt.run(chatId, role, content)
}

function getRecentMessages(chatId, limit = 8) {
    const stmt = db.prepare(`
        SELECT role, content, timestamp 
        FROM conversations 
        WHERE chat_id = ? 
        ORDER BY timestamp DESC 
        LIMIT ?
    `)
    const messages = stmt.all(chatId, limit)
    
    // Retornar en orden cronológico (más antiguo primero)
    return messages.reverse().map(msg => ({
        role: msg.role,
        content: msg.content
    }))
}

function clearConversationHistory(chatId) {
    const stmt = db.prepare('DELETE FROM conversations WHERE chat_id = ?')
    const result = stmt.run(chatId)
    return result.changes
}

// ========== RECORDATORIOS ==========

function createReminder(chatId, message, triggerDate = null, type = 'task') {
    const stmt = db.prepare(`
        INSERT INTO reminders (chat_id, message, trigger_date, type) 
        VALUES (?, ?, ?, ?)
    `)
    
    const timestamp = triggerDate ? Math.floor(triggerDate.getTime() / 1000) : null
    const actualType = triggerDate ? 'scheduled' : 'task'
    
    const result = stmt.run(chatId, message, timestamp, actualType)
    return result.lastInsertRowid
}

function getPendingReminders() {
    const now = Math.floor(Date.now() / 1000)
    const stmt = db.prepare(`
        SELECT id, chat_id, message, trigger_date, type, created_at 
        FROM reminders 
        WHERE status = 'pending' 
        AND type = 'scheduled'
        AND trigger_date <= ?
        ORDER BY trigger_date ASC
    `)
    return stmt.all(now)
}

function getAllReminders(chatId, includeCompleted = false) {
    let query = `
        SELECT id, message, trigger_date, type, status, created_at 
        FROM reminders 
        WHERE chat_id = ?
    `
    
    if (!includeCompleted) {
        query += ` AND status = 'pending'`
    }
    
    query += ` ORDER BY 
        CASE WHEN trigger_date IS NULL THEN 1 ELSE 0 END,
        trigger_date ASC,
        created_at DESC
    `
    
    const stmt = db.prepare(query)
    return stmt.all(chatId)
}

function getLastCompletedReminder(chatId) {
    // Obtener el último recordatorio completado en los últimos 30 minutos
    // (Para evitar posponer algo de hace días accidentalmente)
    const limitParams = Math.floor(Date.now() / 1000) - (30 * 60) // 30 mins atrás
    
    const stmt = db.prepare(`
        SELECT * FROM reminders 
        WHERE chat_id = ? AND status = 'completed' AND trigger_date > ? 
        ORDER BY trigger_date DESC 
        LIMIT 1
    `)
    return stmt.get(chatId, limitParams)
}

function updateReminderStatus(id, status) {
    const stmt = db.prepare('UPDATE reminders SET status = ? WHERE id = ?')
    const result = stmt.run(status, id)
    return result.changes > 0
}

function addDateToTask(id, triggerDate) {
    const timestamp = Math.floor(triggerDate.getTime() / 1000)
    const stmt = db.prepare(`
        UPDATE reminders 
        SET trigger_date = ?, type = 'scheduled' 
        WHERE id = ? AND type = 'task'
    `)
    const result = stmt.run(timestamp, id)
    return result.changes > 0
}

function deleteReminder(id) {
    const stmt = db.prepare('DELETE FROM reminders WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
}

// ========== MEMORIA INTELIGENTE ==========

function saveMemory(chatId, content, category = 'general', confidence = 100, context = null) {
    const stmt = db.prepare(`
        INSERT INTO memories (chat_id, content, category, confidence, conversation_context) 
        VALUES (?, ?, ?, ?, ?)
    `)
    const result = stmt.run(chatId, content, category, confidence, context)
    return result.lastInsertRowid
}

function getMemories(chatId, limit = 20) {
    const stmt = db.prepare(`
        SELECT id, content, category, created_at 
        FROM memories 
        WHERE chat_id = ?
        ORDER BY updated_at DESC
        LIMIT ?
    `)
    return stmt.all(chatId, limit)
}

function searchMemories(chatId, query) {
    // Búsqueda simple por texto (se podría mejorar con FTS5 si fuera necesario)
    const stmt = db.prepare(`
        SELECT id, content, category 
        FROM memories 
        WHERE chat_id = ? AND content LIKE ?
        ORDER BY updated_at DESC
    `)
    return stmt.all(chatId, `%${query}%`)
}

function updateMemory(id, newContent, newConfidence) {
    const stmt = db.prepare(`
        UPDATE memories 
        SET content = ?, confidence = ?, updated_at = (strftime('%s', 'now')) 
        WHERE id = ?
    `)
    const result = stmt.run(newContent, newConfidence, id)
    return result.changes > 0
}

function deleteMemory(id) {
    const stmt = db.prepare('DELETE FROM memories WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
}

function countMemories(chatId) {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM memories WHERE chat_id = ?')
    const row = stmt.get(chatId)
    return row ? row.count : 0
}

// ========== ESTADÍSTICAS ==========

function getStats() {
    const totalMessages = db.prepare('SELECT COUNT(*) as count FROM conversations').get().count
    const totalReminders = db.prepare("SELECT COUNT(*) as count FROM reminders WHERE status = 'pending'").get().count
    const whitelistCount = db.prepare('SELECT COUNT(*) as count FROM whitelist').get().count
    const totalMemories = db.prepare('SELECT COUNT(*) as count FROM memories').get().count
    
    return {
        totalMessages,
        totalReminders,
        whitelistCount,
        totalMemories
    }
}

// Cerrar conexión al salir
process.on('exit', () => {
    db.close()
})

module.exports = {
    initDatabase,
    getConfig,
    setConfig,
    getAllConfig,
    isInWhitelist,
    addToWhitelist,
    removeFromWhitelist,
    getAllWhitelist,
    saveMessage,
    getRecentMessages,
    getConversationHistory: getRecentMessages, // Alias para compatibilidad
    clearConversationHistory,
    createReminder,
    getPendingReminders,
    getAllReminders,
    updateReminderStatus,
    addDateToTask,
    deleteReminder,
    getLastCompletedReminder,
    deleteReminder,
    getLastCompletedReminder,
    saveMemory,
    getMemories,
    searchMemories,
    updateMemory,
    deleteMemory,
    countMemories,
    getStats
}
