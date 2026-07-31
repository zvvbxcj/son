/**
 * SLEEP BANK — Biological Credit Engine
 */

const TARGET_DAILY = 8.0;      // Дневная норма
const MIN_CRITICAL = 3.0;      // Нижний лимит сна без штрафа
const PENALTY_EXTRA = 2.0;     // Штрафной объем
const DEBT_LIMIT = -30.0;      // Лимит банкротства

let state = {
    records: {}, 
    streak: 0,
    penaltyHours: 0,
    currentBalance: 0
};

document.addEventListener('DOMContentLoaded', () => {
    loadState();
    initDatePicker();
    setupEventListeners();
    updateUI();
});

function initDatePicker() {
    const dateInput = document.getElementById('dateInput');
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
}

function setupEventListeners() {
    const slider = document.getElementById('sleepInput');
    const sliderDisplay = document.getElementById('sliderValue');
    const submitBtn = document.getElementById('submitSleepBtn');
    const resetBtn = document.getElementById('resetBtn');

    slider.addEventListener('input', (e) => {
        sliderDisplay.textContent = parseFloat(e.target.value).toFixed(1);
    });

    submitBtn.addEventListener('click', () => {
        const date = document.getElementById('dateInput').value;
        const hours = parseFloat(slider.value);
        if (!date) return alert('Укажите дату транзакции!');
        saveSleepEntry(date, hours);
    });

    resetBtn.addEventListener('click', () => {
        if (confirm('Обнулить всю историю Sleep Bank?')) {
            localStorage.clear();
            state = { records: {}, streak: 0, penaltyHours: 0, currentBalance: 0 };
            updateUI();
        }
    });
}

function setPreset(hours) {
    const slider = document.getElementById('sleepInput');
    const sliderDisplay = document.getElementById('sliderValue');
    slider.value = hours;
    sliderDisplay.textContent = hours.toFixed(1);
}

function saveSleepEntry(dateStr, hours) {
    let penalty = 0;
    if (hours < MIN_CRITICAL) {
        penalty = PENALTY_EXTRA;
    }

    state.records[dateStr] = {
        hours: hours,
        penalty: penalty,
        timestamp: new Date(dateStr).getTime()
    };

    recalculateGlobalState();
    saveState();
    updateUI();
}

function recalculateGlobalState() {
    let totalBalance = 0;
    let totalPenalty = 0;
    let currentStreak = 0;

    const sortedDates = Object.keys(state.records).sort();

    sortedDates.forEach(date => {
        const rec = state.records[date];
        const h = rec.hours;

        if (h >= TARGET_DAILY) {
            const surplus = h - TARGET_DAILY;
            if (totalBalance < 0) {
                totalBalance = Math.min(0, totalBalance + surplus);
            }
            currentStreak += 1;
        } else if (h >= MIN_CRITICAL) {
            totalBalance -= (TARGET_DAILY - h);
            currentStreak = 0;
        } else {
            const deficit = (TARGET_DAILY - h) + rec.penalty;
            totalBalance -= deficit;
            totalPenalty += rec.penalty;
            currentStreak = 0;
        }
    });

    state.streak = currentStreak;
    state.penaltyHours = totalPenalty;
    state.currentBalance = totalBalance;
}

function updateUI() {
    const balanceDisplay = document.getElementById('balanceDisplay');
    const balanceSign = document.getElementById('balanceSign');
    const statusMessage = document.getElementById('statusMessage');
    const ratingTag = document.getElementById('ratingTag');
    const batteryFill = document.getElementById('batteryFill');
    const batteryPercent = document.getElementById('batteryPercent');
    const streakCount = document.getElementById('streakCount');
    const monthlyProgress = document.getElementById('monthlyProgress');
    const penaltyDisplay = document.getElementById('penaltyDisplay');

    const b = state.currentBalance || 0;
    
    // Форматирование цифры баланса
    balanceSign.textContent = b > 0 ? '+' : '';
    balanceDisplay.textContent = b.toFixed(1);
    // Расчет процента аккумулятора (0% - 100%)
    let batVal = Math.round(((b - DEBT_LIMIT) / (0 - DEBT_LIMIT)) * 100);
    batVal = Math.max(5, Math.min(100, batVal));
    batteryPercent.textContent = `${batVal}%`;
    batteryFill.style.width = `${batVal}%`;

    // Финтех-статусы и подсветка
    if (b >= 0) {
        balanceDisplay.style.color = 'var(--neon-green)';
        batteryFill.style.backgroundColor = 'var(--neon-green)';
        batteryFill.style.boxShadow = '0 0 12px var(--neon-green-glow)';
        ratingTag.textContent = 'AAA PLATINUM';
        ratingTag.style.color = 'var(--neon-green)';
        ratingTag.style.borderColor = 'var(--neon-green)';
        ratingTag.style.background = 'rgba(0, 255, 157, 0.12)';
        statusMessage.textContent = '⚡ Мозг в идеальном состоянии. Ресурс ЦНС на максимуме!';
    } else if (b >= -10.0) {
        balanceDisplay.style.color = 'var(--neon-amber)';
        batteryFill.style.backgroundColor = 'var(--neon-amber)';
        batteryFill.style.boxShadow = '0 0 12px var(--neon-amber-glow)';
        ratingTag.textContent = 'BBB CREDIT';
        ratingTag.style.color = 'var(--neon-amber)';
        ratingTag.style.borderColor = 'var(--neon-amber)';
        ratingTag.style.background = 'rgba(255, 183, 3, 0.12)';
        statusMessage.textContent = '⚠️ Небольшой овердрафт. Рекомендуется закрыть долг за 48 часов.';
    } else {
        balanceDisplay.style.color = 'var(--neon-red)';
        batteryFill.style.backgroundColor = 'var(--neon-red)';
        batteryFill.style.boxShadow = '0 0 12px var(--neon-red-glow)';
        ratingTag.textContent = 'DEFAULTS WARNING';
        ratingTag.style.color = 'var(--neon-red)';
        ratingTag.style.borderColor = 'var(--neon-red)';
        ratingTag.style.background = 'rgba(255, 51, 102, 0.12)';
        statusMessage.textContent = '💀 КРИТИЧЕСКИЙ ДЕФИЦИТ! Ткани и ЦНС работают на износ. Требуется отсып!';
    }

    streakCount.textContent = state.streak;

    let totalMonth = 0;
    Object.values(state.records).forEach(r => totalMonth += r.hours);
    monthlyProgress.textContent = `${totalMonth.toFixed(0)} / 240 ч`;
    penaltyDisplay.textContent = `${state.penaltyHours.toFixed(1)} ч`;

    renderCalendar();
    renderHistory();
}

function renderCalendar() {
    const grid = document.getElementById('calendarGrid');
    grid.innerHTML = '';

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    const monthNames = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
    document.getElementById('calendarMonthTitle').textContent = `${monthNames[month]}${year}`;

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let shift = firstDay === 0 ? 6 : firstDay - 1;

    for (let i = 0; i < shift; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'matrix-cell empty';
        grid.appendChild(emptyCell);
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const cell = document.createElement('div');
        cell.className = 'matrix-cell';
        
        const dateFormatted = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        cell.textContent = d;

        if (state.records[dateFormatted]) {
            const h = state.records[dateFormatted].hours;
            const sub = document.createElement('span');
            sub.className = 'cell-hours';
            sub.textContent = `${h}h`;
            cell.appendChild(sub);

            if (h >= TARGET_DAILY) cell.classList.add('status-green');
            else if (h >= MIN_CRITICAL) cell.classList.add('status-amber');
            else cell.classList.add('status-red');
        }

        cell.addEventListener('click', () => {
            document.getElementById('dateInput').value = dateFormatted;
            if (state.records[dateFormatted]) {
                setPreset(state.records[dateFormatted].hours);
            }
        });
grid.appendChild(cell);
    }
}

function renderHistory() {
    const list = document.getElementById('historyList');
    list.innerHTML = '';

    const sortedDates = Object.keys(state.records).sort().reverse();

    if (sortedDates.length === 0) {
        list.innerHTML = '<div class="empty-state">Операций пока нет. Внесите первый депозит!</div>';
        return;
    }

    sortedDates.forEach(dateStr => {
        const rec = state.records[dateStr];
        const div = document.createElement('div');
        div.className = 'history-card-item';
        
        let color = 'var(--neon-green)';
        let tagText = 'УСПЕХ';
        if (rec.hours < TARGET_DAILY) { color = 'var(--neon-amber)'; tagText = 'ДЕФИЦИТ'; }
        if (rec.hours < MIN_CRITICAL) { color = 'var(--neon-red)'; tagText = 'ШТРАФ'; }

        div.innerHTML = `
    <div>
        <strong>${rec.hours.toFixed(1)} ч сна</strong>
        <div class="history-date-sub">${dateStr}${rec.penalty > 0 ? '<span style="color:var(--neon-red)">(+2ч штраф)</span>' : ''}</div>
    </div>
    <div class="history-tag" style="color: ${color}">
        ${tagText}
    </div>
`;
        list.appendChild(div);
    });
}

function saveState() {
    localStorage.setItem('sleep_bank_v3', JSON.stringify(state));
}

function loadState() {
    const saved = localStorage.getItem('sleep_bank_v3');
    if (saved) {
        state = JSON.parse(saved);
        recalculateGlobalState();
    }
}