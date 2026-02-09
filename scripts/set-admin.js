const database = require('../src/database')

const args = process.argv.slice(2)
const phoneNumber = args[0]

if (!phoneNumber) {
    console.log('\n❌ Por favor, proporciona un número de teléfono')
    console.log('Uso: node scripts/set-admin.js 521xxxxxxxxxx@c.us\n')
    process.exit(1)
}

// Inicializar base de datos
database.initDatabase()

console.log(`\n⏳ Promoviendo a ${phoneNumber} como administrador...`)

try {
    const result = database.promoteToAdmin(phoneNumber)
    if (result) {
        console.log('✅ ¡Éxito! El usuario ahora tiene rol de administrador.\n')
    } else {
        console.log('❌ No se pudo actualizar el rol.\n')
    }
} catch (error) {
    console.error('❌ Error:', error.message)
}

process.exit(0)
