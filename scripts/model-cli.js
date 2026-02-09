const database = require('../src/database')
const aiProcessor = require('../src/ai-processor')

// Inicializar base de datos
database.initDatabase()

const args = process.argv.slice(2)
const command = args[0]
const modelName = args[1]

function showHelp() {
    console.log('\n🤖 Gestión de Modelos IA\n')
    console.log('Uso:')
    console.log(' baco-bot model list            - Mostrar modelo actual y disponibles')
    console.log(' baco-bot model set <nombre>    - Cambiar el modelo de IA\n')
    console.log('Ejemplos:')
    console.log(' baco-bot model list')
    console.log(' baco-bot model set gemma3:1b')
}

async function main() {
    if (!command || command === 'help') {
        showHelp()
        process.exit(0)
    }

    const modelosDisponibles = await aiProcessor.listOllamaModels()

    switch (command) {
        case 'list':
            const modeloActual = database.getConfig('modelo')
            console.log(`\n🤖 Modelo actual: ${modeloActual || 'No configurado'}`)
            
            if (modelosDisponibles.length === 0) {
                console.log('⚠️  No se detectaron modelos en Ollama. Asegúrate de que Ollama esté corriendo.')
            } else {
                console.log('\nModelos instalados en Ollama:')
                modelosDisponibles.forEach((m, i) => {
                    const mark = m === modeloActual ? '->' : '  '
                    console.log(`${mark} ${m}`)
                })
            }
            console.log('')
            break

        case 'set':
            if (!modelName) {
                console.error('❌ Error: Debes proporcionar el nombre del modelo')
                showHelp()
                process.exit(1)
            }

            if (modelosDisponibles.length > 0 && !modelosDisponibles.includes(modelName)) {
                // Intentar buscar coincidencia parcial
                const match = modelosDisponibles.find(m => m.startsWith(modelName + ':'))
                if (!match) {
                    console.error(`❌ Error: El modelo '${modelName}' no parece estar instalado en Ollama.`)
                    console.log('Usa \'baco-bot model list\' para ver los modelos disponibles.')
                    process.exit(1)
                }
            }

            const modeloAnterior = database.getConfig('modelo')
            if (modeloAnterior && modeloAnterior !== modelName) {
                await aiProcessor.unloadModel(modeloAnterior).catch(() => {})
            }

            database.setConfig('modelo', modelName)
            console.log(`✅ Modelo cambiado exitosamente a: ${modelName}`)
            break

        default:
            console.error(`❌ Comando desconocido: ${command}`)
            showHelp()
            process.exit(1)
    }
}

main().catch(err => {
    console.error('❌ Error fatal:', err)
    process.exit(1)
})
