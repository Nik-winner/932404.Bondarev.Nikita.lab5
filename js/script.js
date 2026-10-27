const STORAGE_KEYS = {
    theme:        'volunteer_theme',
    hidden:       'volunteer_campaigns_hidden',
    custom:       'volunteer_custom_campaigns',
    participated: 'volunteer_participated'
};

function safeGetElement(id) {
    const el = document.getElementById(id);
    if (!el) {
        console.warn(`[safeGetElement] Элемент с id="${id}" не найден.`);
        return null;
    }
    return el;
}

function saveToStorage(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch (err) {
        console.error(`[localStorage] Не удалось сохранить ключ "${key}":`, err);
    }
}

function loadFromStorage(key, fallback = null) {
    try {
        const value = localStorage.getItem(key);
        return value === null ? fallback : value;
    } catch (err) {
        console.error(`[localStorage] Не удалось прочитать ключ "${key}":`, err);
        return fallback;
    }
}

function initThemeToggle() {
    const btn = safeGetElement('themeToggle');
    if (!btn) return;

    const savedTheme = loadFromStorage(STORAGE_KEYS.theme, 'light');
    applyTheme(savedTheme, btn);

    btn.addEventListener('click', () => {
        const isDark = document.body.classList.contains('theme-dark');
        const next = isDark ? 'light' : 'dark';
        applyTheme(next, btn);
        saveToStorage(STORAGE_KEYS.theme, next);
    });
}

function applyTheme(theme, btn) {
    document.body.classList.remove('theme-light', 'theme-dark');
    document.body.classList.add(`theme-${theme}`);
    if (btn) {
        btn.textContent = theme === 'dark' ? '☀️ Светлая тема' : '🌙 Тёмная тема';
    }
}

function initHideCampaigns() {
    const btn = safeGetElement('hideCampaignsBtn');
    const container = safeGetElement('campaignsContainer');
    if (!btn || !container) return;

    const isHidden = loadFromStorage(STORAGE_KEYS.hidden) === 'true';
    if (isHidden) {
        container.style.display = 'none';
        btn.textContent = 'Показать акции';
    }

    btn.addEventListener('click', () => {
        const nowHidden = container.style.display === 'none';
        container.style.display = nowHidden ? '' : 'none';
        btn.textContent = nowHidden ? 'Скрыть акции' : 'Показать акции';
        saveToStorage(STORAGE_KEYS.hidden, nowHidden ? 'false' : 'true');
    });
}

function initAddCampaign() {
    const btn = safeGetElement('addCampaignBtn');
    if (!btn) return;

    btn.addEventListener('click', addCampaign);
}

function addCampaign() {
    const title = prompt('Введите название акции:');
    if (!title || !title.trim()) {
        alert('Название не может быть пустым.');
        return;
    }
    const date = prompt('Введите дату акции (например, 2026-12-01):');
    if (!date || !date.trim()) {
        alert('Дата не может быть пустой.');
        return;
    }
    const description = prompt('Введите описание акции:') || '';

    const campaign = {
        id: 'custom-' + Date.now(),
        title: title.trim(),
        date: date.trim(),
        description: description.trim(),
        participated: false
    };

    const container = safeGetElement('campaignsContainer');
    if (!container) return;

    container.appendChild(buildCampaignCard(campaign));
    persistCustomCampaigns();
}

function buildCampaignCard(campaign) {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.id = campaign.id;

    const h3 = document.createElement('h3');
    h3.textContent = `«${campaign.title}»`;

    const time = document.createElement('time');
    time.className = 'date';
    time.setAttribute('datetime', campaign.date);
    const parsed = new Date(campaign.date);
    time.textContent = isNaN(parsed.getTime())
        ? campaign.date
        : parsed.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

    const desc = document.createElement('p');
    desc.textContent = campaign.description;

    const actions = document.createElement('div');
    actions.className = 'card-actions';

    const partBtn = document.createElement('button');
    partBtn.type = 'button';
    partBtn.className = 'participate-btn' + (campaign.participated ? ' participated' : '');
    partBtn.textContent = campaign.participated ? '✓ Участвовал' : 'Участвовал';

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'delete-btn';
    delBtn.textContent = 'Удалить';

    partBtn.addEventListener('click', () => {
        campaign.participated = !campaign.participated;
        partBtn.classList.toggle('participated', campaign.participated);
        partBtn.textContent = campaign.participated ? '✓ Участвовал' : 'Участвовал';
        persistCustomCampaigns();
    });

    delBtn.addEventListener('click', () => {
        if (confirm(`Удалить акцию «${campaign.title}»?`)) {
            card.remove();
            persistCustomCampaigns();
        }
    });

    actions.appendChild(partBtn);
    actions.appendChild(delBtn);

    card.append(h3, time, desc, actions);
    return card;
}

function persistCustomCampaigns() {
    const container = safeGetElement('campaignsContainer');
    if (!container) return;
    
    const cards = container.querySelectorAll('.card[data-id^="custom-"]');
    const list = [];
    
    cards.forEach(card => {
        const id = card.dataset.id;
        const title = (card.querySelector('h3')?.textContent || '').replace(/[«»]/g, '');
        const date = card.querySelector('time')?.getAttribute('datetime') || '';
        const descEl = card.querySelector('p:not(.date):not(.role)');
        const description = descEl?.textContent || '';
        const participated = card.querySelector('.participate-btn')?.classList.contains('participated') || false;
        list.push({ id, title, date, description, participated });
    });
    
    saveToStorage(STORAGE_KEYS.custom, JSON.stringify(list));
}

function restoreCustomCampaigns() {
    const raw = loadFromStorage(STORAGE_KEYS.custom);
    if (!raw) return;
    
    let campaigns;
    try {
        campaigns = JSON.parse(raw);
    } catch (e) {
        console.error('[restoreCustomCampaigns] Ошибка парсинга JSON:', e);
        return;
    }
    
    const container = safeGetElement('campaignsContainer');
    if (!container) return;
    
    campaigns.forEach(c => container.appendChild(buildCampaignCard(c)));
}

function initParticipateButtons() {
    const container = safeGetElement('campaignsContainer');
    if (!container) return;

    let participated = [];
    try {
        participated = JSON.parse(loadFromStorage(STORAGE_KEYS.participated, '[]'));
    } catch (e) {
        participated = [];
    }

    const existingCards = container.querySelectorAll('.card[data-id^="existing-"]');
    existingCards.forEach(card => {
        const btn = card.querySelector('.participate-btn');
        if (!btn) return;

        const id = card.dataset.id;
        
        if (participated.includes(id)) {
            btn.classList.add('participated');
            btn.textContent = '✓ Участвовал';
        }

        btn.addEventListener('click', () => {
            const nowOn = btn.classList.toggle('participated');
            btn.textContent = nowOn ? '✓ Участвовал' : 'Участвовал';
            saveParticipatedState();
        });
    });

    function saveParticipatedState() {
        const ids = [];
        existingCards.forEach(c => {
            if (c.querySelector('.participate-btn.participated')) {
                ids.push(c.dataset.id);
            }
        });
        saveToStorage(STORAGE_KEYS.participated, JSON.stringify(ids));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initThemeToggle();

    initHideCampaigns();

    initAddCampaign();

    restoreCustomCampaigns();

    initParticipateButtons();
});