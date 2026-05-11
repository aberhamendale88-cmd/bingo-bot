const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// .env ፋይልን ለማንበብ
dotenv.config();

const app = express();
app.use(express.json());

// 1. የ static ፋይሎች (HTML, CSS, JS) መገኛ
app.use(express.static(path.join(__dirname, '../public')));

// 2. ቦቱን ለመቀስቀስ (Activate ለማድረግ)
try {
    // bot.js ፋይል አሁን api ፎልደር ውስጥ ስላለ እንዲህ እንጠራዋለን
    require('./bot.js');
    console.log("✅ ቦቱ በተሳካ ሁኔታ ተነስቷል!");
} catch (error) {
    console.error("❌ ቦቱን ሲቀሰቅስ ስህተት ተፈጠረ:", error);
}

// 3. MongoDB ግንኙነት
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB ተገናኝቷል!"))
  .catch(err => console.error("❌ የዳታቤዝ ግንኙነት ስህተት:", err));

// 4. ሞዴሎች (Models)
const User = mongoose.model('User', new mongoose.Schema({
  phone: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  balance: { type: Number, default: 0 }
}));

// 5. ቴሌግራም መልዕክት ሲልክ የሚቀበልበት መንገድ (Webhook)
app.post('/api/index', (req, res) => {
    // ቴሌግራም መልዕክት ሲልክ ለቪርሴል "ተቀብያለሁ" ለማለት
    res.status(200).send('OK');
});

// ሰርቨሩ መስራቱን ለማረጋገጥ
app.get('/api/health', (req, res) => {
  res.send('Server is healthy!');
});

module.exports = app;