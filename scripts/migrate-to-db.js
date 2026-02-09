const fs = require('fs')
const path = require('path')
const database = require('../src/database')

console.log('🔄 Iniciando migración de JSON a SQLite...\n')

// Rutas de archivos JSON
const CONFIG_FILE = path.join(__dirname, '..', 'config.json')
const WHITELIST_FILE = path.join(__dirname, '..', 'whitelist.json')
const MEMORIA_FILE = path.join(__dirname, '..', 'memoria.json')

// Inicializar base de datos
database.initDatabase()

let migratedItems = {
    config: 0,
    whitelist: 0,
    conversations: 0
}

// ========== MIGRAR CONFIG ==========
if (fs.existsSync(CONFIG_FILE)) {
    try {
        const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'))
        
        for (const [key, value] of Object.entries(config)) {
            if (value) { // Solo migrar valores no vacíos
                database.setConfig(key, value)
                migratedItems.config++
            }
        }
        
        // Crear backup
        const backupPath = `${CONFIG_FILE}.backup.${Date.now()}`
        fs.copyFileSync(CONFIG_FILE, backupPath)
        console.log(`✅ Config migrado (${migratedItems.config} items)`)
        console.log(`   Backup creado: ${path.basename(backupPath)}`)
    } catch (error) {
        console.error('❌ Error migrando config:', error.message)
    }
} else {
    console.log('⚠️  No se encontró config.json')
}

// ========== MIGRAR WHITELIST ==========
if (fs.existsSync(WHITELIST_FILE)) {
    try {
        const whitelist = JSON.parse(fs.readFileSync(WHITELIST_FILE, 'utf-8'))
        
        if (Array.isArray(whitelist)) {
            whitelist.forEach(phoneNumber => {
                if (database.addToWhitelist(phoneNumber)) {
                    migratedItems.whitelist++
                }
            })
        }
        
        // Crear backup
        const backupPath = `${WHITELIST_FILE}.backup.${Date.now()}`
        fs.copyFileSync(WHITELIST_FILE, backupPath)
        console.log(`✅ Whitelist migrada (${migratedItems.whitelist} usuarios)`)
        console.log(`   Backup creado: ${path.basename(backupPath)}`)
    } catch (error) {
        console.error('❌ Error migrando whitelist:', error.message)
    }
} else {
    console.log('⚠️  No se encontró whitelist.json')
}

// ========== MIGRAR MEMORIA ==========
if (fs.existsSync(MEMORIA_FILE)) {
    try {
        const memoria = JSON.parse(fs.readFileSync(MEMORIA_FILE, 'utf-8'))
        
        for (const [chatId, messages] of Object.entries(memoria)) {
            if (Array.isArray(messages)) {
                messages.forEach(msg => {
                    if (msg.role && msg.content) {
                        database.saveMessage(chatId, msg.role, msg.content)
                        migratedItems.conversations++
                    }
                })
            }
        }
        
        // Crear backup
        const backupPath = `${MEMORIA_FILE}.backup.${Date.now()}`
        fs.copyFileSync(MEMORIA_FILE, backupPath)
        console.log(`✅ Conversaciones migradas (${migratedItems.conversations} mensajes)`)
        console.log(`   Backup creado: ${path.basename(backupPath)}`)
    } catch (error) {
        console.error('❌ Error migrando memoria:', error.message)
    }
} else {
    console.log('⚠️  No se encontró memoria.json')
}

// ========== RESUMEN ==========
console.log('\n📊 Resumen de migración:')
console.log(`   - Configuración: ${migratedItems.config} items`)
console.log(`   - Whitelist: ${migratedItems.whitelist} usuarios`)
console.log(`   - Conversaciones: ${migratedItems.conversations} mensajes`)

const stats = database.getStats()
console.log('\n📈 Estado actual de la base de datos:')
console.log(`   - Total mensajes: ${stats.totalMessages}`)
console.log(`   - Recordatorios pendientes: ${stats.totalReminders}`)
console.log(`   - Usuarios autorizados: ${stats.whitelistCount}`)

console.log('\n✨ Migración completada exitosamente!')
console.log('💾 Los archivos originales se mantienen como respaldo')
