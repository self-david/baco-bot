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

    // Tabla de whitelist (actualizada con roles)
    db.exec(`
        CREATE TABLE IF NOT EXISTS whitelist (
            phone_number TEXT PRIMARY KEY,
            role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin', 'user')),
            added_at INTEGER DEFAULT (strftime('%s', 'now'))
        )
    `)

    // Migración para bases de datos existentes: agregar columna role si no existe
    try {
        db.exec('ALTER TABLE whitelist ADD COLUMN role TEXT NOT NULL DEFAULT "user" CHECK(role IN ("admin", "user"))')
        console.log('   ℹ️  Columna "role" agregada a whitelist')
    } catch (e) {
        // Ignorar si la columna ya existe
    }

    // Tabla de códigos de activación
    db.exec(`
        CREATE TABLE IF NOT EXISTS activation_codes (
            code TEXT PRIMARY KEY,
            created_by TEXT,
            is_used INTEGER DEFAULT 0,
            used_by TEXT,
            created_at INTEGER DEFAULT (strftime('%s', 'now')),
            used_at INTEGER
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

    // Tabla para tokens de Google Calendar
    db.exec(`
        CREATE TABLE IF NOT EXISTS google_auth (
            chat_id TEXT PRIMARY KEY,
            tokens TEXT NOT NULL, -- JSON stringificado
            created_at INTEGER DEFAULT (strftime('%s', 'now')),
            updated_at INTEGER DEFAULT (strftime('%s', 'now'))
        )
    `)

    console.log('✅ Base de datos inicializada correctamente')
}

// ... (existing code)

// ========== GOOGLE CALENDAR ==========

function saveGoogleCredentials(chatId, tokens) {
    const tokensStr = JSON.stringify(tokens)
    const stmt = db.prepare(`
        INSERT INTO google_auth (chat_id, tokens, updated_at) 
        VALUES (?, ?, (strftime('%s', 'now')))
        ON CONFLICT(chat_id) DO UPDATE SET 
            tokens = excluded.tokens,
            updated_at = excluded.updated_at
    `)
    const result = stmt.run(chatId, tokensStr)
    return result.changes > 0
}

function getGoogleCredentials(chatId) {
    const stmt = db.prepare('SELECT tokens FROM google_auth WHERE chat_id = ?')
    const row = stmt.get(chatId)
    return row ? JSON.parse(row.tokens) : null
}

function deleteGoogleCredentials(chatId) {
    const stmt = db.prepare('DELETE FROM google_auth WHERE chat_id = ?')
    const result = stmt.run(chatId)
    return result.changes > 0
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
    getConversationHistory: getRecentMessages,
    clearConversationHistory,
    createReminder,
    getPendingReminders,
    getAllReminders,
    updateReminderStatus,
    addDateToTask,
    updateReminderDate,
    deleteReminder,
    getLastCompletedReminder,
    saveMemory,
    getMemories,
    searchMemories,
    updateMemory,
    deleteMemory,
    countMemories,
    getStats,
    isAdmin,
    promoteToAdmin,
    createActivationCode,
    validateActivationCode,
    useActivationCode,
    saveGoogleCredentials,
    getGoogleCredentials,
    deleteGoogleCredentials
}
