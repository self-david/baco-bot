const { execSync } = require('child_process')
const path = require('path')

const args = process.argv.slice(2)
const command = args[0]

function checkPM2Installed() {
    try {
        execSync('pm2 -v', { stdio: 'ignore' })
        return true
    } catch (error) {
        return false
    }
}

function start() {
    if (!checkPM2Installed()) {
        console.error('❌ PM2 no está instalado globalmente')
        console.log('\nPara instalar PM2, ejecuta:')
        console.log('npm install -g pm2\n')
        process.exit(1)
    }
    
    try {
        console.log('🚀 Iniciando bot en segundo plano...')
        
        // Verificar si ya está corriendo
        try {
            const list = execSync('pm2 list', { encoding: 'utf-8' })
            if (list.includes('wa-bot')) {
                console.log('⚠️  El bot ya está corriendo. Reiniciando...')
                execSync('pm2 restart wa-bot', { stdio: 'inherit' })
                console.log('✅ Bot reiniciado exitosamente')
                return
            }
        } catch (e) {
            // Ignorar error si pm2 list falla
        }
        
        // Iniciar con PM2
        const indexPath = path.join(__dirname, '..', 'index.js')
        execSync(`pm2 start "${indexPath}" --name wa-bot`, { stdio: 'inherit' })
        
        console.log('\n✅ Bot iniciado exitosamente')
        console.log('\nComandos útiles:')
        console.log('  pm2 list          - Ver estado')
        console.log('  pm2 logs wa-bot   - Ver logs')
        console.log('  pm2 monit         - Monitor interactivo')
        console.log('  npm run stop      - Detener bot\n')
        
    } catch (error) {
        console.error('❌ Error iniciando bot:', error.message)
        process.exit(1)
    }
}

function stop() {
    console.log('🛑 Deteniendo bot...')
    
    // Intentar detener con PM2 primero
    if (checkPM2Installed()) {
        try {
            execSync('pm2 delete wa-bot', { stdio: 'ignore' })
            console.log('✅ Bot detenido con PM2')
        } catch (e) {
            console.log('⚠️  No se encontró proceso PM2')
        }
    }
    
    // Limpiar procesos en Windows
    if (process.platform === 'win32') {
        try {
            console.log('🧹 Limpiando procesos de Chrome y Node...')
            execSync('taskkill /F /IM chrome.exe /T 2>nul', { stdio: 'ignore' })
            execSync('taskkill /F /FI "IMAGENAME eq node.exe" /FI "WINDOWTITLE eq wa-bot*" 2>nul', { stdio: 'ignore' })
        } catch (e) {
            // Ignorar errores si no hay procesos
        }
    } else {
        // En Linux/Mac
        try {
            execSync('pkill -f "node.*index.js"', { stdio: 'ignore' })
            execSync('pkill chromium', { stdio: 'ignore' })
        } catch (e) {
            // Ignorar errores
        }
    }
    
    console.log('✅ Procesos detenidos')
}

function status() {
    if (!checkPM2Installed()) {
        console.error('❌ PM2 no está instalado')
        process.exit(1)
    }
    
    try {
        execSync('pm2 list', { stdio: 'inherit' })
    } catch (error) {
        console.error('❌ Error obteniendo estado:', error.message)
        process.exit(1)
    }
}

// Ejecutar comando
switch (command) {
    case 'start':
        start()
        break
    case 'stop':
        stop()
        break
    case 'status':
        status()
        break
    default:
        console.error('❌ Comando desconocido:', command)
        console.log('\nComandos disponibles: start, stop, status')
        process.exit(1)
}
