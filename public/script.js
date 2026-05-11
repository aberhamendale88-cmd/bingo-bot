let currentUser = null;
let selectedNumbers = [];
let calledNumbers = [];
let myCard = [];

async function handleAuth() {
    const phone = document.getElementById('phone').value;
    const password = document.getElementById('password').value;
    const res = await fetch('/api/auth', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ phone, password })
    });
    if (res.ok) {
        currentUser = await res.json();
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('main-ui').style.display = 'block';
        updateUI();
    } else { alert("ስህተት ተፈጥሯል!"); }
}

function updateUI() {
    document.getElementById('balance-display').innerText = currentUser.balance;
}

async function startBooking() {
    const res = await fetch('/api/play', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ phone: currentUser.phone })
    });
    const data = await res.json();
    if (res.ok) {
        currentUser.balance = data.newBalance;
        updateUI();
        openNumberSelection();
    } else { alert(data.message); }
}

function openNumberSelection() {
    let html = `<h3>ቁጥር ይምረጡ (1-500)</h3><div class="bingo-grid-500">`;
    for(let i=1; i<=500; i++) {
        html += `<div class="grid-item" onclick="this.classList.toggle('selected-blue')">${i}</div>`;
    }
    html += `</div><button class="play-btn" onclick="startBingoGame()">ጨዋታውን ጀምር</button>`;
    document.getElementById('game-content').innerHTML = html;
}

function startBingoGame() {
    myCard = generateBingoCard();
    renderBingoCard();
    simulateDraws();
}

function generateBingoCard() {
    const ranges = [[1,15], [16,30], [31,45], [46,60], [61,75]];
    return Array.from({length: 5}, (_, r) => 
        ranges.map(([min, max]) => Math.floor(Math.random() * (max - min + 1)) + min)
    );
}

function renderBingoCard() {
    let html = `<div id="current-draw" class="big-ball">...</div><div class="bingo-card">`;
    myCard.flat().forEach(num => html += `<div id="cell-${num}" class="card-cell">${num}</div>`);
    html += `</div>`;
    document.getElementById('game-content').innerHTML = html;
}

function simulateDraws() {
    const interval = setInterval(async () => {
        let num = Math.floor(Math.random() * 75) + 1;
        if (!calledNumbers.includes(num)) {
            calledNumbers.push(num);
            document.getElementById('current-draw').innerText = num;
            const cell = document.getElementById(`cell-${num}`);
            if (cell) cell.classList.add('marked-green');

            if (checkWin(myCard, calledNumbers)) {
                clearInterval(interval);
                alert("ቢንጎ! አሸንፈዋል!");
                await fetch('/api/win', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ phone: currentUser.phone, totalPot: 100 }) // Example Pot
                });
            }
        }
        if (calledNumbers.length >= 75) clearInterval(interval);
    }, 3000);
}

function checkWin(card, draws) {
    const check = (arr) => arr.every(n => draws.includes(n));
    if (card.some(row => check(row))) return true;
    for (let i=0; i<5; i++) if (check(card.map(r => r[i]))) return true;
    return false;
}