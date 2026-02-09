const database = require('../src/database')

// Inicializar base de datos
database.initDatabase()

const args = process.argv.slice(2)
const command = args[0]
const phoneNumber = args[1]

function showHelp() {
    console.log('\n📱 Gestión de Whitelist\n')
    console.log('Uso:')
    console.log(' baco-bot whitelist add <número>     - Agregar usuario')
    console.log(' baco-bot whitelist remove <número>  - Quitar usuario')
    console.log(' baco-bot whitelist list             - Listar todos\n')
    console.log('Ejemplo:')
    console.log(' baco-bot whitelist add 521XXXXXXXXXX@c.us')
}

function formatPhoneNumber(number) {
    // Si ya tiene @c.us, retornarlo
    if (number.includes('@c.us')) return number
    
    // Si no, agregarlo
    return `${number}@c.us`
}

function validatePhoneNumber(number) {
    // Debe tener al menos 10 dígitos y terminar en @c.us
    return /^\d{10,}@c\.us$/.test(number)
}

if (!command || command === 'help') {
    showHelp()
    process.exit(0)
}

switch (command) {
    case 'add':
        if (!phoneNumber) {
            console.error('❌ Error: Debes proporcionar un número de teléfono')
            showHelp()
            process.exit(1)
        }
        
        const formattedNumber = formatPhoneNumber(phoneNumber)
        
        if (!validatePhoneNumber(formattedNumber)) {
            console.error('❌ Error: Número de teléfono inválido')
            console.log('Formato esperado: 521XXXXXXXXXX@c.us o 521XXXXXXXXXX')
            process.exit(1)
        }
        
        if (database.addToWhitelist(formattedNumber)) {
            console.log(`✅ Usuario ${formattedNumber} agregado a la whitelist`)
        } else {
            console.log(`⚠️  El usuario ${formattedNumber} ya está en la whitelist`)
        }
        break
        
    case 'remove':
        if (!phoneNumber) {
            console.error('❌ Error: Debes proporcionar un número de teléfono')
            showHelp()
            process.exit(1)
        }
        
        const formattedRemove = formatPhoneNumber(phoneNumber)
        
        if (database.removeFromWhitelist(formattedRemove)) {
            console.log(`✅ Usuario ${formattedRemove} eliminado de la whitelist`)
        } else {
            console.log(`⚠️  El usuario ${formattedRemove} no estaba en la whitelist`)
        }
        break
        
    case 'list':
        const users = database.getAllWhitelist()
        
        if (users.length === 0) {
            console.log('\n📱 La whitelist está vacía')
        } else {
            console.log(`\n📱 Usuarios autorizados (${users.length}):\n`)
            users.forEach((user, index) => {
                const date = new Date(user.added_at * 1000)
                console.log(`${index + 1}. ${user.phone_number}`)
                console.log(`   Agregado: ${date.toLocaleString('es-MX')}`)
            })
        }
        break
        
    default:
        console.error(`❌ Comando desconocido: ${command}`)
        showHelp()
        process.exit(1)
}
