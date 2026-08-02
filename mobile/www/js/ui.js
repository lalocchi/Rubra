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

// --- Auth Layout Switcher ---
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

// --- Input Error Indicator ---
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
