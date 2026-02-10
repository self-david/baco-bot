const aiProcessor = require('../src/ai-processor');
const database = require('../src/database');

// Mock database config to use a dummy model (or real if available)
database.getConfig = (key) => {
    if (key === 'modelo') return 'gemma:2b'; // Assume a model exists or let it fail gently
    return null;
};

const testInputs = [
    "Oye baco por fa recuérdame sacar la basura en 10 minutos",
    "mañana a las 5pm ir al medico"
];

console.log("--- Testing AI Reminder Parsing ---\n");

(async () => {
    for (const text of testInputs) {
        console.log(`Input: "${text}"`);
        try {
            // Test directly the AI function
            const result = await aiProcessor.parseReminderWithAI(text, 'gemma:2b'); // Use a likely model or parameter
            console.log("AI Result:", JSON.stringify(result, null, 2));
        } catch (error) {
            console.error("AI Error (Expected if Ollama not running/model missing):", error.message);
        }
        console.log("-".repeat(30));
    }
})();

