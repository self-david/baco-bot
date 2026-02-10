const utils = require('../src/utils');

const testCases = [
    "Hey, a las 5 de la tarde tengo que paseas a mis perritas",
    "Recuérdame comprar leche en 10 minutos",
    "En 2 horas avisame de la reunion",
    "Tengo que ir al medico mañana a las 9am",
    "paga la tarjeta el viernes"
];

console.log("--- Testing Reminder Extraction ---\n");

testCases.forEach(text => {
    console.log(`Input: "${text}"`);
    const result = utils.extractReminderFromText(text);
    if (result.found) {
        console.log(`✅ Extracted Message: "${result.message}"`);
        console.log(`   Time Expression: "${result.timeExpression}"`);
    } else {
        console.log(`❌ No reminder found`);
    }
    console.log("-".repeat(30));
});
