const { Telegraf } = require('telegraf');

// ያንተ Token
const bot = new Telegraf('8716898668:AAGqdlK_1nEJbL4m2YIr9cZ5TO-JaDkmxfA');

bot.start((ctx) => {
    const firstName = ctx.from.first_name || "ተጫዋች";
    ctx.reply(`ሰላም ${firstName} 👋\n\nእንኳን ወደ Win Bingo በደህና መጡ!\n\nለመጫወት ከታች ያለውን Play የሚለውን ቁልፍ ይጫኑ።`, {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: "🎮 በላ (Play)", web_app: { url: "https://bingo-bot-chi.vercel.app" } }
                ]
            ]
        }
    });
});

module.exports = bot;