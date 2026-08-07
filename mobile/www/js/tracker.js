// --- Cycle Calculations & UI Updates ---
function updateCycleDashboard() {
    const phaseNameEl = document.getElementById('cycle-phase-name');
    const daysLeftEl = document.getElementById('cycle-days-left-text');
    if (!phaseNameEl || !daysLeftEl) return;

    if (cycles.length === 0) {
        phaseNameEl.innerText = t('no_records');
        daysLeftEl.innerHTML = t('add_cycle_history');
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
        phase = t('late_phase');
    } else {
        if (cycleDay <= settings.periodLength) {
            phase = t('menstrual_phase');
        } else if (cycleDay <= 11) {
            phase = t('follicular_phase');
        } else if (cycleDay >= 12 && cycleDay <= 16) {
            phase = t('ovulatory_phase');
        } else if (cycleDay > 16 && cycleDay <= settings.cycleLength) {
            phase = t('luteal_phase');
        } else {
            phase = t('late_phase');
        }
    }
    phaseNameEl.innerText = phase;

    // Display days remaining
    if (latestCycle.endDate === null) {
        // Ongoing period
        daysLeftEl.innerHTML = t('period_active_day', { day: cycleDay });
    } else {
        const nextPeriodDate = new Date(start);
        nextPeriodDate.setDate(nextPeriodDate.getDate() + settings.cycleLength);
        const daysUntilNext = Math.ceil((nextPeriodDate - today) / (1000 * 60 * 60 * 24));

        if (daysUntilNext > 0) {
            daysLeftEl.innerHTML = t('next_period_in_days', { days: daysUntilNext });
        } else if (daysUntilNext === 0) {
            daysLeftEl.innerHTML = t('next_period_expected_today');
        } else {
            daysLeftEl.innerHTML = t('next_period_days_late', { days: Math.abs(daysUntilNext) });
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
            showConfirmDialog({
                title: "Delete Cycle Record",
                description: `Are you sure you want to delete the cycle record starting on ${start.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}? This action cannot be undone.`,
                confirmText: "Delete",
                cancelText: "Cancel",
                isDanger: true,
                onConfirm: () => {
                    deleteCycle(cycle.id);
                }
            });
        });

        container.appendChild(item);
    });
}

function deleteCycle(id) {
    cycles = cycles.filter(c => c.id !== id);
    localStorage.setItem('rubra_cycles', JSON.stringify(cycles));
    showToast(t('record_deleted'));
    renderHistory();
    updateCycleDashboard();

    const token = localStorage.getItem('rubra_auth_token');
    if (token && id && !id.toString().startsWith('mock')) {
        fetch(API_BASE_URL + '/api/cycles/period/' + id, {
            method: 'DELETE',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        })
        .then(response => {
            if (!response.ok) throw new Error('Failed to delete period from backend');
            console.log('Period deleted from backend successfully');
        })
        .catch(err => {
            console.error('Error deleting period:', err);
        });
    }
}

// Helper to save current period record
function saveCurrentPeriodRecord(earliest, latest) {
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
    showToast(t('current_period_saved'));

    // Reset select state and route home
    selectedLogDates = [];
    logRangeStart = null;
    logRangeEnd = null;
    switchPage('home');
    updateCycleDashboard();

    syncPeriodToBackend(earliest, null);
}

// --- Period Saving logic ---
function saveLoggedPeriod() {
    if (selectedLogDates.length === 0) {
        showToast(t('select_day_prompt'), 'error');
        return;
    }

    // Sort dates chronologically
    selectedLogDates.sort();
    const earliest = selectedLogDates[0];
    const latest = selectedLogDates[selectedLogDates.length - 1];

    const isTodayIncluded = selectedLogDates.includes(todayStr);

    // Logical check: if trying to save as current period but the range does not contain today, warn the user!
    if (!isTodayIncluded) {
        showConfirmDialog({
            title: "Dates in the Past",
            description: "The selected dates do not include today. Are you sure this is your current period?",
            confirmText: "Yes, Current",
            cancelText: "Save as Past Record",
            isWarning: true,
            onConfirm: () => {
                saveCurrentPeriodRecord(earliest, latest);
            },
            onCancel: () => {
                saveLoggedPeriodAsPast();
            }
        });
        return;
    }

    saveCurrentPeriodRecord(earliest, latest);
}

// Saves the selected calendar range as a completed past record
function saveLoggedPeriodAsPast() {
    if (selectedLogDates.length === 0) {
        showToast(t('select_day_prompt'), 'error');
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
    showToast(t('past_record_saved'));

    // Reset select state and route home
    selectedLogDates = [];
    logRangeStart = null;
    logRangeEnd = null;
    switchPage('home');
    updateCycleDashboard();

    syncPeriodToBackend(earliest, latest);
}

// --- Settings Section Events ---
function setupSettings() {
    const cycleSlider = document.getElementById('profile-input-cycle-len');
    const cycleVal = document.getElementById('profile-val-cycle-len');
    const periodSlider = document.getElementById('profile-input-period-len');
    const periodVal = document.getElementById('profile-val-period-len');

    const themeSelect = document.getElementById('pref-theme');
    const langSelect = document.getElementById('pref-lang');
    const notifToggle = document.getElementById('pref-notifications');

    if (cycleSlider && periodSlider) {
        cycleSlider.addEventListener('input', () => {
            if (cycleVal) cycleVal.innerText = cycleSlider.value;
        });

        periodSlider.addEventListener('input', () => {
            if (periodVal) periodVal.innerText = periodSlider.value;
        });
    }

    // Load preferences from localStorage on init
    if (themeSelect) {
        const savedTheme = localStorage.getItem('rubra_pref_theme') || 'light';
        themeSelect.value = savedTheme;
        applyTheme(savedTheme);
        themeSelect.addEventListener('change', () => {
            const val = themeSelect.value;
            localStorage.setItem('rubra_pref_theme', val);
            applyTheme(val);
            showToast(t('theme_updated'));
        });
    }

    if (langSelect) {
        langSelect.value = currentLanguage;
        langSelect.addEventListener('change', () => {
            const val = langSelect.value;
            setLanguage(val);
            showToast(t('language_updated'));
        });
    }

    if (notifToggle) {
        const savedNotif = localStorage.getItem('rubra_pref_notifications') === 'true';
        notifToggle.checked = savedNotif;
        notifToggle.addEventListener('change', () => {
            localStorage.setItem('rubra_pref_notifications', notifToggle.checked);
            showToast(notifToggle.checked ? t('reminders_enabled') : t('reminders_disabled'));
        });
    }
}

function applyTheme(theme) {
    if (theme === 'dark') {
        document.body.classList.add('dark-theme');
    } else if (theme === 'light') {
        document.body.classList.remove('dark-theme');
    } else {
        // System preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
        }
    }
}

// --- Tracker Listeners setup ---
function setupTrackerListeners() {
    // Hamburger drawer controls
    const btnHamburger = document.getElementById('btn-hamburger');
    const panelOverlay = document.getElementById('settings-panel-overlay');
    const btnCloseSettings = document.getElementById('btn-close-settings');

    if (btnHamburger && panelOverlay) {
        btnHamburger.addEventListener('click', () => {
            panelOverlay.classList.add('active');
        });
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

    // Right Profile drawer controls
    const profileBtn = document.getElementById('btn-header-profile');
    const profileOverlay = document.getElementById('profile-panel-overlay');
    const btnCloseProfile = document.getElementById('btn-close-profile');

    if (profileBtn && profileOverlay) {
        profileBtn.addEventListener('click', () => {
            // Load latest profile values
            syncProfileUI();
            profileOverlay.classList.add('active');
        });
        if (btnCloseProfile) {
            btnCloseProfile.addEventListener('click', () => {
                profileOverlay.classList.remove('active');
            });
        }
        profileOverlay.addEventListener('click', (e) => {
            if (e.target === profileOverlay) {
                profileOverlay.classList.remove('active');
            }
        });
    }

    // Avatar selection grid items click
    const avatarOptions = document.querySelectorAll('.avatar-option');
    avatarOptions.forEach(option => {
        option.addEventListener('click', () => {
            avatarOptions.forEach(o => o.classList.remove('active'));
            option.classList.add('active');
            tempSelectedAvatar = option.getAttribute('data-avatar');
        });
    });

    // Save Profile CTA
    const btnSaveProfile = document.getElementById('btn-save-profile');
    if (btnSaveProfile) {
        btnSaveProfile.addEventListener('click', () => {
            const cycleSlider = document.getElementById('profile-input-cycle-len');
            const periodSlider = document.getElementById('profile-input-period-len');
            if (cycleSlider && periodSlider) {
                updateUserProfile(
                    userProfile.name,
                    tempSelectedAvatar,
                    cycleSlider.value,
                    periodSlider.value
                );
            }
            if (profileOverlay) {
                profileOverlay.classList.remove('active');
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

// Syncs loaded profile state to DOM elements
function syncProfileUI() {
    // Header Avatar
    const headerAvatar = document.querySelector('#btn-header-profile img');
    if (headerAvatar) {
        headerAvatar.src = userProfile.avatar;
    }

    // Profile Card Avatar
    const cardAvatar = document.getElementById('profile-card-avatar');
    if (cardAvatar) {
        cardAvatar.src = userProfile.avatar;
    }

    // Text details
    const nameDisplay = document.getElementById('profile-name-display');
    const emailDisplay = document.getElementById('profile-email-display');
    if (nameDisplay) nameDisplay.innerText = userProfile.name;
    if (emailDisplay) emailDisplay.innerText = userProfile.email;

    // Cycle inputs in Profile
    const cycleSlider = document.getElementById('profile-input-cycle-len');
    const cycleVal = document.getElementById('profile-val-cycle-len');
    const periodSlider = document.getElementById('profile-input-period-len');
    const periodVal = document.getElementById('profile-val-period-len');

    if (cycleSlider) {
        cycleSlider.value = settings.cycleLength;
        if (cycleVal) cycleVal.innerText = settings.cycleLength;
    }
    if (periodSlider) {
        periodSlider.value = settings.periodLength;
        if (periodVal) periodVal.innerText = settings.periodLength;
    }

    // Set temp selected avatar
    tempSelectedAvatar = userProfile.avatar;
    const avatarOptions = document.querySelectorAll('.avatar-option');
    avatarOptions.forEach(opt => {
        if (opt.getAttribute('data-avatar') === userProfile.avatar) {
            opt.classList.add('active');
        } else {
            opt.classList.remove('active');
        }
    });
}

function syncPeriodToBackend(startDate, endDate) {
    const token = localStorage.getItem('rubra_auth_token');
    if (!token) return;

    fetch(API_BASE_URL + '/api/cycles/period', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({
            startDate: startDate,
            endDate: endDate
        })
    })
    .then(response => {
        if (!response.ok) throw new Error('Failed to sync period to backend');
        return response.json();
    })
    .then(data => {
        console.log('Period synced to backend successfully:', data);
        if (typeof fetchUserCycles === 'function') fetchUserCycles();
    })
    .catch(err => {
        console.error('Error syncing period to backend:', err);
    });
}
