const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const bot = require('./bot.js'); // ቦቱን እዚህ እንጠራዋለን

dotenv.config();

const app = express();
app.use(express.json());

// የ public ፋይሎች መገኛ
app.use(express.static(path.join(__dirname, '../public')));

// ⚠️ ቴሌግራም መልዕክት ሲልክ ለቦቱ የሚያስተላልፍበት መንገድ
app.post('/api/index', (req, res) => {
    bot.handleUpdate(req.body, res);
});

// ዋናው ገጽ (HTML) እንዲከፈት
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// MongoDB ግንኙነት
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB error:", err));

module.exports = app;