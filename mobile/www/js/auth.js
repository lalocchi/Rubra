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

    // Onboarding Google Sign In (Unified trigger class)
    const googleTriggers = document.querySelectorAll('.btn-google-trigger');
    googleTriggers.forEach(btn => {
        btn.addEventListener('click', () => {
            triggerGoogleSignIn();
        });
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
            description: "Are you sure you want to log out of Rubra? Your data will remain stored on this device.",
            confirmText: "Log Out",
            cancelText: "Cancel",
            isDanger: true,
            onConfirm: () => {
                localStorage.removeItem('rubra_auth_token');
                checkAuth();
                showToast('Logged out successfully.');
            }
        });
    });
}

// --- Authentication Actions (API & Mock Fallbacks) ---
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

    // Proceed to register call
    apiRegister(name, email, password, cycleLength, periodDuration);
}

// --- Log In Action ---
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
            const error = new Error(errData.message || 'Registration failed');
            error.isValidationError = true;
            throw error;
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
        if (err.isValidationError) {
            // Server explicitly returned an error (e.g. email already exists)
            showToast(err.message, 'error');
            return;
        }

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
            const error = new Error(errData.message || 'Login failed');
            error.isValidationError = true;
            throw error;
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
        if (err.isValidationError) {
            // Server explicitly rejected the login (e.g. incorrect credentials)
            showToast(err.message, 'error');
            return;
        }

        console.warn('API error during login, falling back to local simulation:', err.message);
        
        // Offline / Simulation fallback mode
        const mockToken = 'mock_jwt_login_' + Date.now();
        localStorage.setItem('rubra_auth_token', mockToken);
        
        showToast('Logged in (Demo Mode)');
        checkAuth();
    });
}

// Fetch user details from GET /api/users/me (or simulate)
function fetchUserProfile() {
    const token = localStorage.getItem('rubra_auth_token');
    if (!token) return;

    // Check if it's a simulated token
    if (token.startsWith('mock_')) {
        simulateFetchUserProfile();
        return;
    }

    fetch('/api/users/me', {
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
            avatar: data.avatar || 'images/waving_hijab_girl.png'
        };
        // Update local settings if server holds them
        if (data.defaultCycleLength) settings.cycleLength = parseInt(data.defaultCycleLength);
        if (data.defaultPeriodDuration) settings.periodLength = parseInt(data.defaultPeriodDuration);

        localStorage.setItem('rubra_settings', JSON.stringify(settings));
        localStorage.setItem('rubra_user_profile', JSON.stringify(userProfile));

        syncProfileUI();
        updateCycleDashboard();
    })
    .catch(err => {
        console.warn('API error fetching profile, using local simulation:', err.message);
        simulateFetchUserProfile();
    });
}

function simulateFetchUserProfile() {
    const savedProfile = localStorage.getItem('rubra_user_profile');
    if (savedProfile) {
        userProfile = JSON.parse(savedProfile);
    } else {
        userProfile = {
            name: 'Rubra User',
            email: 'user@rubra.app',
            avatar: 'images/waving_hijab_girl.png'
        };
        localStorage.setItem('rubra_user_profile', JSON.stringify(userProfile));
    }
    syncProfileUI();
    updateCycleDashboard();
}

// Send profile updates PUT /api/users/profile
function updateUserProfile(name, avatar, cycleLength, periodLength) {
    const token = localStorage.getItem('rubra_auth_token');

    // Optimistically update locally
    userProfile.name = name;
    userProfile.avatar = avatar;
    settings.cycleLength = parseInt(cycleLength);
    settings.periodLength = parseInt(periodLength);

    localStorage.setItem('rubra_settings', JSON.stringify(settings));
    localStorage.setItem('rubra_user_profile', JSON.stringify(userProfile));

    syncProfileUI();
    updateCycleDashboard();

    if (!token || token.startsWith('mock_')) {
        showToast('Profile updated locally.');
        return;
    }

    fetch('/api/users/profile', {
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
        showToast('Profile updated successfully!');
    })
    .catch(err => {
        console.warn('API error updating profile, saved locally:', err.message);
        showToast('Saved locally (Offline Mode).');
    });
}

// Google Client Config & Identity Services API Integration
let googleClientId = null;

function loadGoogleClientId() {
    fetch('/api/auth/google/client-id')
    .then(response => {
        if (!response.ok) throw new Error('Failed to load client config');
        return response.json();
    })
    .then(data => {
        googleClientId = data.clientId;
        initGoogleSignIn();
    })
    .catch(err => {
        console.warn('Could not fetch Google client ID from backend, using placeholder:', err.message);
        googleClientId = '677843075218-exampleclientid.apps.googleusercontent.com';
        initGoogleSignIn();
    });
}

function initGoogleSignIn() {
    if (typeof google !== 'undefined' && googleClientId) {
        google.accounts.id.initialize({
            client_id: googleClientId,
            callback: handleGoogleCredentialResponse
        });
    }
}

function triggerGoogleSignIn() {
    if (typeof google === 'undefined') {
        showToast('Google Sign-In SDK loading. Please try again.', 'error');
        return;
    }

    if (!googleClientId || googleClientId.includes('exampleclientid')) {
        console.warn('Google Client ID is mock or unconfigured. Falling back to local simulation.');
        mockGoogleLogin();
        return;
    }

    try {
        google.accounts.id.prompt((notification) => {
            if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                console.log('Google Prompt skipped or not displayed. Triggering mock login.');
                mockGoogleLogin();
            }
        });
    } catch (e) {
        console.error('Google ID prompt error:', e);
        mockGoogleLogin();
    }
}

function handleGoogleCredentialResponse(response) {
    if (response && response.credential) {
        apiGoogleLogin(response.credential);
    } else {
        showToast('Google authentication failed', 'error');
    }
}

function mockGoogleLogin() {
    apiGoogleLogin("mock_google_id_token_" + Date.now());
}

function apiGoogleLogin(idToken) {
    console.log('Sending Google login request...');

    fetch('/api/auth/google', {
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
            const error = new Error(errData.message || 'Google Login failed');
            error.isValidationError = true;
            throw error;
        }
        return response.json();
    })
    .then(data => {
        if (data.token) {
            localStorage.setItem('rubra_auth_token', data.token);
            showToast('Logged in with Google successfully!');
            checkAuth();
        } else {
            throw new Error('No token returned');
        }
    })
    .catch(err => {
        if (err.isValidationError) {
            showToast(err.message, 'error');
            return;
        }

        console.warn('API error during Google Login, falling back to local simulation:', err.message);
        
        // Offline / Simulation fallback mode
        const mockToken = 'mock_jwt_google_' + Date.now();
        localStorage.setItem('rubra_auth_token', mockToken);
        
        // Auto register user details locally in state
        userProfile = {
            name: 'Google User (Demo)',
            email: 'google.user@gmail.com',
            avatar: 'images/avatar_1.png'
        };
        localStorage.setItem('rubra_user_profile', JSON.stringify(userProfile));

        showToast('Logged in with Google (Demo Mode)');
        checkAuth();
    });
}
