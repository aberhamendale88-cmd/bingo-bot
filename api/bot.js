const { Telegraf } = require('telegraf');
require('dotenv').config();

// 1. ቦቱን በቶከን ማስጀመር
const bot = new Telegraf(process.env.BOT_TOKEN);

// 2. ተጠቃሚው /start ሲል የሚመጣ መልዕክት
bot.start((ctx) => {
    const firstName = ctx.from.first_name || "ተጫዋች";
    
    ctx.replyWithMarkdownV2(
        `ሰላም *${firstName}* 👋 \nእንኳን ወደ **Win Bingo** በደህና መጡ\! \n\nለመጫወት ከታች ያለውን ቁልፍ ይጫኑ👇`,
        {
            reply_markup: {
                inline_keyboard: [
                    [
                        { 
                            text: "🎮 በላ (Play)", 
                            web_app: { url: process.env.WEBAPP_URL } 
                        }
                    ],
                    [
                        { text: "📢 ቻናላችንን ይቀላቀሉ", url: "https://t.me/your_channel_username" }
                    ]
                ]
            }
        }
    );
});

// 3. ቦቱን ማስነሳት
bot.launch()
    .then(() => console.log("ቴሌግራም ቦቱ መስራት ጀምሯል..."))
    .catch((err) => console.error("ቦቱን በማስነሳት ላይ ስህተት ተፈጥሯል:", err));

// ፕሮግራሙ ሲቆም ቦቱንም ማቆም
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));