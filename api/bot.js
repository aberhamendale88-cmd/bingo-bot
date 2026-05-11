const { Telegraf } = require('telegraf');

// ያንተ አዲሱ እና ትክክለኛው Token
const bot = new Telegraf('8716898668:AAGqdlK_1nEJbL4m2YIr9cZ5TO-JaDkmxfA');

// ቦቱ ሲጀምር የሚላክ መልዕክት
bot.start((ctx) => {
    const firstName = ctx.from.first_name || "ተጫዋች";
    
    // መልዕክቱን እዚህ እናዘጋጃለን (MarkdownV2 ስህተት እንዳይፈጥር ተራ ጽሁፍ ተጠቅመናል)
    const welcomeMessage = `ሰላም ${firstName} 👋\n\nእንኳን ወደ Win Bingo በደህና መጡ!\n\nለመጫወት ከታች ያለውን Play የሚለውን ቁልፍ ይጫኑ።`;

    ctx.reply(welcomeMessage, {
        reply_markup: {
            inline_keyboard: [
                [
                    { 
                        text: "🎮 በላ (Play)", 
                        web_app: { url: "https://bingo-bot-chi.vercel.app" } 
                    }
                ],
                [
                    { 
                        text: "📢 ቻናላችንን ይቀላቀሉ", 
                        url: "https://t.me/your_channel" // እዚህ የቻናልህን ሊንክ መተካት ትችላለህ
                    }
                ]
            ]
        }
    });
});

// ለቪርሴል (Vercel) እንዲመች ቦቱን ወደ ውጭ እንልካለን
module.exports = bot;