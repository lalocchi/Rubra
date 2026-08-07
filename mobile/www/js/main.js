// --- App Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // Apply localization settings on startup
    setLanguage(currentLanguage);

    // Setup event listeners for onboarding and forms
    setupAuthListeners();
    loadGoogleClientId();
    
    // Setup main app handlers
    setupNavigation();
    setupTrackerListeners();
    setupSettings();
    
    // Route on startup
    checkAuth();
});
