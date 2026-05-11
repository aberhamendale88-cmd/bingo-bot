const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

require('./bot.js');
// 1. MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB ተገናኝቷል!"))
  .catch(err => console.error("የዳታቤዝ ግንኙነት ስህተት:", err));

// 2. Models
const User = mongoose.model('User', new mongoose.Schema({
    phone: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    balance: { type: Number, default: 0 }
}));

const Deposit = mongoose.model('Deposit', new mongoose.Schema({
    phone: String, amount: Number, transactionId: String,
    status: { type: String, default: 'Pending' },
    createdAt: { type: Date, default: Date.now }
}));

// 3. APIs
app.post('/api/auth', async (req, res) => {
    const { phone, password } = req.body;
    try {
        let user = await User.findOne({ phone });
        if (!user) {
            user = new User({ phone, password, balance: 0 });
            await user.save();
        } else if (user.password !== password) {
            return res.status(401).json({ message: "የተሳሳተ ፓስወርድ" });
        }
        res.json(user);
    } catch (err) { res.status(500).json({ message: "ስህተት" }); }
});

app.post('/api/deposit', async (req, res) => {
    try {
        const newDep = new Deposit(req.body);
        await newDep.save();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ message: "ስህተት" }); }
});

app.post('/api/play', async (req, res) => {
    const { phone } = req.body;
    const user = await User.findOne({ phone });
    if (!user || user.balance < 10) return res.status(400).json({ message: "በቂ ባላንስ የለም" });
    user.balance -= 10;
    await user.save();
    res.json({ success: true, newBalance: user.balance });
});

app.post('/api/win', async (req, res) => {
    const { phone, totalPot } = req.body;
    const winnerAmount = totalPot * 0.8; // 80% Rule
    const user = await User.findOne({ phone });
    user.balance += winnerAmount;
    await user.save();
    res.json({ success: true, won: winnerAmount });
});

// Admin APIs
app.get('/api/admin/deposits', async (req, res) => res.json(await Deposit.find({ status: 'Pending' })));
app.post('/api/admin/approve', async (req, res) => {
    const { id, phone, amount } = req.body;
    await Deposit.findByIdAndUpdate(id, { status: 'Approved' });
    const user = await User.findOne({ phone });
    user.balance += Number(amount);
    await user.save();
    res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));