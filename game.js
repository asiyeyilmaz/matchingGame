'use strict';

const LEVELS = [
    { level: 1, pairs: 3,  cols: 3, time: 20 },
    { level: 2, pairs: 4,  cols: 4, time: 30 },
    { level: 3, pairs: 6,  cols: 6, time: 60 },
];

const CARD_IMAGES = [
    'images/cards/card1.jpg',
    'images/cards/card2.jpg',
    'images/cards/card3.jpg',
    'images/cards/card4.jpg',
    'images/cards/card5.jpg',
    'images/cards/card6.jpg',
];

const FALLBACK_COLORS = [
    ['#fd79a8','#e84393'],
    ['#a29bfe','#6c5ce7'],
    ['#55efc4','#00b894'],
    ['#ffeaa7','#fdcb6e'],
    ['#fab1d3','#e056cd'],
    ['#81ecec','#00cec9'],
];
const FALLBACK_LABELS = ['🌸','🌟','🍀','🌈','🦋','🌻'];

const state = {
    levelIndex     : 0,
    lives          : 3,
    completedLevels: [],
    timeLeft       : 0,
    timerId        : null,
    cards          : [],
    flipped        : [],
    matchedCount   : 0,
    totalPairs     : 0,
    busy           : false,
};

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

window.addEventListener('load', () => {
    spawnFireflies();
    updateMapDisplay();
    showScreen('screen-map');
});

// ── MAP ──────────────────────────────────────────────────────
function updateMapDisplay() {
    LEVELS.forEach((lvl, i) => {
        const node = document.getElementById(`node-${i + 1}`);
        node.classList.remove('completed', 'active');
        if (state.completedLevels.includes(lvl.level)) {
            node.classList.add('completed');
            const outRoad = document.getElementById(`road-${i+1}-${i+2}`);
            if (outRoad) outRoad.classList.add('done');
        } else if (i === state.levelIndex) {
            node.classList.add('active');
        }
    });
}

function onMapStart() {
    showLevelPreview();
}

function returnToMap() {
    stopTimer();
    state.levelIndex      = 0;
    state.completedLevels = [];
    state.lives           = 3;
    updateMapDisplay();
    showScreen('screen-map');
}

// ── LEVEL PREVIEW ────────────────────────────────────────────
function showLevelPreview() {
    const lvl = LEVELS[state.levelIndex];
    state.lives = 3;
    document.getElementById('preview-title').textContent = `LEVEL ${lvl.level}`;
    document.getElementById('preview-time').textContent  = lvl.time;
    renderLives('preview-lives', state.lives);

    const grid = document.getElementById('preview-grid');
    grid.innerHTML = '';
    for (let i = 0; i < lvl.pairs * 2; i++) {
        const c = document.createElement('div');
        c.className = 'preview-card';
        c.textContent = '❤️';
        grid.appendChild(c);
    }
    showScreen('screen-preview');
}

function startLevel() {
    buildCardGrid();
    showScreen('screen-game');
    startTimer();
}

// ── GAME ─────────────────────────────────────────────────────
function buildCardGrid() {
    const lvl = LEVELS[state.levelIndex];
    state.timeLeft     = lvl.time;
    state.matchedCount = 0;
    state.totalPairs   = lvl.pairs;
    state.flipped      = [];
    state.busy         = false;

    document.getElementById('game-title').textContent = `LEVEL ${lvl.level}`;
    document.getElementById('game-timer').textContent = lvl.time;
    document.getElementById('timer-badge').classList.remove('urgent');
    renderLives('game-lives', state.lives);

    const images = CARD_IMAGES.slice(0, lvl.pairs);
    const values = shuffle([...images, ...images]);

    const grid = document.getElementById('card-grid');
    grid.innerHTML = '';
    grid.className = `card-grid cols-${lvl.cols}`;

    state.cards = values.map((src, idx) => {
        const el = makeCardElement(src, idx, images.indexOf(src));
        grid.appendChild(el);
        return { el, src, matched: false, flipped: false };
    });
}

function makeCardElement(imgSrc, index, pairIndex) {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.index = index;
    const [c1, c2] = FALLBACK_COLORS[pairIndex] || FALLBACK_COLORS[0];
    const emoji    = FALLBACK_LABELS[pairIndex]  || '❤️';

    card.innerHTML = `
        <div class="card-inner">
            <div class="card-face card-front">
                <div class="card-front-inner-border"></div>
                ❤️
            </div>
            <div class="card-face card-back">
                <img src="${imgSrc}" alt="card"
                     onload="this.style.display='block';this.nextElementSibling.style.display='none'"
                     onerror="this.style.display='none'">
                <div class="img-fallback" style="background:linear-gradient(145deg,${c1},${c2});color:#fff">${emoji}</div>
            </div>
        </div>`;

    card.addEventListener('click', () => onCardClick(index));
    return card;
}

function onCardClick(idx) {
    if (state.busy) return;
    const card = state.cards[idx];
    if (card.flipped || card.matched) return;
    card.flipped = true;
    card.el.classList.add('flipped');
    state.flipped.push(idx);
    if (state.flipped.length === 2) {
        state.busy = true;
        checkForMatch();
    }
}

function checkForMatch() {
    const [a, b] = state.flipped;
    const ca = state.cards[a];
    const cb = state.cards[b];

    if (ca.src === cb.src) {
        ca.matched = cb.matched = true;
        ca.el.classList.add('matched');
        cb.el.classList.add('matched');
        state.flipped    = [];
        state.matchedCount++;
        state.busy       = false;
        if (state.matchedCount === state.totalPairs) onLevelComplete();
    } else {
        setTimeout(() => {
            ca.flipped = cb.flipped = false;
            ca.el.classList.remove('flipped');
            cb.el.classList.remove('flipped');
            state.flipped = [];
            state.busy    = false;
        }, 1000);
    }
}

// ── TIMER ────────────────────────────────────────────────────
function startTimer() {
    stopTimer();
    const timerEl = document.getElementById('game-timer');
    const badge   = document.getElementById('timer-badge');
    state.timerId = setInterval(() => {
        state.timeLeft--;
        timerEl.textContent = state.timeLeft;
        if (state.timeLeft <= 5) badge.classList.add('urgent');
        if (state.timeLeft <= 0) { stopTimer(); onTimeUp(); }
    }, 1000);
}

function stopTimer() {
    clearInterval(state.timerId);
    state.timerId = null;
}

// ── OUTCOMES ─────────────────────────────────────────────────
function onLevelComplete() {
    stopTimer();
    state.completedLevels.push(LEVELS[state.levelIndex].level);
    launchConfetti();
    launchSparkleHearts();
    setTimeout(() => {
        state.levelIndex++;
        updateMapDisplay();
        if (state.levelIndex >= LEVELS.length) {
            showEndScreen();
        } else {
            showScreen('screen-map');
            setTimeout(() => showLevelPreview(), 1800);
        }
    }, 2200);
}

function onTimeUp() {
    state.lives--;
    renderLives('game-lives', state.lives);
    if (state.lives <= 0) {
        setTimeout(() => showScreen('screen-gameover'), 600);
    } else {
        setTimeout(() => { buildCardGrid(); startTimer(); }, 700);
    }
}

// ── TREASURE ─────────────────────────────────────────────────
function showEndScreen() {
    document.getElementById('treasure-closed').classList.remove('hidden');
    document.getElementById('treasure-open').classList.add('hidden');
    showScreen('screen-end');
    launchConfetti();
}

function openTreasure() {
    document.getElementById('treasure-closed').classList.add('hidden');
    document.getElementById('treasure-open').classList.remove('hidden');
    launchConfetti();
    launchSparkleHearts();
}

// ── HELPERS ──────────────────────────────────────────────────
function renderLives(containerId, count) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = '';
    for (let i = 0; i < 3; i++) {
        const h = document.createElement('span');
        h.className = 'heart-icon' + (i >= count ? ' lost' : '');
        h.textContent = '❤️';
        el.appendChild(h);
    }
}

function spawnFireflies() {
    const container = document.getElementById('fireflies');
    for (let i = 0; i < 22; i++) {
        const f = document.createElement('div');
        f.className = 'firefly';
        f.style.cssText = [
            `left:${Math.random() * 100}vw`,
            `top:${Math.random() * 100}vh`,
            `--dur:${5 + Math.random() * 7}s`,
            `--delay:${Math.random() * 6}s`,
            `--dx:${Math.round((Math.random() - .5) * 220)}px`,
            `--dy:${Math.round((Math.random() - .5) * 220)}px`,
        ].join(';');
        container.appendChild(f);
    }
}

const CONFETTI_COLORS = ['#ff69b4','#ff4500','#ffd700','#7fff00','#00bfff','#da70d6','#ff85a2','#ffe066'];

function launchConfetti() {
    const c = document.getElementById('confetti-container');
    for (let i = 0; i < 90; i++) {
        setTimeout(() => {
            const bit = document.createElement('div');
            bit.className = 'confetti-bit';
            const size = 8 + Math.random() * 9;
            bit.style.cssText = [
                `left:${Math.random() * 100}vw`,
                `top:-15px`,
                `width:${size}px`,
                `height:${size}px`,
                `background:${CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]}`,
                `border-radius:${Math.random() > .45 ? '50%' : '3px'}`,
                `animation-duration:${1.6 + Math.random() * 2}s`,
            ].join(';');
            c.appendChild(bit);
            setTimeout(() => bit.remove(), 4500);
        }, i * 28);
    }
}

function launchSparkleHearts() {
    const EMOJIS = ['❤️','✨','💛','💖','⭐'];
    for (let i = 0; i < 18; i++) {
        setTimeout(() => {
            const s = document.createElement('div');
            s.className = 'sparkle-heart';
            s.style.cssText = [
                `left:${15 + Math.random() * 70}vw`,
                `top:${25 + Math.random() * 45}vh`,
                `font-size:${1.2 + Math.random()}rem`,
            ].join(';');
            s.textContent = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
            document.body.appendChild(s);
            setTimeout(() => s.remove(), 1500);
        }, i * 90);
    }
}

function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}