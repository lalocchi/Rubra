// --- State and Default Values ---
let settings = {
    cycleLength: 28,
    periodLength: 5
};

let cycles = [];
let dailyLogs = {};

// Calendar View State
let logViewDate = new Date();
let historyViewDate = new Date();
let selectedLogDates = []; // Selected YYYY-MM-DD date strings in log calendar
let logRangeStart = null;
let logRangeEnd = null;

// User Profile State
let userProfile = {
    name: 'Rubra User',
    email: 'user@rubra.app',
    avatar: 'images/avatar_1.png'
};
let tempSelectedAvatar = 'images/avatar_1.png';

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
    const cycleInput = document.getElementById('profile-input-cycle-len');
    const cycleVal = document.getElementById('profile-val-cycle-len');
    const periodInput = document.getElementById('profile-input-period-len');
    const periodVal = document.getElementById('profile-val-period-len');

    if (cycleInput) cycleInput.value = settings.cycleLength;
    if (cycleVal) cycleVal.innerText = settings.cycleLength;
    if (periodInput) periodInput.value = settings.periodLength;
    if (periodVal) periodVal.innerText = settings.periodLength;
}
