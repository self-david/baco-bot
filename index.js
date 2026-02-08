const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');
const ollama = require('ollama').default; // Fix para evitar TypeError
const schedule = require('node-schedule');
const fs = require('fs');

// Rutas de archivos persistentes
const WHITELIST_FILE = './whitelist.json';
const CONFIG_FILE = './config.json';
const MEMORIA_FILE = './memoria.json';

// Carga inicial de datos desde archivos
let whitelist = JSON.parse(fs.readFileSync(WHITELIST_FILE, 'utf-8'));
let config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
let chatMemory = fs.existsSync(MEMORIA_FILE)? JSON.parse(fs.readFileSync(MEMORIA_FILE, 'utf-8')) : {};

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        executablePath: '/usr/bin/chromium', 
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

function guardar(file, data) { fs.writeFileSync(file, JSON.stringify(data, null, 2)); }

client.on('qr', qr => qrcode.generate(qr, {small: true}));

client.on('ready', () => {
    console.log(config.nombre? `¡${config.nombre} está activo!` : 'Esperando configuración inicial vía WhatsApp...');
});

client.on('message_create', async message => {
    if (message.fromMe) return;
    const chatId = message.from;

    // 1. Validar Whitelist (Seguridad)
    if (!whitelist.includes(chatId)) return;

    const chat = await message.getChat();
    const texto = message.body.trim();

    // 2. COMANDOS DE AJUSTE (/nombre y /personalidad)
    if (texto.startsWith('/nombre ')) {
        config.nombre = texto.replace('/nombre ', '').trim();
        guardar(CONFIG_FILE, config);
        return message.reply(`✅ Nombre cambiado. Ahora me llamo: ${config.nombre}`);
    }

    if (texto.startsWith('/personalidad ')) {
        config.personalidad = texto.replace('/personalidad ', '').trim();
        guardar(CONFIG_FILE, config);
        return message.reply(`✅ Personalidad actualizada: "${config.personalidad}"`);
    }

    // 3. CONFIGURACIÓN INICIAL (Si el bot no tiene nombre ni personalidad)
    if (!config.nombre) {
        config.nombre = texto;
        guardar(CONFIG_FILE, config);
        return message.reply(`¡Hola! Desde ahora mi nombre es *${config.nombre}*. \n\nAhora dime: ¿Qué personalidad quieres que tenga? (Ej: "Eres un asistente sarcástico", "Eres un experto en leyes")`);
    }

    if (!config.personalidad) {
        config.personalidad = texto;
        guardar(CONFIG_FILE, config);
        return message.reply(`Entendido. Mi personalidad es: "${config.personalidad}". \n\n¡Configuración completa! Ya puedes hablarme de lo que quieras.`);
    }

    // 4. INICIALIZAR MEMORIA (Lista de mensajes)
    if (!chatMemory[chatId]) {
        chatMemory[chatId] = []; // Los corchetes van AQUÍ
    }

    // 5. RECORDATORIOS PROACTIVOS (Ej: "recuérdame en 60") 
    if (texto.toLowerCase().includes('recuérdame en')) {
        const segundos = parseInt(texto.match(/\d+/));
        if (segundos) {
            const fecha = new Date(Date.now() + segundos * 1000);
            schedule.scheduleJob(fecha, () => {
                client.sendMessage(chatId, `🔔 RECORDATORIO PROACTIVO: Soy ${config.nombre}, el tiempo terminó.`);
            });
            return message.reply(`Vale, te avisaré en ${segundos} segundos.`);
        }
    }

    // 6. RESPUESTA CON IA + INDICADOR "ESCRIBIENDO..."
    try {
        await chat.sendStateTyping(); // Muestra "Escribiendo..." en WhatsApp 

        chatMemory[chatId].push({ role: 'user', content: texto });
        
        // Sliding Window: Recordar 8 mensajes para no saturar los 8GB de la Pi 4 [3, 4]
        if (chatMemory[chatId].length > 8) chatMemory[chatId].shift();

        // Construir prompt con personalidad e historial
        const promptMessages =[
            { role: 'system', content: config.personalidad },
           ...chatMemory[chatId]
	];

        const response = await ollama.chat({
            model: 'nergal', // El nombre que creaste con el Modelfile
            messages: promptMessages,
            keep_alive: -1 // Mantiene el modelo en RAM para velocidad 
        });

        const replyIA = response.message.content;
        chatMemory[chatId].push({ role: 'assistant', content: replyIA });
        
        // Guardar memoria en el archivo JSON [5]
        guardar(MEMORIA_FILE, chatMemory);
        
        await client.sendMessage(chatId, replyIA);

    } catch (error) {
        console.error("Error en Ollama:", error);
    }
});

client.initialize();
