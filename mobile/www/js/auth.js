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
            const isValidation = [400, 401, 403, 409].includes(response.status);
            const errData = await response.json().catch(() => ({}));
            const error = new Error(errData.message || 'Registration failed');
            error.isValidationError = isValidation;
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
            const isValidation = [400, 401, 403, 409].includes(response.status);
            const errData = await response.json().catch(() => ({}));
            const error = new Error(errData.message || 'Login failed');
            error.isValidationError = isValidation;
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
            avatar: data.avatar || 'images/avatar_1.png'
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
            avatar: 'images/avatar_1.png'
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
    // If it's Demo Mode (mock / unconfigured client ID) or GSI SDK is not loaded
    if (!googleClientId || googleClientId.includes('exampleclientid') || typeof google === 'undefined') {
        renderMockGoogleButtons();
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
        console.warn('Could not initialize official Google button, rendering mock fallback:', e.message);
        renderMockGoogleButtons();
    }
}

function renderMockGoogleButtons() {
    const containers = ['google-method-btn', 'google-signup-btn', 'google-login-btn'];
    containers.forEach(id => {
        const container = document.getElementById(id);
        if (container) {
            container.innerHTML = `
                <button class="btn-secondary btn-google-trigger" style="display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; border: 1px solid #333340; border-radius: 8px; padding: 10px; background: #22222a; color: #ffffff; cursor: pointer; font-family: inherit; font-size: 14px; font-weight: 500;">
                    <svg class="google-icon" width="18" height="18" viewBox="0 0 24 24" style="margin-right: 6px;">
                        <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69a5.74 5.74 0 0 1-2.48 3.77v3.13h3.99c2.33-2.14 3.54-5.3 3.54-8.75z"/>
                        <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.99-3.13c-1.11.75-2.52 1.19-3.94 1.19-3.03 0-5.6-2.05-6.51-4.82H1.38v3.24C3.36 21.49 7.43 24 12 24z"/>
                        <path fill="#FBBC05" d="M5.49 14.33c-.24-.72-.38-1.5-.38-2.33s.14-1.61.38-2.33V6.43H1.38A11.96 11.96 0 0 0 0 12c0 2.05.52 4 1.38 5.57l4.11-3.24z"/>
                        <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43C17.93 1.19 15.24 0 12 0 7.43 0 3.36 2.51 1.38 6.43l4.11 3.24c.91-2.77 3.48-4.92 6.51-4.92z"/>
                    </svg>
                    Continue with Google
                </button>
            `;
            const button = container.querySelector('.btn-google-trigger');
            if (button) {
                button.addEventListener('click', () => {
                    mockGoogleLogin();
                });
            }
        }
    });
}

function triggerGoogleSignIn() {
    if (typeof google === 'undefined') {
        showToast('Google Sign-In SDK loading. Please try again.', 'error');
        return;
    }
    
    if (!googleClientId || googleClientId.includes('exampleclientid')) {
        mockGoogleLogin();
        return;
    }

    try {
        google.accounts.id.prompt();
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
    showConfirmDialog({
        title: "Google Sign-In (Demo)",
        description: `
            <p style="margin-bottom: 12px; font-size: 14px; color: #8e8e93;">Choose a mock Google account to continue:</p>
            <div style="display: flex; flex-direction: column; gap: 8px;">
                <button class="btn-secondary mock-account-opt" data-email="ayla.alieva@gmail.com" data-name="Ayla Alieva" data-avatar="images/avatar_1.png" style="text-align: left; padding: 10px; width: 100%; justify-content: flex-start; display: flex; align-items: center; background: #22222a; border: 1px solid #333340; border-radius: 8px; cursor: pointer; color: #ffffff; gap: 12px;">
                    <img src="images/avatar_1.png" style="width: 32px; height: 32px; border-radius: 50%;">
                    <div style="text-align: left;">
                        <strong style="display:block; font-size:13px; color:#ffffff;">Ayla Alieva</strong>
                        <span style="font-size:11px; color:#8e8e93;">ayla.alieva@gmail.com</span>
                    </div>
                </button>
                <button class="btn-secondary mock-account-opt" data-email="gunel.hasanova@gmail.com" data-name="Gunel Hasanova" data-avatar="images/avatar_2.png" style="text-align: left; padding: 10px; width: 100%; justify-content: flex-start; display: flex; align-items: center; background: #22222a; border: 1px solid #333340; border-radius: 8px; cursor: pointer; color: #ffffff; gap: 12px;">
                    <img src="images/avatar_2.png" style="width: 32px; height: 32px; border-radius: 50%;">
                    <div style="text-align: left;">
                        <strong style="display:block; font-size:13px; color:#ffffff;">Gunel Hasanova</strong>
                        <span style="font-size:11px; color:#8e8e93;">gunel.hasanova@gmail.com</span>
                    </div>
                </button>
                <button class="btn-secondary mock-account-opt" data-email="leyla.mammadova@gmail.com" data-name="Leyla Mammadova" data-avatar="images/avatar_3.png" style="text-align: left; padding: 10px; width: 100%; justify-content: flex-start; display: flex; align-items: center; background: #22222a; border: 1px solid #333340; border-radius: 8px; cursor: pointer; color: #ffffff; gap: 12px;">
                    <img src="images/avatar_3.png" style="width: 32px; height: 32px; border-radius: 50%;">
                    <div style="text-align: left;">
                        <strong style="display:block; font-size:13px; color:#ffffff;">Leyla Mammadova</strong>
                        <span style="font-size:11px; color:#8e8e93;">leyla.mammadova@gmail.com</span>
                    </div>
                </button>
            </div>
        `,
        confirmText: "Close",
        cancelText: "Cancel",
        onConfirm: () => {},
        onCancel: () => {}
    });

    setTimeout(() => {
        const okBtn = document.getElementById('btn-confirm-ok');
        if (okBtn) okBtn.style.display = 'none';
        
        const opts = document.querySelectorAll('.mock-account-opt');
        opts.forEach(opt => {
            opt.addEventListener('click', () => {
                const name = opt.getAttribute('data-name');
                const email = opt.getAttribute('data-email');
                const avatar = opt.getAttribute('data-avatar');
                
                const overlay = document.getElementById('confirm-modal-overlay');
                if (overlay) overlay.classList.remove('active');
                
                apiGoogleLoginMocked(name, email, avatar);
            });
        });
    }, 50);
}

function apiGoogleLoginMocked(name, email, avatar) {
    showToast(`Logging in as ${name}...`);
    
    setTimeout(() => {
        const mockToken = 'mock_jwt_google_' + Date.now();
        localStorage.setItem('rubra_auth_token', mockToken);
        
        userProfile = {
            name: name,
            email: email,
            avatar: avatar
        };
        localStorage.setItem('rubra_user_profile', JSON.stringify(userProfile));

        showToast(`Logged in as ${name} (Demo Mode)`);
        checkAuth();
    }, 600);
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
            const isValidation = [400, 401, 403, 409].includes(response.status);
            const errData = await response.json().catch(() => ({}));
            const error = new Error(errData.message || 'Google Login failed');
            error.isValidationError = isValidation;
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
