// --- API Base URL configuration for cross-origin local testing ---
const API_BASE_URL = window.location.origin.includes('5500') || window.location.protocol === 'file:' 
    ? 'http://localhost:8080' 
    : '';

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
        fetchUserProfile();
        fetchUserCycles();
        updateCycleDashboard();
        switchPage('home');
    } else {
        // Unauthenticated: show onboarding/auth
        authContainer.style.display = 'flex';
        mainAppContainer.style.display = 'none';
        themeColorMeta.setAttribute('content', '#ffffff'); // Light theme meta color
        
        showAuthScreen('welcome');
    }
}

// --- Onboarding & Forms Event Listeners ---
function setupAuthListeners() {
    // Onboarding Step 0: Welcome Start
    const btnWelcomeStart = document.getElementById('btn-welcome-start');
    if (btnWelcomeStart) {
        btnWelcomeStart.addEventListener('click', () => {
            showAuthScreen('language');
        });
    }

    // Onboarding Step 1: Language Continue
    const btnLangContinue = document.getElementById('btn-language-continue');
    btnLangContinue.addEventListener('click', () => {
        showAuthScreen('method');
    });

    // Onboarding Step 2: Email Registration Continue
    const btnEmailContinue = document.getElementById('btn-email-continue');
    if (btnEmailContinue) {
        btnEmailContinue.addEventListener('click', () => {
            showAuthScreen('email');
            switchAuthTab('signup');
        });
    }

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

    // Sign Up submit button
    const btnSubmitSignup = document.getElementById('btn-submit-signup');
    btnSubmitSignup.addEventListener('click', handleSignUp);

    // Log In submit button
    const btnSubmitLogin = document.getElementById('btn-submit-login');
    btnSubmitLogin.addEventListener('click', handleLogIn);

    // Log Out button
    const btnLogout = document.getElementById('btn-logout');
    btnLogout.addEventListener('click', () => {
        showConfirmDialog({
            title: "Log Out",
            description: "Are you sure you want to log out of Rubra?",
            confirmText: "Log Out",
            cancelText: "Cancel",
            isDanger: true,
            onConfirm: () => {
                localStorage.removeItem('rubra_auth_token');
                localStorage.removeItem('rubra_user_profile');
                localStorage.removeItem('rubra_cycles');
                localStorage.removeItem('rubra_daily_logs');
                localStorage.removeItem('rubra_settings');
                checkAuth();
                showToast('Logged out successfully.');
            }
        });
    });
}

// --- Authentication Actions (API Only - No Mock Fallbacks) ---
function handleSignUp() {
    clearAllErrors();

    const nameInput = document.getElementById('signup-name');
    const emailInput = document.getElementById('signup-email');
    const passwordInput = document.getElementById('signup-password');
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const cycleLength = 28;
    const periodDuration = 5;

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

    apiLogin(email, password);
}

// POST /api/auth/register API call
function apiRegister(name, email, password, cycleLength, periodDuration) {
    console.log('Sending register request for:', email);

    fetch(API_BASE_URL + '/api/auth/register', {
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
        if (data.token) {
            localStorage.removeItem('rubra_user_profile');
            localStorage.removeItem('rubra_cycles');
            localStorage.removeItem('rubra_daily_logs');
            localStorage.removeItem('rubra_settings');
            
            localStorage.setItem('rubra_auth_token', data.token);
            showToast('Registration successful! Welcome to Rubra.');
            checkAuth();
        } else {
            throw new Error('No token returned');
        }
    })
    .catch(err => {
        console.error('Registration error:', err);
        showToast(err.message || 'Could not connect to the server. Please check if the backend is running.', 'error');
    });
}

// POST /api/auth/login API call
function apiLogin(email, password) {
    console.log('Sending login request for:', email);

    fetch(API_BASE_URL + '/api/auth/login', {
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
            throw new Error(errData.message || 'Incorrect email or password');
        }
        return response.json();
    })
    .then(data => {
        if (data.token) {
            localStorage.removeItem('rubra_user_profile');
            localStorage.removeItem('rubra_cycles');
            localStorage.removeItem('rubra_daily_logs');
            localStorage.removeItem('rubra_settings');

            localStorage.setItem('rubra_auth_token', data.token);
            showToast('Logged in successfully!');
            checkAuth();
        } else {
            throw new Error('No token returned');
        }
    })
    .catch(err => {
        console.error('Login error:', err);
        showToast(err.message || 'Could not connect to the server. Please check if the backend is running.', 'error');
    });
}

// Fetch user details from GET /api/users/me
function fetchUserProfile() {
    const token = localStorage.getItem('rubra_auth_token');
    if (!token) return;

    fetch(API_BASE_URL + '/api/users/me', {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token
        }
    })
    .then(response => {
        if (!response.ok) throw new Error('Failed to fetch profile');
        return response.json();
    })
    .then(data => {
        userProfile = {
            name: data.name || 'Rubra User',
            email: data.email || 'user@rubra.app',
            avatar: data.avatar || 'images/avatar_1.png'
        };
        
        if (data.defaultCycleLength) settings.cycleLength = parseInt(data.defaultCycleLength);
        if (data.defaultPeriodDuration) settings.periodLength = parseInt(data.defaultPeriodDuration);

        localStorage.setItem('rubra_settings', JSON.stringify(settings));
        localStorage.setItem('rubra_user_profile', JSON.stringify(userProfile));

        syncProfileUI();
        updateCycleDashboard();
    })
    .catch(err => {
        console.error('Error fetching profile:', err.message);
        // Load cache if server is temporarily down, else redirect if unauthenticated
        const savedProfile = localStorage.getItem('rubra_user_profile');
        if (savedProfile) {
            userProfile = JSON.parse(savedProfile);
            syncProfileUI();
            updateCycleDashboard();
        }
    });
}

// Send profile updates PUT /api/users/profile
function updateUserProfile(name, avatar, cycleLength, periodLength) {
    const token = localStorage.getItem('rubra_auth_token');
    if (!token) return;

    fetch(API_BASE_URL + '/api/users/profile', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({
            name: name,
            avatar: avatar,
            defaultCycleLength: parseInt(cycleLength),
            defaultPeriodDuration: parseInt(periodLength)
        })
    })
    .then(response => {
        if (!response.ok) throw new Error('Profile update failed');
        return response.json();
    })
    .then(data => {
        userProfile.name = name;
        userProfile.avatar = avatar;
        settings.cycleLength = parseInt(cycleLength);
        settings.periodLength = parseInt(periodLength);

        localStorage.setItem('rubra_settings', JSON.stringify(settings));
        localStorage.setItem('rubra_user_profile', JSON.stringify(userProfile));

        syncProfileUI();
        updateCycleDashboard();
        showToast('Profile updated successfully!');
    })
    .catch(err => {
        console.error('Error updating profile:', err);
        showToast('Failed to save profile changes. Server is unreachable.', 'error');
    });
}

// Google Client Config & Identity Services API Integration
let googleClientId = null;

function loadGoogleClientId() {
    fetch(API_BASE_URL + '/api/auth/google/client-id')
    .then(response => {
        if (!response.ok) throw new Error('Failed to load client config');
        return response.json();
    })
    .then(data => {
        googleClientId = data.clientId;
        initGoogleSignIn();
    })
    .catch(err => {
        console.warn('Could not fetch Google client ID from backend:', err.message);
    });
}

function initGoogleSignIn() {
    if (typeof google === 'undefined' || !googleClientId || googleClientId.includes('example-client-id')) {
        console.warn('Google SDK not loaded or Client ID is not configured.');
        return;
    }

    try {
        google.accounts.id.initialize({
            client_id: googleClientId,
            callback: handleGoogleCredentialResponse
        });

        const signupBtnContainer = document.getElementById('google-signup-btn');
        if (signupBtnContainer) {
            google.accounts.id.renderButton(signupBtnContainer, {
                theme: 'outline',
                size: 'large',
                width: signupBtnContainer.offsetWidth || 280,
                type: 'standard',
                shape: 'rectangular',
                text: 'signup_with',
                logo_alignment: 'left'
            });
        }

        const loginBtnContainer = document.getElementById('google-login-btn');
        if (loginBtnContainer) {
            google.accounts.id.renderButton(loginBtnContainer, {
                theme: 'outline',
                size: 'large',
                width: loginBtnContainer.offsetWidth || 280,
                type: 'standard',
                shape: 'rectangular',
                text: 'signin_with',
                logo_alignment: 'left'
            });
        }

        const methodBtnContainer = document.getElementById('google-method-btn');
        if (methodBtnContainer) {
            google.accounts.id.renderButton(methodBtnContainer, {
                theme: 'outline',
                size: 'large',
                width: methodBtnContainer.offsetWidth || 280,
                type: 'standard',
                shape: 'rectangular',
                text: 'signup_with',
                logo_alignment: 'left'
            });
        }
    } catch (e) {
        console.error('Could not initialize Google GSI button:', e.message);
    }
}

function handleGoogleCredentialResponse(response) {
    if (response && response.credential) {
        apiGoogleLogin(response.credential);
    } else {
        showToast('Google authentication failed', 'error');
    }
}

function apiGoogleLogin(idToken) {
    console.log('Sending Google login request...');

    fetch(API_BASE_URL + '/api/auth/google', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            idToken: idToken
        })
    })
    .then(async response => {
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.message || 'Google Login failed');
        }
        return response.json();
    })
    .then(data => {
        if (data.token) {
            localStorage.removeItem('rubra_user_profile');
            localStorage.removeItem('rubra_cycles');
            localStorage.removeItem('rubra_daily_logs');
            localStorage.removeItem('rubra_settings');

            localStorage.setItem('rubra_auth_token', data.token);
            showToast('Logged in with Google successfully!');
            checkAuth();
        } else {
            throw new Error('No token returned from Google authentication');
        }
    })
    .catch(err => {
        console.error('Google auth error:', err);
        showToast(err.message || 'Could not connect to the server. Please try again.', 'error');
    });
}

function fetchUserCycles() {
    const token = localStorage.getItem('rubra_auth_token');
    if (!token) return;

    fetch(API_BASE_URL + '/api/cycles/periods', {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token
        }
    })
    .then(response => {
        if (!response.ok) throw new Error('Failed to fetch cycles');
        return response.json();
    })
    .then(data => {
        cycles = data;
        localStorage.setItem('rubra_cycles', JSON.stringify(cycles));
        updateCycleDashboard();
        if (typeof renderHistory === 'function') renderHistory();
        if (typeof renderLogCalendar === 'function') renderLogCalendar();
    })
    .catch(err => {
        console.error('Error fetching cycles from backend:', err.message);
    });
}
