const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
app.use(express.json());

// ⚠️ የ public ፋይሎች መገኛ
app.use(express.static(path.join(__dirname, '../public')));

// ቦቱን መቀስቀሻ
try {
    require('./bot.js');
} catch (error) {
    console.error("Bot loading error:", error);
}

// ዋናው ገጽ (HTML) እንዲከፈት
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ለቴሌግራም ዌብሁክ
app.post('/api/index', (req, res) => {
    res.status(200).send('OK');
});

// MongoDB ግንኙነት
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB ተገናኝቷል!"))
  .catch(err => console.error("❌ የዳታቤዝ ስህተት:", err));

module.exports = app;