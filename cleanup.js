const { execSync } = require('child_process')
const fs = require('fs')

console.log('Iniciando limpieza de sesión...')

try {
    // Cerramos Chrome solamente para liberar los archivos bloqueados
    console.log('Cerrando instancias de Chrome...')
    try {
        execSync('taskkill /F /IM chrome.exe /T 2>nul')
    } catch (e) {
        // Ignoramos si no hay procesos de chrome
    }

    // Borramos la carpeta de sesión si existe
    if (fs.existsSync('.wwebjs_auth')) {
        console.log('Borrando carpeta .wwebjs_auth...')
        fs.rmSync('.wwebjs_auth', { recursive: true, force: true })
        console.log('Sesión borrada con éxito.')
    } else {
        console.log('No se encontró sesión previa para borrar.')
    }

} catch (err) {
    console.error('Error durante la limpieza:', err.message)
}

console.log('Limpieza completada. Continuando con la ejecución...')
