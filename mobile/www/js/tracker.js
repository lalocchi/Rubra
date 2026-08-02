// --- Cycle Calculations & UI Updates ---
function updateCycleDashboard() {
    const phaseNameEl = document.getElementById('cycle-phase-name');
    const daysLeftEl = document.getElementById('cycle-days-left-text');
    if (!phaseNameEl || !daysLeftEl) return;

    if (cycles.length === 0) {
        phaseNameEl.innerText = 'No records';
        daysLeftEl.innerHTML = 'Add cycle history<br><strong>to begin prediction</strong>';
        return;
    }

    // Sort cycles descending by startDate
    cycles.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
    const latestCycle = cycles[0];
    
    const start = new Date(latestCycle.startDate);
    const today = new Date(todayStr);
    
    // Difference in days from start date to today
    const diffTime = today - start;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const cycleDay = diffDays + 1; // 1-indexed

    // Determine current cycle phase
    let phase = '';
    
    if (cycleDay < 1) {
        phase = 'Expected Phase';
    } else {
        if (cycleDay <= settings.periodLength) {
            phase = 'Menstrual Phase';
        } else if (cycleDay <= 11) {
            phase = 'Follicular Phase';
        } else if (cycleDay >= 12 && cycleDay <= 16) {
            phase = 'Ovulatory Phase';
        } else if (cycleDay > 16 && cycleDay <= settings.cycleLength) {
            phase = 'Luteal Phase';
        } else {
            phase = 'Late Phase';
        }
    }
    phaseNameEl.innerText = phase;

    // Display days remaining
    if (latestCycle.endDate === null) {
        // Ongoing period
        daysLeftEl.innerHTML = 'Period Active<br><strong>Day ' + cycleDay + '</strong>';
    } else {
        const nextPeriodDate = new Date(start);
        nextPeriodDate.setDate(nextPeriodDate.getDate() + settings.cycleLength);
        const daysUntilNext = Math.ceil((nextPeriodDate - today) / (1000 * 60 * 60 * 24));

        if (daysUntilNext > 0) {
            daysLeftEl.innerHTML = 'Next period in<br><strong>' + daysUntilNext + ' days</strong>';
        } else if (daysUntilNext === 0) {
            daysLeftEl.innerHTML = 'Next period<br><strong>Expected today</strong>';
        } else {
            daysLeftEl.innerHTML = 'Next period<br><strong>' + Math.abs(daysUntilNext) + ' days late</strong>';
        }
    }
}

// --- Log Page Calendar Logic ---
function renderLogCalendar() {
    const titleEl = document.getElementById('log-month-title');
    if (titleEl) {
        titleEl.innerText = logViewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    
    // Auto-populate selected log dates with the latest cycle if no manual selections yet
    if (selectedLogDates.length === 0 && cycles.length > 0) {
        cycles.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
        const latest = cycles[0];
        logRangeStart = latest.startDate;
        logRangeEnd = latest.endDate || todayStr; // Treat active period ending today for display
        
        // Fill dates between start and end
        selectedLogDates = [];
        let start = new Date(logRangeStart);
        let end = new Date(logRangeEnd);
        let tempDate = new Date(start);
        while (tempDate <= end) {
            selectedLogDates.push(getLocalDateString(tempDate));
            tempDate.setDate(tempDate.getDate() + 1);
        }
    }

    generateCalendarGrid(logViewDate, 'log-calendar-grid', 'log');
}

// --- History Page Calendar & List Logic ---
function renderHistory() {
    const titleEl = document.getElementById('history-month-title');
    if (titleEl) {
        titleEl.innerText = historyViewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }

    generateCalendarGrid(historyViewDate, 'history-calendar-grid', 'history');
    renderHistoryList();
}

// Generates the day grid for calendar displays
function generateCalendarGrid(viewDate, gridElementId, cellType) {
    const grid = document.getElementById(gridElementId);
    if (!grid) return;
    grid.innerHTML = '';

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Day of the week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    let startDayOfWeek = firstDay.getDay();
    // Adjust to start on Monday (Monday = 0, Tuesday = 1, ..., Sunday = 6)
    startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

    // Total days in the month
    const totalDays = new Date(year, month + 1, 0).getDate();

    // Previous month total days (for padding)
    const prevMonthTotalDays = new Date(year, month, 0).getDate();

    // Render preceding days from previous month
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
        const dayNum = prevMonthTotalDays - i;
        const cell = document.createElement('div');
        cell.className = 'calendar-day-cell other-month';
        cell.innerText = dayNum;
        grid.appendChild(cell);
    }

    // Render current month days
    for (let day = 1; day <= totalDays; day++) {
        const cell = document.createElement('div');
        cell.className = 'calendar-day-cell';
        cell.innerText = day;

        // Construct date string YYYY-MM-DD
        const mStr = String(month + 1).padStart(2, '0');
        const dStr = String(day).padStart(2, '0');
        const dateStr = `${year}-${mStr}-${dStr}`;

        if (cellType === 'log') {
            if (selectedLogDates.includes(dateStr)) {
                cell.classList.add('selected-log-day');
            }
            cell.addEventListener('click', () => {
                if (logRangeStart && logRangeEnd) {
                    // Clicked any day when a full range is already set: start fresh selection
                    logRangeStart = dateStr;
                    logRangeEnd = null;
                } else if (logRangeStart && !logRangeEnd) {
                    if (dateStr === logRangeStart) {
                        // Tapped same day again: clear it
                        logRangeStart = null;
                    } else if (dateStr > logRangeStart) {
                        // Select end date of range
                        logRangeEnd = dateStr;
                    } else {
                        // Tapped day is before start date, make it the new start date
                        logRangeStart = dateStr;
                    }
                } else {
                    // Neither is set: make it the start date
                    logRangeStart = dateStr;
                }

                // Re-calculate selectedLogDates array
                selectedLogDates = [];
                if (logRangeStart) {
                    if (logRangeEnd) {
                        let startD = new Date(logRangeStart);
                        let endD = new Date(logRangeEnd);
                        let tempD = new Date(startD);
                        while (tempD <= endD) {
                            selectedLogDates.push(getLocalDateString(tempD));
                            tempD.setDate(tempD.getDate() + 1);
                        }
                    } else {
                        selectedLogDates.push(logRangeStart);
                    }
                }

                generateCalendarGrid(viewDate, gridElementId, cellType);
            });
        } else if (cellType === 'history') {
            const isPeriod = cycles.some(c => {
                const start = c.startDate;
                const end = c.endDate || todayStr;
                return dateStr >= start && dateStr <= end;
            });
            if (isPeriod) {
                cell.classList.add('history-period-day');
            }
        }

        grid.appendChild(cell);
    }
}

// Renders the list of past cycle records (Figma List View)
function renderHistoryList() {
    const container = document.getElementById('history-container');
    if (!container) return;

    if (cycles.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No records yet.</p>
                <span class="empty-hint">Use the Log page to add your period.</span>
            </div>
        `;
        return;
    }

    // Sort descending by startDate
    cycles.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
    container.innerHTML = '';

    cycles.forEach(cycle => {
        const start = new Date(cycle.startDate);
        const options = { month: 'short', day: 'numeric' };
        
        let dateText = start.toLocaleDateString('en-US', options);
        let durationText = '';

        if (cycle.endDate) {
            const end = new Date(cycle.endDate);
            const diff = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
            durationText = `${diff} days`;
        } else {
            durationText = 'Active';
        }

        const item = document.createElement('div');
        item.className = 'history-item';
        item.innerHTML = `
            <span class="history-date-label">${dateText}</span>
            <div class="history-duration-badge-wrapper">
                <span class="history-duration-badge">${durationText}</span>
                <div class="history-item-chevron">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c7c7cc" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                </div>
            </div>
        `;

        // Clicking a history item allows deleting it (clean UX matching mockup chevrons)
        item.addEventListener('click', () => {
            if (confirm(`Would you like to delete the cycle record starting on ${start.toLocaleDateString('en-US')}?`)) {
                deleteCycle(cycle.id);
            }
        });

        container.appendChild(item);
    });
}

function deleteCycle(id) {
    cycles = cycles.filter(c => c.id !== id);
    localStorage.setItem('rubra_cycles', JSON.stringify(cycles));
    showToast('Record deleted.');
    renderHistory();
    updateCycleDashboard();
}

// --- Period Saving logic ---
function saveLoggedPeriod() {
    if (selectedLogDates.length === 0) {
        showToast('Please select at least one day in the calendar');
        return;
    }

    // Sort dates chronologically
    selectedLogDates.sort();
    const earliest = selectedLogDates[0];
    const latest = selectedLogDates[selectedLogDates.length - 1];

    const isTodayIncluded = selectedLogDates.includes(todayStr);

    // Logical check: if trying to save as current period but the range does not contain today, warn the user!
    if (!isTodayIncluded) {
        const confirmMsg = "The selected dates do not include today. Are you sure this is your current period?\n\n(Click 'Cancel' to save it as a past record instead)";
        if (!confirm(confirmMsg)) {
            saveLoggedPeriodAsPast();
            return;
        }
    }

    // Save cycle record as active (ongoing: endDate = null)
    cycles = cycles.filter(c => !(c.startDate >= earliest && c.startDate <= latest));
    
    const newId = cycles.length > 0 ? Math.max(...cycles.map(c => c.id)) + 1 : 1;
    const newCycle = {
        id: newId,
        startDate: earliest,
        endDate: null // Current active period has null end date
    };
    cycles.push(newCycle);

    localStorage.setItem('rubra_cycles', JSON.stringify(cycles));
    showToast('Current period saved successfully!');

    // Reset select state and route home
    selectedLogDates = [];
    logRangeStart = null;
    logRangeEnd = null;
    switchPage('home');
    updateCycleDashboard();
}

// Saves the selected calendar range as a completed past record
function saveLoggedPeriodAsPast() {
    if (selectedLogDates.length === 0) {
        showToast('Please select at least one day in the calendar');
        return;
    }

    // Sort dates chronologically
    selectedLogDates.sort();
    const earliest = selectedLogDates[0];
    const latest = selectedLogDates[selectedLogDates.length - 1];

    // Save cycle record as complete
    cycles = cycles.filter(c => !(c.startDate >= earliest && c.startDate <= latest));

    const newId = cycles.length > 0 ? Math.max(...cycles.map(c => c.id)) + 1 : 1;
    const newCycle = {
        id: newId,
        startDate: earliest,
        endDate: latest
    };
    cycles.push(newCycle);

    localStorage.setItem('rubra_cycles', JSON.stringify(cycles));
    showToast('Past record saved successfully!');

    // Reset select state and route home
    selectedLogDates = [];
    logRangeStart = null;
    logRangeEnd = null;
    switchPage('home');
    updateCycleDashboard();
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
        if (cycleVal) cycleVal.innerText = settings.cycleLength;
        saveSettings();
    });

    periodSlider.addEventListener('input', () => {
        settings.periodLength = parseInt(periodSlider.value);
        if (periodVal) periodVal.innerText = settings.periodLength;
        saveSettings();
    });
}

function saveSettings() {
    localStorage.setItem('rubra_settings', JSON.stringify(settings));
    updateCycleDashboard();
}

// --- Tracker Listeners setup ---
function setupTrackerListeners() {
    // Hamburger drawer controls
    const btnHamburger = document.getElementById('btn-hamburger');
    const panelOverlay = document.getElementById('settings-panel-overlay');
    const btnCloseSettings = document.getElementById('btn-close-settings');
    const profileBtn = document.getElementById('btn-header-profile');

    if (btnHamburger && panelOverlay) {
        btnHamburger.addEventListener('click', () => {
            panelOverlay.classList.add('active');
        });
        if (profileBtn) {
            profileBtn.addEventListener('click', () => {
                panelOverlay.classList.add('active');
            });
        }
        if (btnCloseSettings) {
            btnCloseSettings.addEventListener('click', () => {
                panelOverlay.classList.remove('active');
            });
        }
        panelOverlay.addEventListener('click', (e) => {
            if (e.target === panelOverlay) {
                panelOverlay.classList.remove('active');
            }
        });
    }

    // Save Past Record button
    const btnSavePastRecord = document.getElementById('btn-save-past-record');
    if (btnSavePastRecord) {
        btnSavePastRecord.addEventListener('click', saveLoggedPeriodAsPast);
    }

    // Home Log button redirects to Log tab
    const btnLogPeriodHome = document.getElementById('btn-log-period-home');
    if (btnLogPeriodHome) {
        btnLogPeriodHome.addEventListener('click', () => {
            switchPage('log');
        });
    }

    // Log Save button
    const btnSavePeriod = document.getElementById('btn-save-period');
    if (btnSavePeriod) {
        btnSavePeriod.addEventListener('click', saveLoggedPeriod);
    }

    // Close Log panel redirects home
    const btnCloseLog = document.getElementById('btn-close-log');
    if (btnCloseLog) {
        btnCloseLog.addEventListener('click', () => {
            switchPage('home');
        });
    }

    // Log Calendar Month Navigation
    const btnLogPrev = document.getElementById('btn-log-prev-month');
    const btnLogNext = document.getElementById('btn-log-next-month');
    if (btnLogPrev && btnLogNext) {
        btnLogPrev.addEventListener('click', () => {
            logViewDate.setMonth(logViewDate.getMonth() - 1);
            renderLogCalendar();
        });
        btnLogNext.addEventListener('click', () => {
            logViewDate.setMonth(logViewDate.getMonth() + 1);
            renderLogCalendar();
        });
    }

    // History Calendar Month Navigation
    const btnHistPrev = document.getElementById('btn-hist-prev-month');
    const btnHistNext = document.getElementById('btn-hist-next-month');
    if (btnHistPrev && btnHistNext) {
        btnHistPrev.addEventListener('click', () => {
            historyViewDate.setMonth(historyViewDate.getMonth() - 1);
            renderHistory();
        });
        btnHistNext.addEventListener('click', () => {
            historyViewDate.setMonth(historyViewDate.getMonth() + 1);
            renderHistory();
        });
    }
}
