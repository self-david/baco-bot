const inquirer = require('inquirer')
const { execSync } = require('child_process')
const database = require('../src/database')
const fs = require('fs')

console.log('\n🤖 *Configuración Inicial del Bot de WhatsApp*\n')

// Inicializar base de datos
database.initDatabase()

async function main() {
    // Verificar si ya existe configuración
    const configExiste = database.getConfig('nombre') !== null
    
    if (configExiste) {
        const { confirmar } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirmar',
                message: '⚠️  Ya existe una configuración. ¿Deseas sobrescribirla?',
                default: false
            }
        ])
        
        if (!confirmar) {
            console.log('\n✅ Configuración mantenida')
            process.exit(0)
        }
    }
    
    // 1. Verificar Ollama y listar modelos
    let modelos = []
    console.log('⏳ Verificando conexión con Ollama...')
    
    try {
        // Usar promesa para manejar timeout manualmente si fuera necesario
        const output = await new Promise((resolve, reject) => {
            const { exec } = require('child_process')
            exec('ollama list', { timeout: 10000 }, (error, stdout, stderr) => {
                if (error) {
                    console.error('Debug Ollama Error:', error.message)
                    reject(error)
                }
                else resolve(stdout)
            })
        })

        const lines = output.split('\n').slice(1) // Saltar encabezado
        
        modelos = lines
            .filter(line => line.trim())
            .map(line => {
                const parts = line.split(/\s+/)
                return parts[0]
            })
            .filter(m => m && m !== 'NAME')
        
        if (modelos.length === 0) {
            console.error('\n❌ No se encontraron modelos en Ollama')
            console.log('👉 Descarga un modelo primero: ollama pull gemma3:1b\n')
            process.exit(1)
        }
        console.log('✅ Conexión con Ollama exitosa')
    } catch (error) {
        console.error('\n❌ No se pudo conectar con Ollama o expiró el tiempo de espera')
        console.log('👉 Asegúrate de que Ollama esté corriendo y responde rápido\n')
        
        // Fallback: Permitir escribir el nombre del modelo manualmente
        const { usarManual } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'usarManual',
                message: '¿Quieres escribir el nombre del modelo manualmente?',
                default: true
            }
        ])
        
        if (!usarManual) process.exit(1)
        
        const { manualModel } = await inquirer.prompt([
            {
                type: 'input',
                name: 'manualModel',
                message: 'Escribe el nombre del modelo (ej: gemma3:1b):',
                default: 'gemma3:1b'
            }
        ])
        modelos = [manualModel]
    }
    
    // 2. Preguntas de configuración
    const respuestas = await inquirer.prompt([
        {
            type: 'list',
            name: 'modelo',
            message: '📦 Selecciona el modelo de IA a usar:',
            choices: modelos
        },
        {
            type: 'input',
            name: 'nombre',
            message: '🤖 ¿Cómo se llamará el bot?',
            default: 'Leslye',
            validate: input => input.trim() ? true : 'El nombre no puede estar vacío'
        },
        {
            type: 'editor',
            name: 'personalidad',
            message: '✨ Define la personalidad del bot (se abrirá un editor):',
            default: 'Eres un asistente personal útil, amigable y proactivo. Ayudas con recordatorios y respondes de forma clara y concisa.',
            validate: input => input.trim() ? true : 'La personalidad no puede estar vacía'
        },
        {
            type: 'confirm',
            name: 'agregarWhitelist',
            message: '📱 ¿Deseas agregar números a la whitelist ahora?',
            default: true
        }
    ])
    
    // 3. Guardar configuración
    database.setConfig('modelo', respuestas.modelo)
    database.setConfig('nombre', respuestas.nombre)
    database.setConfig('personalidad', respuestas.personalidad)
    
    console.log('\n✅ Configuración guardada:')
    console.log(`   Modelo: ${respuestas.modelo}`)
    console.log(`   Nombre: ${respuestas.nombre}`)
    console.log(`   Personalidad: ${respuestas.personalidad.substring(0, 50)}...`)
    
    // 4. Agregar números a whitelist
    if (respuestas.agregarWhitelist) {
        let seguir = true
        
        while (seguir) {
            const { numero } = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'numero',
                    message: '📱 Número de WhatsApp (formato: 5213321082748@c.us o solo 5213321082748):',
                    validate: input => {
                        if (!input.trim()) return 'El número no puede estar vacío'
                        return true
                    }
                }
            ])
            
            // Formatear número
            const numeroFormateado = numero.includes('@c.us') ? numero : `${numero}@c.us`
            
            if (database.addToWhitelist(numeroFormateado)) {
                console.log(`   ✅ ${numeroFormateado} agregado`)
            } else {
                console.log(`   ⚠️  ${numeroFormateado} ya estaba en la whitelist`)
            }
            
            const { continuar } = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'continuar',
                    message: '¿Agregar otro número?',
                    default: false
                }
            ])
            
            seguir = continuar
        }
    }
    
    // 5. Verificar sesión de WhatsApp
    console.log('\n📱 Verificando sesión de WhatsApp...')
    
    if (!fs.existsSync('./.wwebjs_auth')) {
        console.log('\n⚠️  No se encontró sesión de WhatsApp')
        
        const { vincular } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'vincular',
                message: '¿Deseas vincular tu cuenta de WhatsApp ahora?',
                default: true
            }
        ])
        
        if (vincular) {
            console.log('\n🔗 Ejecuta: npm run qr')
            console.log('Luego escanea el código QR con tu celular\n')
        }
    } else {
        console.log('✅ Sesión de WhatsApp encontrada')
    }
    
    // 6. Resumen final
    const stats = database.getStats()
    
    console.log('\n📊 Estado del bot:')
    console.log(`   - Modelo: ${respuestas.modelo}`)
    console.log(`   - Nombre: ${respuestas.nombre}`)
    console.log(`   - Usuarios autorizados: ${stats.whitelistCount}`)
    console.log(`   - Mensajes en historial: ${stats.totalMessages}`)
    
    console.log('\n✨ Configuración completada!')
    console.log('\n📝 Próximos pasos:')
    console.log('   1. npm run qr       - Vincular WhatsApp (si aún no lo has hecho)')
    console.log('   2. npm run dev      - Ejecutar bot en modo desarrollo')
    console.log('   3. npm run start    - Ejecutar bot en segundo plano')
    console.log('')
}

main().catch(error => {
    console.error('\n❌ Error:', error.message)
    process.exit(1)
})
