/**
 * SLEEP BANK — Математическое ядро и Геймификация
 */

const TARGET_DAILY = 8.0;      // Норма в день
const MIN_CRITICAL = 3.0;      // Аварийный порог
const PENALTY_EXTRA = 2.0;     // Штраф за бессонницу (< 3ч)
const DEBT_LIMIT = -30.0;      // Предел банкротства

// Состояние приложения
let state = {
    balance: 0.0,              // Баланс (+ или -)
    totalMonthHours: 0.0,      // Накоплено за месяц
    penaltyHours: 0.0,         // Всего штрафов начислено
    streak: 0,                 // Стрик дней
    history: []                // История транзакций
};

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    loadState();
    setupEventListeners();
    updateUI();
});

// Настройка кнопок и слайдера
function setupEventListeners() {
    const slider = document.getElementById('sleepInput');
    const sliderDisplay = document.getElementById('sliderValue');
    const submitBtn = document.getElementById('submitSleepBtn');
    const resetBtn = document.getElementById('resetBtn');

    slider.addEventListener('input', (e) => {
        sliderDisplay.textContent = parseFloat(e.target.value).toFixed(1);
    });

    submitBtn.addEventListener('click', () => {
        const hours = parseFloat(slider.value);
        depositSleep(hours);
    });

    resetBtn.addEventListener('click', () => {
        if (confirm('Сбросить всю историю и начать заново?')) {
            localStorage.clear();
            state = { balance: 0.0, totalMonthHours: 0.0, penaltyHours: 0.0, streak: 0, history: [] };
            updateUI();
        }
    });
}

// Установка пресетов
function setPreset(hours) {
    const slider = document.getElementById('sleepInput');
    const sliderDisplay = document.getElementById('sliderValue');
    slider.value = hours;
    sliderDisplay.textContent = hours.toFixed(1);
}

// ОСНОВНАЯ ЛОГИКА ДЕПОЗИТА
function depositSleep(hours) {
    let delta = 0;
    let penalty = 0;
    let type = 'normal';

    if (hours >= TARGET_DAILY) {
        // Превышение или норма: гасит долг (если есть), пересон сверх 0 баланса сгорает
        const surplus = hours - TARGET_DAILY;
        if (state.balance < 0) {
            state.balance = Math.min(0, state.balance + surplus);
        }
        state.streak += 1;
        type = 'success';
    } else if (hours >= MIN_CRITICAL) {
        // Умеренный долг (от 3 до 8 часов)
        delta = TARGET_DAILY - hours;
        state.balance -= delta;
        state.streak = 0; // Стрик сброшен
        type = 'warning';
    } else {
        // КРИТИЧЕСКИЙ ДЕФИЦИТ (< 3 часов или 0)
        // Включается аварийный штраф +2 часа невозвратного долга
        const baseDeficit = TARGET_DAILY - hours;
        penalty = PENALTY_EXTRA;
        delta = baseDeficit + penalty;
        
        state.balance -= delta;
        state.penaltyHours += penalty;
        state.streak = 0;
        type = 'danger';
    }

    state.totalMonthHours += hours;

    // Запись в историю
    const entry = {
        id: Date.now(),
        date: new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
        hours: hours,
        balanceAfter: state.balance,
        penalty: penalty,
        type: type
    };

    state.history.unshift(entry);
    saveState();
    updateUI();
}

// ОБНОВЛЕНИЕ ИНТЕРФЕЙСА (UI)
function updateUI() {
    const balanceDisplay = document.getElementById('balanceDisplay');
    const statusMessage = document.getElementById('statusMessage');
    const ratingTag = document.getElementById('ratingTag');
    const creditBarFill = document.getElementById('creditBarFill');
    const streakCount = document.getElementById('streakCount');
    const monthlyProgress = document.getElementById('monthlyProgress');
    const penaltyDisplay = document.getElementById('penaltyDisplay');

    // 1. Отображение Баланса
    const b = state.balance;
    balanceDisplay.textContent = (b > 0 ? '+' : '') + b.toFixed(1);
// 2. Цветовая гамма и психологические статусы
    if (b >= 0) {
        balanceDisplay.style.color = 'var(--accent-green)';
        ratingTag.textContent = 'AAA+ ИДЕАЛ';
        ratingTag.style.background = 'rgba(16, 185, 129, 0.15)';
        ratingTag.style.color = 'var(--accent-green)';
        ratingTag.style.borderColor = 'var(--accent-green)';
        statusMessage.textContent = '🟢 Мозг полностью очищен. Высокий уровень дофамина и концентрации!';
    } else if (b >= -10.0) {
        balanceDisplay.style.color = 'var(--accent-gold)';
        ratingTag.textContent = 'BBB КРЕДИТОР';
        ratingTag.style.background = 'rgba(245, 158, 11, 0.15)';
        ratingTag.style.color = 'var(--accent-gold)';
        ratingTag.style.borderColor = 'var(--accent-gold)';
        statusMessage.textContent = '🟡 Мелкий долг сна. Компенсируйте за ближайшие 48 часов, чтобы не просесть.';
    } else if (b > DEBT_LIMIT) {
        balanceDisplay.style.color = 'var(--accent-red)';
        ratingTag.textContent = 'C- ДЕФИЦИТ';
        ratingTag.style.background = 'rgba(239, 68, 68, 0.15)';
        ratingTag.style.color = 'var(--accent-red)';
        ratingTag.style.borderColor = 'var(--accent-red)';
        statusMessage.textContent = '🔴 Высокая инерция сна! ЦНС работает на износ. Требуется срочный доспать!';
    } else {
        balanceDisplay.style.color = 'var(--accent-red)';
        ratingTag.textContent = 'F БАНКРОТСТВО';
        ratingTag.style.background = 'var(--accent-red)';
        ratingTag.style.color = '#fff';
        statusMessage.textContent = '💀 СИСТЕМНЫЙ ДЕФОЛТ! Иммунитет и мозг в критической зоне. Отложите дела!';
    }

    // 3. Прогресс-бар
    // Диапазон от -30 до 0
    let percentage = ((b - DEBT_LIMIT) / (0 - DEBT_LIMIT)) * 100;
    percentage = Math.max(5, Math.min(100, percentage));
    creditBarFill.style.width = ${percentage}%;

    if (b >= 0) {
        creditBarFill.style.backgroundColor = 'var(--accent-green)';
    } else if (b >= -10) {
        creditBarFill.style.backgroundColor = 'var(--accent-gold)';
    } else {
        creditBarFill.style.backgroundColor = 'var(--accent-red)';
    }

    // 4. Дополнительные метрики
    streakCount.textContent = state.streak;
    monthlyProgress.textContent = ${state.totalMonthHours.toFixed(0)} / 240 ч;
    penaltyDisplay.textContent = ${state.penaltyHours.toFixed(1)} ч;

    // 5. Рендер истории
    renderHistory();
}

// Рендер Списка Истории
function renderHistory() {
    const list = document.getElementById('historyList');
    list.innerHTML = '';

    if (state.history.length === 0) {
        list.innerHTML = '<div class="empty-state">История пуста. Внесите первый депозит!</div>';
        return;
    }

    state.history.forEach(item => {
        const div = document.createElement('div');
        div.className = 'history-item';
        
        let color = 'var(--accent-green)';
        let sign = '+';
        if (item.type === 'warning') color = 'var(--accent-gold)';
        if (item.type === 'danger') { color = 'var(--accent-red)'; sign = ''; }

        div.innerHTML = 
            <div>
                <strong>${item.hours.toFixed(1)} ч сна</strong>
                <div class="history-date">${item.date} ${item.penalty > 0 ? <span style="color:var(--accent-red)">(+${item.penalty}ч штраф)</span> : ''}</div>
            </div>
            <div class="history-badge" style="color: ${color}">
                Баланс: ${item.balanceAfter.toFixed(1)}ч
            </div>
        ;
        list.appendChild(div);
    });
}

// Сохранение в LocalStorage
function saveState() {
    localStorage.setItem('sleep_bank_state', JSON.stringify(state));
}

// Загрузка из LocalStorage
function loadState() {
    const saved = localStorage.getItem('sleep_bank_state');
    if (saved) {
        state = JSON.parse(saved);
    }
}