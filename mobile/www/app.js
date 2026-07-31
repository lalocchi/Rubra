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

// Helper to get date relative to today (e.g. -12 days)
function getOffsetDateString(daysOffset) {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    return getLocalDateString(d);
}

// --- Initializing App Data ---
function initData() {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('rubra_settings');
    if (savedSettings) {
        settings = JSON.parse(savedSettings);
    } else {
        // Default settings
        settings = { cycleLength: 28, periodLength: 5 };
        localStorage.setItem('rubra_settings', JSON.stringify(settings));
    }

    // Load daily logs from localStorage
    const savedDailyLogs = localStorage.getItem('rubra_daily_logs');
    if (savedDailyLogs) {
        dailyLogs = JSON.parse(savedDailyLogs);
    } else {
        dailyLogs = {};
        localStorage.setItem('rubra_daily_logs', JSON.stringify(dailyLogs));
    }

    // Load cycles from localStorage
    const savedCycles = localStorage.getItem('rubra_cycles');
    if (savedCycles) {
        cycles = JSON.parse(savedCycles);
    } else {
        // Pre-populate mock cycles for a premium demonstration experience on first login
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

// --- Navigation Handler (Dashboard tabs) ---
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.app-page');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetPage = item.getAttribute('data-page');
            switchPage(targetPage);
        });
    });
}

function switchPage(pageName) {
    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.app-page');

    navItems.forEach(nav => {
        if (nav.getAttribute('data-page') === pageName) {
            nav.classList.add('active');
        } else {
            nav.classList.remove('active');
        }
    });

    pages.forEach(page => {
        if (page.id === `page-${pageName}`) {
            page.classList.add('active');
        } else {
            page.classList.remove('active');
        }
    });

    if (pageName === 'history') {
        renderHistory();
    }
}

// --- Navigation Guard & Auth Layout Switcher ---
function checkAuth() {
    const token = localStorage.getItem('rubra_auth_token');
    const authContainer = document.getElementById('auth-container');
    const mainAppContainer = document.getElementById('main-app-container');
    const themeColorMeta = document.getElementById('meta-theme-color');

    // Reset validation errors
    clearAllErrors();

    if (token) {
        // Authenticated: show main app
        authContainer.style.display = 'none';
        mainAppContainer.style.display = 'block';
        themeColorMeta.setAttribute('content', '#121216'); // Dark theme meta color
        
        initData();
        updateCycleDashboard();
        switchPage('home');
    } else {
        // Unauthenticated: show onboarding/auth
        authContainer.style.display = 'flex';
        mainAppContainer.style.display = 'none';
        themeColorMeta.setAttribute('content', '#ffffff'); // Light theme meta color
        
        showAuthScreen('language');
    }
}

function showAuthScreen(screenName) {
    const screens = document.querySelectorAll('.auth-screen');
    screens.forEach(screen => {
        screen.classList.remove('active');
    });
    
    const targetScreen = document.getElementById(`auth-step-${screenName}`);
    if (targetScreen) {
        targetScreen.classList.add('active');
    }
}

// --- Onboarding & Forms Event Listeners ---
function setupAuthListeners() {
    // Onboarding Step 1: Language Continue
    const btnLangContinue = document.getElementById('btn-language-continue');
    btnLangContinue.addEventListener('click', () => {
        showAuthScreen('method');
    });

    // Onboarding Step 2: Phone Registration Continue
    const btnPhoneContinue = document.getElementById('btn-phone-continue');
    const inputPhone = document.getElementById('input-phone');
    btnPhoneContinue.addEventListener('click', () => {
        const phone = inputPhone.value.trim();
        if (phone.length < 7) {
            showToast('Please enter a valid phone number');
            return;
        }
        // Simulated registration transition
        showAuthScreen('email');
        switchAuthTab('signup');
    });

    // Onboarding Step 2: Google Sign In
    const btnGoogleLogin = document.getElementById('btn-google-login');
    btnGoogleLogin.addEventListener('click', () => {
        // Simulate google login success
        const mockGoogleToken = 'google_jwt_token_mock_' + Math.random().toString(36).substring(2);
        localStorage.setItem('rubra_auth_token', mockGoogleToken);
        showToast('Logged in successfully via Google');
        checkAuth();
    });

    // Onboarding Step 2: Switch to Email
    const btnGotoEmailAuth = document.getElementById('btn-goto-email-auth');
    btnGotoEmailAuth.addEventListener('click', () => {
        showAuthScreen('email');
        switchAuthTab('signup');
    });

    // Onboarding Step 3: Back button
    const btnBackToMethod = document.getElementById('btn-back-to-method');
    btnBackToMethod.addEventListener('click', () => {
        showAuthScreen('method');
    });

    // Switcher tabs
    const tabSignup = document.getElementById('tab-signup');
    const tabLogin = document.getElementById('tab-login');

    tabSignup.addEventListener('click', () => switchAuthTab('signup'));
    tabLogin.addEventListener('click', () => switchAuthTab('login'));

    // Collapsible optional cycle configuration inputs
    const btnToggleCycleSettings = document.getElementById('btn-toggle-cycle-settings');
    const collapsibleSection = btnToggleCycleSettings.closest('.collapsible-section');
    btnToggleCycleSettings.addEventListener('click', () => {
        collapsibleSection.classList.toggle('open');
    });

    // Sign Up submit button
    const btnSubmitSignup = document.getElementById('btn-submit-signup');
    btnSubmitSignup.addEventListener('click', handleSignUp);

    // Log In submit button
    const btnSubmitLogin = document.getElementById('btn-submit-login');
    btnSubmitLogin.addEventListener('click', handleLogIn);

    // Log Out button
    const btnLogout = document.getElementById('btn-logout');
    btnLogout.addEventListener('click', () => {
        if (confirm('Are you sure you want to log out?')) {
            localStorage.removeItem('rubra_auth_token');
            checkAuth();
            showToast('Logged out successfully.');
        }
    });
}

function switchAuthTab(tab) {
    const tabSignup = document.getElementById('tab-signup');
    const tabLogin = document.getElementById('tab-login');
    const formSignup = document.getElementById('form-signup');
    const formLogin = document.getElementById('form-login');

    clearAllErrors();

    if (tab === 'signup') {
        tabSignup.classList.add('active');
        tabLogin.classList.remove('active');
        formSignup.classList.add('active');
        formLogin.classList.remove('active');
    } else {
        tabLogin.classList.add('active');
        tabSignup.classList.remove('active');
        formLogin.classList.add('active');
        formSignup.classList.remove('active');
    }
}

// --- Input Validation Helpers ---
function clearAllErrors() {
    const errorGroups = document.querySelectorAll('.input-group');
    errorGroups.forEach(group => {
        group.classList.remove('has-error');
    });
}

function showInputError(groupId, message) {
    const group = document.getElementById(groupId);
    if (group) {
        group.classList.add('has-error');
        const errorText = group.querySelector('.error-text');
        if (errorText && message) {
            errorText.innerText = message;
        }
    }
}

// --- Authentication Actions (API & Mock Fallbacks) ---
function handleSignUp() {
    clearAllErrors();

    const nameInput = document.getElementById('signup-name');
    const emailInput = document.getElementById('signup-email');
    const passwordInput = document.getElementById('signup-password');
    const cycleLengthInput = document.getElementById('signup-cycle-length');
    const periodDurationInput = document.getElementById('signup-period-duration');

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const cycleLength = parseInt(cycleLengthInput.value) || 28;
    const periodDuration = parseInt(periodDurationInput.value) || 5;

    let hasError = false;

    // Validate Name
    if (!name) {
        showInputError('group-signup-name', 'This section is required');
        hasError = true;
    }

    // Validate Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
        showInputError('group-signup-email', 'This section is required');
        hasError = true;
    } else if (!emailRegex.test(email)) {
        showInputError('group-signup-email', 'Please enter a valid email address');
        hasError = true;
    }

    // Validate Password
    if (!password) {
        showInputError('group-signup-password', 'This section is required');
        hasError = true;
    } else if (password.length < 6) {
        showInputError('group-signup-password', 'Password must be at least 6 characters');
        hasError = true;
    }

    if (hasError) return;

    // Proceed to register call
    apiRegister(name, email, password, cycleLength, periodDuration);
}

function handleLogIn() {
    clearAllErrors();

    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    let hasError = false;

    // Validate Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
        showInputError('group-login-email', 'This section is required');
        hasError = true;
    } else if (!emailRegex.test(email)) {
        showInputError('group-login-email', 'Please enter a valid email address');
        hasError = true;
    }

    // Validate Password
    if (!password) {
        showInputError('group-login-password', 'Password is required');
        hasError = true;
    }

    if (hasError) return;

    // Proceed to login call
    apiLogin(email, password);
}

// POST /api/auth/register API call
function apiRegister(name, email, password, cycleLength, periodDuration) {
    console.log('Sending register request for:', email);

    fetch('/api/auth/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name: name,
            email: email,
            password: password,
            defaultCycleLength: cycleLength,
            defaultPeriodDuration: periodDuration
        })
    })
    .then(async response => {
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.message || 'Registration failed');
        }
        return response.json();
    })
    .then(data => {
        // Registration success
        if (data.token) {
            localStorage.setItem('rubra_auth_token', data.token);
            // Save the user cycle preferences directly
            settings.cycleLength = cycleLength;
            settings.periodLength = periodDuration;
            localStorage.setItem('rubra_settings', JSON.stringify(settings));
            
            showToast('Registration successful! Welcome to Rubra.');
            checkAuth();
        } else {
            throw new Error('No token returned');
        }
    })
    .catch(err => {
        console.warn('API error during registration, falling back to local simulation:', err.message);
        
        // Offline / Simulation fallback mode
        const mockToken = 'mock_jwt_register_' + Date.now();
        localStorage.setItem('rubra_auth_token', mockToken);
        
        // Save preferences
        settings.cycleLength = cycleLength;
        settings.periodLength = periodDuration;
        localStorage.setItem('rubra_settings', JSON.stringify(settings));

        showToast('Connected locally (Demo Mode)');
        checkAuth();
    });
}

// POST /api/auth/login API call
function apiLogin(email, password) {
    console.log('Sending login request for:', email);

    fetch('/api/auth/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            email: email,
            password: password
        })
    })
    .then(async response => {
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.message || 'Login failed');
        }
        return response.json();
    })
    .then(data => {
        // Login success
        if (data.token) {
            localStorage.setItem('rubra_auth_token', data.token);
            showToast('Logged in successfully!');
            checkAuth();
        } else {
            throw new Error('No token returned');
        }
    })
    .catch(err => {
        console.warn('API error during login, falling back to local simulation:', err.message);
        
        // Offline / Simulation fallback mode
        const mockToken = 'mock_jwt_login_' + Date.now();
        localStorage.setItem('rubra_auth_token', mockToken);
        
        showToast('Logged in (Demo Mode)');
        checkAuth();
    });
}

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
        background: rgba(147, 60, 230, 0.95);
        color: white;
        padding: 10px 20px;
        border-radius: 12px;
        font-size: 13px;
        font-weight: 500;
        z-index: 1000;
        box-shadow: 0 4px 15px rgba(0,0,0,0.25);
        opacity: 0;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        font-family: Outfit, sans-serif;
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
    // Setup event listeners for onboarding and forms
    setupAuthListeners();
    
    // Setup main app handlers
    setupNavigation();
    setupPeriodLogging();
    setupDailyLogger();
    setupSettings();
    
    // Route on startup
    checkAuth();
});
