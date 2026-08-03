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

    // Onboarding Step 2: Google Sign In (Warning message)
    const btnGoogleLogin = document.getElementById('btn-google-login');
    if (btnGoogleLogin) {
        btnGoogleLogin.addEventListener('click', () => {
            showToast("For now we don't have that feature, please login with email", 'error');
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
