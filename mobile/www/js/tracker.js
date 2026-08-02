// --- Cycle Calculations & UI Updates (English translated) ---
function updateCycleDashboard() {
    if (cycles.length === 0) {
        // Empty State Dashboard
        document.getElementById('cycle-day-number').innerText = '--';
        document.getElementById('cycle-phase-name').innerText = 'No records';
        document.getElementById('cycle-phase-desc').innerText = 'Start a period to begin tracking';
        document.getElementById('next-period-prediction').innerText = 'Add some history';
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
    const hasActivePeriod = !latestCycle.endDate;
    updateLogButtonState(hasActivePeriod);

    if (cycleDay < 1) {
        // Future logged cycle? Reset gracefully
        document.getElementById('cycle-day-number').innerText = '1';
        document.getElementById('cycle-phase-name').innerText = 'Expected';
        document.getElementById('cycle-phase-desc').innerText = 'Period will start soon';
        setProgress(0);
    } else {
        document.getElementById('cycle-day-number').innerText = cycleDay;
        
        let phase = '';
        let desc = '';
        let percentage = (cycleDay / settings.cycleLength) * 100;
        
        // Menstruation phase (first N days)
        if (cycleDay <= settings.periodLength) {
            phase = 'Menstrual Phase';
            desc = 'Pregnancy chance: Low';
        } 
        // Follicular phase
        else if (cycleDay <= 11) {
            phase = 'Follicular Phase';
            desc = 'Pregnancy chance: Low-Medium';
        }
        // Ovulatory phase (around Day 12-16)
        else if (cycleDay >= 12 && cycleDay <= 16) {
            phase = 'Ovulatory Phase';
            desc = 'Pregnancy chance: HIGH';
        }
        // Luteal phase
        else if (cycleDay > 16 && cycleDay <= settings.cycleLength) {
            phase = 'Luteal Phase';
            desc = 'Pregnancy chance: Low';
        }
        // Cycle overflow (period is late)
        else {
            phase = 'Late';
            desc = 'Period expected';
            percentage = 100;
        }

        document.getElementById('cycle-phase-name').innerText = phase;
        document.getElementById('cycle-phase-desc').innerText = desc;
        setProgress(Math.min(percentage, 100));
    }

    // Prediction of Next Period
    let nextPeriodDate = new Date(start);
    nextPeriodDate.setDate(nextPeriodDate.getDate() + settings.cycleLength);
    
    // Format the date nicely in English
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    const dateFormatted = nextPeriodDate.toLocaleDateString('en-US', options);
    
    const daysUntilNext = Math.ceil((nextPeriodDate - today) / (1000 * 60 * 60 * 24));
    
    if (daysUntilNext > 0) {
        document.getElementById('next-period-prediction').innerText = `${dateFormatted} (${daysUntilNext} days later)`;
    } else if (daysUntilNext === 0) {
        document.getElementById('next-period-prediction').innerText = `Expected today!`;
    } else {
        document.getElementById('next-period-prediction').innerText = `${Math.abs(daysUntilNext)} days late`;
    }
}

// Function to set the progress circle path offset
function setProgress(percent) {
    const circle = document.getElementById('progress-indicator');
    if (!circle) return;
    const radius = circle.r.baseVal.value;
    const circumference = radius * 2 * Math.PI;
    
    const offset = circumference - (percent / 100) * circumference;
    circle.style.strokeDashoffset = offset;
}

// Updates the period action button
function updateLogButtonState(isActive) {
    const btn = document.getElementById('btn-log-period');
    const text = document.getElementById('log-period-text');
    if (!btn || !text) return;
    
    if (isActive) {
        btn.classList.add('active-period');
        text.innerText = 'End Period';
    } else {
        btn.classList.remove('active-period');
        text.innerText = 'Start Period';
    }
}

// --- Period Action Events (Logging) ---
function setupPeriodLogging() {
    const btn = document.getElementById('btn-log-period');
    if (!btn) return;
    
    btn.addEventListener('click', () => {
        cycles.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
        const latestCycle = cycles[0];

        if (latestCycle && !latestCycle.endDate) {
            // End active period
            latestCycle.endDate = todayStr;
            localStorage.setItem('rubra_cycles', JSON.stringify(cycles));
            showToast('Period ended.');
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
            showToast('New period started.');
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

    // Reset mood selections first
    moodBtns.forEach(b => b.classList.remove('selected'));
    if (todayLog.mood) {
        const activeMoodBtn = document.querySelector(`.mood-btn[data-mood="${todayLog.mood}"]`);
        if (activeMoodBtn) activeMoodBtn.classList.add('selected');
    }

    // Reset symptom selections first
    chips.forEach(c => c.classList.remove('selected'));
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

// --- History Page Renderer (English) ---
function renderHistory() {
    const container = document.getElementById('history-container');
    if (!container) return;
    
    if (cycles.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No records yet.</p>
                <span class="empty-hint">Tap Start Period to log your first cycle.</span>
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
        
        let dateText = start.toLocaleDateString('en-US', options);
        let durationText = '';
        let metaText = '';

        if (cycle.endDate) {
            const end = new Date(cycle.endDate);
            dateText += ` - ${end.toLocaleDateString('en-US', options)}`;
            
            const diff = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
            durationText = `${diff} days`;
        } else {
            dateText += ' - ongoing';
            durationText = 'Active';
        }

        // Calculate cycle length (from this cycle start to previous cycle start)
        if (index < cycles.length - 1) {
            const prevStart = new Date(cycles[index + 1].startDate);
            const cycleLenDays = Math.floor((start - prevStart) / (1000 * 60 * 60 * 24));
            metaText = `Cycle: ${cycleLenDays} days`;
        } else {
            metaText = 'First recorded cycle';
        }

        // Fetch moods/symptoms logged during this cycle (simple preview of start date)
        const dayLog = dailyLogs[cycle.startDate] || {};
        let badgesHtml = '';
        if (dayLog.mood) {
            const emojis = { happy: '😊', calm: '😌', tired: '😴', sad: '😢', irritated: '😠' };
            badgesHtml += `<span class="history-badge">${emojis[dayLog.mood] || '😐'}</span>`;
        }
        if (dayLog.symptoms && dayLog.symptoms.length > 0) {
            badgesHtml += `<span class="history-badge">+${dayLog.symptoms.length} Symptoms</span>`;
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
                <button class="icon-button delete-btn" data-id="${cycle.id}" style="border-color: rgba(255,0,0,0.15); color: #ff4d6d;" title="Delete">
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
    if (confirm('Are you sure you want to delete this cycle record?')) {
        cycles = cycles.filter(c => c.id !== id);
        localStorage.setItem('rubra_cycles', JSON.stringify(cycles));
        showToast('Record deleted.');
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

    if (!cycleSlider || !periodSlider) return;

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
