// --- App Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // Setup event listeners for onboarding and forms
    setupAuthListeners();
    
    // Setup main app handlers
    setupNavigation();
    setupTrackerListeners();
    setupSettings();
    
    // Route on startup
    checkAuth();
});
