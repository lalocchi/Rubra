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
    } else if (pageName === 'log') {
        renderLogCalendar();
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

// --- Custom Confirmation Dialog Utility ---
function showConfirmDialog(options) {
    const overlay = document.getElementById('confirm-modal-overlay');
    const closeBtn = document.getElementById('btn-confirm-close');
    const cancelBtn = document.getElementById('btn-confirm-cancel');
    const okBtn = document.getElementById('btn-confirm-ok');
    const iconContainer = document.getElementById('confirm-icon-container');
    const titleEl = document.getElementById('confirm-title-text');
    const descEl = document.getElementById('confirm-desc-text');

    if (!overlay) return;

    // Set texts
    titleEl.innerText = options.title || 'Are you sure?';
    descEl.innerText = options.description || '';
    cancelBtn.innerText = options.cancelText || 'Cancel';
    okBtn.innerText = options.confirmText || 'Confirm';

    // Reset button action classes
    okBtn.className = 'confirm-btn btn-confirm';
    if (options.isDanger) {
        okBtn.classList.add('danger-action');
    }

    // Set icon type
    iconContainer.className = 'confirm-icon-wrapper';
    if (options.isDanger) {
        iconContainer.classList.add('danger');
        iconContainer.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
        `;
    } else if (options.isWarning) {
        iconContainer.classList.add('warning');
        iconContainer.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
        `;
    } else {
        iconContainer.classList.add('info');
        iconContainer.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
        `;
    }

    // Handlers
    const closeDialog = (choice) => {
        overlay.classList.remove('active');
        
        // Clean listeners
        closeBtn.replaceWith(closeBtn.cloneNode(true));
        cancelBtn.replaceWith(cancelBtn.cloneNode(true));
        okBtn.replaceWith(okBtn.cloneNode(true));
        overlay.replaceWith(overlay.cloneNode(true));
        
        if (choice === 'confirm' && typeof options.onConfirm === 'function') {
            options.onConfirm();
        } else if (choice === 'cancel' && typeof options.onCancel === 'function') {
            options.onCancel();
        } else if (choice === 'close' && typeof options.onClose === 'function') {
            options.onClose();
        }
    };

    overlay.classList.add('active');

    // Re-bind click listeners
    document.getElementById('btn-confirm-close').onclick = () => closeDialog('close');
    document.getElementById('btn-confirm-cancel').onclick = () => closeDialog('cancel');
    document.getElementById('btn-confirm-ok').onclick = () => closeDialog('confirm');
    document.getElementById('confirm-modal-overlay').onclick = (e) => {
        if (e.target.id === 'confirm-modal-overlay') closeDialog('close');
    };
}

// --- Custom styled success/error Toasts ---
function showToast(message, type = 'success') {
    // Remove existing toast if present
    const existing = document.querySelector('.custom-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `custom-toast ${type}`;
    
    const iconSvg = type === 'success' ? 
        `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>` :
        `<span style="font-weight: 800; font-size: 14px; font-family: Outfit;">!</span>`;

    toast.innerHTML = `
        <div class="toast-icon-circle">${iconSvg}</div>
        <span class="toast-message-text">${message}</span>
        <button class="toast-close-btn" aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
    `;

    document.body.appendChild(toast);

    // Fade in
    setTimeout(() => {
        toast.classList.add('active');
    }, 10);

    const dismissToast = () => {
        toast.classList.remove('active');
        setTimeout(() => toast.remove(), 300);
    };

    // Close button click
    toast.querySelector('.toast-close-btn').onclick = dismissToast;

    // Auto dismiss after 3.5 seconds
    setTimeout(dismissToast, 3500);
}
