// --- State and Default Values ---
let settings = {
    cycleLength: 28,
    periodLength: 5
};

let cycles = [];
let dailyLogs = {};

// Helper to format date as YYYY-MM-DD
function getLocalDateString(date) {
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
}

const todayStr = getLocalDateString(new Date());

// --- Initializing App Data ---
function initData() {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('rubra_settings');
    if (savedSettings) {
        settings = JSON.parse(savedSettings);
    }

    // Load daily logs from localStorage
    const savedDailyLogs = localStorage.getItem('rubra_daily_logs');
    if (savedDailyLogs) {
        dailyLogs = JSON.parse(savedDailyLogs);
    }

    // Load cycles from localStorage
    const savedCycles = localStorage.getItem('rubra_cycles');
    if (savedCycles) {
        cycles = JSON.parse(savedCycles);
    } else {
        // First launch: Pre-populate mock cycles for a premium demonstration experience
        const mockCycles = [
            {
                id: 1,
                startDate: getOffsetDateString(-40),
                endDate: getOffsetDateString(-35)
            },
            {
                id: 2,
                startDate: getOffsetDateString(-12),
                endDate: getOffsetDateString(-8) // Period ended 8 days ago, cycle day 12 today
            }
        ];
        cycles = mockCycles;
        localStorage.setItem('rubra_cycles', JSON.stringify(cycles));

        // Pre-populate some daily logs for the current cycle
        dailyLogs[getOffsetDateString(-12)] = { mood: 'sad', symptoms: ['cramps', 'fatigue'] };
        dailyLogs[getOffsetDateString(-11)] = { mood: 'tired', symptoms: ['cramps', 'bloating'] };
        dailyLogs[getOffsetDateString(0)] = { mood: 'happy', symptoms: [] }; // Today
        localStorage.setItem('rubra_daily_logs', JSON.stringify(dailyLogs));
    }

    // Sync input sliders with values
    document.getElementById('input-cycle-len').value = settings.cycleLength;
    document.getElementById('val-cycle-len').innerText = settings.cycleLength;
    
    document.getElementById('input-period-len').value = settings.periodLength;
    document.getElementById('val-period-len').innerText = settings.periodLength;
}

// Helper to get date relative to today (e.g. -12 days)
function getOffsetDateString(daysOffset) {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    return getLocalDateString(d);
}

// --- Navigation Handler ---
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.app-page');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetPage = item.getAttribute('data-page');

            navItems.forEach(nav => nav.classList.remove('active'));
            pages.forEach(page => page.classList.remove('active'));

            item.classList.add('active');
            document.getElementById(`page-${targetPage}`).classList.add('active');

            if (targetPage === 'history') {
                renderHistory();
            }
        });
    });
}

// --- Cycle Calculations & UI Updates ---
function updateCycleDashboard() {
    if (cycles.length === 0) {
        // Empty State Dashboard
        document.getElementById('cycle-day-number').innerText = '--';
        document.getElementById('cycle-phase-name').innerText = 'Məlumat yoxdur';
        document.getElementById('cycle-phase-desc').innerText = 'Periodu qeyd edərək başlayın';
        document.getElementById('next-period-prediction').innerText = 'Tarixçə əlavə edin';
        setProgress(0);
        updateLogButtonState(false);
        return;
    }

    // Find the latest cycle
    // Sort descending by startDate
    cycles.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
    const latestCycle = cycles[0];
    
    const start = new Date(latestCycle.startDate);
    const today = new Date(todayStr);
    
    // Difference in days
    const diffTime = today - start;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const cycleDay = diffDays + 1; // 1-indexed

    // Check if period is active (still bleeding or inside the standard period duration)
    // If the latest cycle does not have an endDate, or today is within the standard period duration since start date
    const hasActivePeriod = !latestCycle.endDate;
    updateLogButtonState(hasActivePeriod);

    if (cycleDay < 1) {
        // Future logged cycle? Reset gracefully
        document.getElementById('cycle-day-number').innerText = '1';
        document.getElementById('cycle-phase-name').innerText = 'Gözlənilir';
        document.getElementById('cycle-phase-desc').innerText = 'Period yaxında başlayacaq';
        setProgress(0);
    } else {
        document.getElementById('cycle-day-number').innerText = cycleDay;
        
        let phase = '';
        let desc = '';
        let percentage = (cycleDay / settings.cycleLength) * 100;
        
        // Menstruation phase (first N days)
        if (cycleDay <= settings.periodLength) {
            phase = 'Menstruasiya Fazası';
            desc = 'Hamiləlik şansı: Aşağı';
        } 
        // Follicular phase
        else if (cycleDay <= 11) {
            phase = 'Follikulyar Faza';
            desc = 'Hamiləlik şansı: Aşağı-Orta';
        }
        // Ovulatory phase (around Day 12-16)
        else if (cycleDay >= 12 && cycleDay <= 16) {
            phase = 'Ovulyasiya Fazası';
            desc = 'Hamiləlik şansı: YÜKSƏK';
        }
        // Luteal phase
        else if (cycleDay > 16 && cycleDay <= settings.cycleLength) {
            phase = 'Luteal Faza';
            desc = 'Hamiləlik şansı: Aşağı';
        }
        // Cycle overflow (period is late)
        else {
            phase = 'Gecikmə';
            desc = 'Period gözlənilir';
            percentage = 100;
        }

        document.getElementById('cycle-phase-name').innerText = phase;
        document.getElementById('cycle-phase-desc').innerText = desc;
        setProgress(Math.min(percentage, 100));
    }

    // Prediction of Next Period
    let nextPeriodDate = new Date(start);
    nextPeriodDate.setDate(nextPeriodDate.getDate() + settings.cycleLength);
    
    // Format the date nicely in Azerbaijani
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    const dateFormatted = nextPeriodDate.toLocaleDateString('az-AZ', options);
    
    const daysUntilNext = Math.ceil((nextPeriodDate - today) / (1000 * 60 * 60 * 24));
    
    if (daysUntilNext > 0) {
        document.getElementById('next-period-prediction').innerText = `${dateFormatted} (növbəti ${daysUntilNext} gündən sonra)`;
    } else if (daysUntilNext === 0) {
        document.getElementById('next-period-prediction').innerText = `Bu gün gözlənilir!`;
    } else {
        document.getElementById('next-period-prediction').innerText = `${Math.abs(daysUntilNext)} gün gecikmə`;
    }
}

// Function to set the progress circle path offset
function setProgress(percent) {
    const circle = document.getElementById('progress-indicator');
    const radius = circle.r.baseVal.value;
    const circumference = radius * 2 * Math.PI;
    
    const offset = circumference - (percent / 100) * circumference;
    circle.style.strokeDashoffset = offset;
}

// Updates the period action button
function updateLogButtonState(isActive) {
    const btn = document.getElementById('btn-log-period');
    const text = document.getElementById('log-period-text');
    
    if (isActive) {
        btn.classList.add('active-period');
        text.innerText = 'Periodu Bitir';
    } else {
        btn.classList.remove('active-period');
        text.innerText = 'Periodu Başlat';
    }
}

// --- Period Action Events (Logging) ---
function setupPeriodLogging() {
    const btn = document.getElementById('btn-log-period');
    
    btn.addEventListener('click', () => {
        cycles.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
        const latestCycle = cycles[0];

        if (latestCycle && !latestCycle.endDate) {
            // End active period
            latestCycle.endDate = todayStr;
            localStorage.setItem('rubra_cycles', JSON.stringify(cycles));
            showToast('Period bitirildi.');
        } else {
            // Start a new period
            const newId = cycles.length > 0 ? Math.max(...cycles.map(c => c.id)) + 1 : 1;
            const newCycle = {
                id: newId,
                startDate: todayStr,
                endDate: null
            };
            cycles.push(newCycle);
            localStorage.setItem('rubra_cycles', JSON.stringify(cycles));
            showToast('Yeni period başladıldı.');
        }
        
        updateCycleDashboard();
        renderHistory();
    });
}

// --- Mood & Symptom Logger Tracker ---
function setupDailyLogger() {
    const moodBtns = document.querySelectorAll('.mood-btn');
    const chips = document.querySelectorAll('.chip');

    // Load today's log if it exists
    const todayLog = dailyLogs[todayStr] || { mood: null, symptoms: [] };

    if (todayLog.mood) {
        const activeMoodBtn = document.querySelector(`.mood-btn[data-mood="${todayLog.mood}"]`);
        if (activeMoodBtn) activeMoodBtn.classList.add('selected');
    }

    if (todayLog.symptoms && todayLog.symptoms.length > 0) {
        todayLog.symptoms.forEach(sym => {
            const chip = document.querySelector(`.chip[data-symptom="${sym}"]`);
            if (chip) chip.classList.add('selected');
        });
    }

    // Mood click handler
    moodBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const mood = btn.getAttribute('data-mood');
            
            // Toggle selection
            if (btn.classList.contains('selected')) {
                btn.classList.remove('selected');
                saveDailyLog('mood', null);
            } else {
                moodBtns.forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                saveDailyLog('mood', mood);
            }
        });
    });

    // Symptom click handler
    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            const symptom = chip.getAttribute('data-symptom');
            chip.classList.toggle('selected');

            // Collect all selected symptoms
            const selectedChips = document.querySelectorAll('.chip.selected');
            const symptoms = Array.from(selectedChips).map(c => c.getAttribute('data-symptom'));
            
            saveDailyLog('symptoms', symptoms);
        });
    });
}

function saveDailyLog(key, value) {
    if (!dailyLogs[todayStr]) {
        dailyLogs[todayStr] = { mood: null, symptoms: [] };
    }
    
    dailyLogs[todayStr][key] = value;
    localStorage.setItem('rubra_daily_logs', JSON.stringify(dailyLogs));
}

// --- History Page Renderer ---
function renderHistory() {
    const container = document.getElementById('history-container');
    
    if (cycles.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>Hələ heç bir qeyd yoxdur.</p>
                <span class="empty-hint">Periodu Başlat düyməsinə klikləyərək ilk tsikli qeyd edin.</span>
            </div>
        `;
        return;
    }

    // Sort descending by startDate
    cycles.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
    
    container.innerHTML = '';
    
    cycles.forEach((cycle, index) => {
        const start = new Date(cycle.startDate);
        const options = { day: 'numeric', month: 'short' };
        
        let dateText = start.toLocaleDateString('az-AZ', options);
        let durationText = '';
        let metaText = '';

        if (cycle.endDate) {
            const end = new Date(cycle.endDate);
            dateText += ` - ${end.toLocaleDateString('az-AZ', options)}`;
            
            const diff = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
            durationText = `${diff} gün`;
        } else {
            dateText += ' - davam edir';
            durationText = 'Aktiv';
        }

        // Calculate cycle length (from this cycle start to previous cycle start)
        // Since list is descending, the previous cycle in chronological order is at index + 1
        if (index < cycles.length - 1) {
            const prevStart = new Date(cycles[index + 1].startDate);
            const cycleLenDays = Math.floor((start - prevStart) / (1000 * 60 * 60 * 24));
            metaText = `Tsikl: ${cycleLenDays} gün`;
        } else {
            metaText = 'İlk qeydə alınmış tsikl';
        }

        // Fetch moods/symptoms logged during this cycle (simple preview of start date)
        const dayLog = dailyLogs[cycle.startDate] || {};
        let badgesHtml = '';
        if (dayLog.mood) {
            const emojis = { happy: '😊', calm: '😌', tired: '😴', sad: '😢', irritated: '😠' };
            badgesHtml += `<span class="history-badge">${emojis[dayLog.mood] || '😐'}</span>`;
        }
        if (dayLog.symptoms && dayLog.symptoms.length > 0) {
            badgesHtml += `<span class="history-badge">+${dayLog.symptoms.length} Simptom</span>`;
        }

        const item = document.createElement('div');
        item.className = 'history-item';
        item.innerHTML = `
            <div class="history-info">
                <div class="history-date">${dateText}</div>
                <div class="history-meta">${metaText}</div>
                <div class="history-tags">${badgesHtml}</div>
            </div>
            <div style="display: flex; align-items: center; gap: 12px;">
                <span class="history-duration">${durationText}</span>
                <button class="icon-button delete-btn" data-id="${cycle.id}" style="border-color: rgba(255,0,0,0.15); color: #ff4d6d;" title="Sil">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            </div>
        `;
        container.appendChild(item);
    });

    // Add delete listeners
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(btn.getAttribute('data-id'));
            deleteCycle(id);
        });
    });
}

function deleteCycle(id) {
    if (confirm('Bu tsikl qeydini silmək istədiyinizdən əminsiniz?')) {
        cycles = cycles.filter(c => c.id !== id);
        localStorage.setItem('rubra_cycles', JSON.stringify(cycles));
        showToast('Qeyd silindi.');
        renderHistory();
        updateCycleDashboard();
    }
}

// --- Settings Section Events ---
function setupSettings() {
    const cycleSlider = document.getElementById('input-cycle-len');
    const cycleVal = document.getElementById('val-cycle-len');
    const periodSlider = document.getElementById('input-period-len');
    const periodVal = document.getElementById('val-period-len');

    cycleSlider.addEventListener('input', () => {
        settings.cycleLength = parseInt(cycleSlider.value);
        cycleVal.innerText = settings.cycleLength;
        saveSettings();
    });

    periodSlider.addEventListener('input', () => {
        settings.periodLength = parseInt(periodSlider.value);
        periodVal.innerText = settings.periodLength;
        saveSettings();
    });
}

function saveSettings() {
    localStorage.setItem('rubra_settings', JSON.stringify(settings));
    updateCycleDashboard();
}

// --- Toast / Notification Helper ---
function showToast(message) {
    // Remove existing toast if present
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.cssText = `
        position: fixed;
        bottom: 90px;
        left: 50%;
        transform: translateX(-50%) translateY(20px);
        background: rgba(255, 117, 143, 0.95);
        color: white;
        padding: 10px 20px;
        border-radius: 12px;
        font-size: 13px;
        font-weight: 500;
        z-index: 1000;
        box-shadow: 0 4px 15px rgba(0,0,0,0.25);
        opacity: 0;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    `;
    toast.innerText = message;
    document.body.appendChild(toast);

    // Fade in
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
    }, 10);

    // Fade out and remove
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(10px)';
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

// --- App Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    initData();
    setupNavigation();
    setupPeriodLogging();
    setupDailyLogger();
    setupSettings();
    
    // Initial Dashboard calculations
    updateCycleDashboard();
});
