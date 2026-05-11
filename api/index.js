const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// ቦቱን መቀስቀሻ
try {
    const bot = require('./bot.js');
    // ቴሌግራም መልዕክት ሲልክ እዚህ ጋር ያስተናግዳል
    app.use(bot.webhookCallback('/api/index'));
    console.log("✅ ቦቱ በዌብሁክ ተነስቷል!");
} catch (error) {
    console.error("❌ ቦት ስህተት:", error);
}

// MongoDB ግንኙነት
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB ተገናኝቷል!"))
  .catch(err => console.error("❌ የዳታቤዝ ስህተት:", err));

// ዌብሁክ መቀበያ
app.post('/api/index', (req, res) => {
    res.status(200).send('OK');
});

app.get('/api/health', (req, res) => {
    res.send('Server is Up!');
});

module.exports = app;