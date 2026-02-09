#!/usr/bin/env node

const { spawn } = require('child_process')
const path = require('path')

const args = process.argv.slice(2)
const command = args[0]

function showHelp() {
    console.log(`
🤖 *baco-bot CLI*

Uso:
  baco-bot <comando> [opciones]

Comandos:
  dev             Iniciar en modo desarrollo (con logs)
  qr              Mostrar código QR para vincular
  init            Configuración inicial (Wizard)
  start           Iniciar en segundo plano (PM2)
  stop            Detener el bot
  restart         Reiniciar el bot
  model           Gestionar modelos de Ollama
  whitelist       Gestionar usuarios autorizados

Ejemplos:
  baco-bot dev
  baco-bot model list
  baco-bot whitelist add 521xxxxxxxxxx
`)
}

if (!command || command === 'help' || command === '--help' || command === '-h') {
    showHelp()
    process.exit(0)
}

const packagePath = path.join(__dirname, '..', 'package.json')
const packageJson = require(packagePath)

// Mapeo de comandos de baco-bot a scripts de npm o comandos directos
const scriptMap = {
    'dev': 'dev',
    'qr': 'qr',
    'init': 'init',
    'start': 'start',
    'stop': 'stop',
    'restart': 'restart',
    'model': 'model',
    'whitelist': 'whitelist'
}

const scriptName = scriptMap[command]

if (!scriptName) {
    console.error(`❌ Comando desconocido: ${command}`)
    showHelp()
    process.exit(1)
}

// Ejecutar el script correspondiente usando npm
// Usamos spawn para que sea interactivo y herede stdio
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const childArgs = ['run', scriptName]

// Agregar argumentos adicionales si existen (ej: baco-bot model set gemma)
if (args.length > 1) {
    childArgs.push('--')
    childArgs.push(...args.slice(1))
}

const child = spawn(npmCmd, childArgs, {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    shell: true
})

child.on('exit', (code) => {
    process.exit(code)
})
