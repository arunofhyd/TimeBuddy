import { auth } from './firebase-config.js';
import { initAuth, signUpWithEmail, signInWithEmail, resetPassword, signInWithGoogle, appSignOut } from './auth.js';
import { saveData, loadOfflineData, resetAllData, downloadCSV, handleFileUpload } from './data.js';
import { DOM, initUI, updateView, renderMonthPicker, setInputErrorState, setButtonLoadingState as uiSetButtonLoadingState, showMessage } from './ui.js';

// --- Global App State ---
export let state = {
    currentMonth: new Date(),
    selectedDate: new Date(),
    currentView: 'month',
    allStoredData: {},
    userId: null,
    isOnlineMode: false,
    unsubscribeFromFirestore: null,
    editingInlineTimeKey: null,
    draggedItem: null,
    pickerYear: new Date().getFullYear(),
};

// --- State Management ---
export function setState(newState) {
    state = { ...state, ...newState };
}

// --- Theme Management ---
function applyTheme(theme) {
    const lightIcon = document.getElementById('theme-icon-light');
    const darkIcon = document.getElementById('theme-icon-dark');
    if (theme === 'dark') {
        document.body.classList.add('dark');
        lightIcon.classList.add('hidden');
        darkIcon.classList.remove('hidden');
    } else {
        document.body.classList.remove('dark');
        lightIcon.classList.remove('hidden');
        darkIcon.classList.add('hidden');
    }
}

function toggleTheme() {
    const isDark = document.body.classList.contains('dark');
    const newTheme = isDark ? 'light' : 'dark';
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
}

function loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme) {
        applyTheme(savedTheme);
    } else if (systemPrefersDark) {
        applyTheme('dark');
    } else {
        applyTheme('light');
    }
}

// --- Event Listeners ---
function setupEventListeners() {
    // Auth Buttons
    const emailInput = document.getElementById('email-input');
    const passwordInput = document.getElementById('password-input');
    DOM.emailSignupBtn.addEventListener('click', () => signUpWithEmail(emailInput.value, passwordInput.value));
    DOM.emailSigninBtn.addEventListener('click', () => signInWithEmail(emailInput.value, passwordInput.value));
    DOM.forgotPasswordBtn.addEventListener('click', () => resetPassword(emailInput.value));
    document.getElementById('google-signin-btn').addEventListener('click', signInWithGoogle);
    document.getElementById('anon-continue-btn').addEventListener('click', loadOfflineData);
    document.getElementById('sign-out-btn').addEventListener('click', appSignOut);

    // Password Visibility Toggle
    const passwordToggleBtn = document.getElementById('password-toggle-btn');
    const passwordToggleIcon = document.getElementById('password-toggle-icon');
    passwordToggleBtn.addEventListener('click', () => {
        const isPassword = passwordInput.type === 'password';
        if (isPassword) {
            passwordInput.type = 'text';
            passwordToggleIcon.classList.remove('fa-eye');
            passwordToggleIcon.classList.add('fa-eye-slash');
        } else {
            passwordInput.type = 'password';
            passwordToggleIcon.classList.remove('fa-eye-slash');
            passwordToggleIcon.classList.add('fa-eye');
        }
    });

    // Add input listeners to remove error state on typing
    emailInput.addEventListener('input', () => setInputErrorState(emailInput, false));
    passwordInput.addEventListener('input', () => setInputErrorState(passwordInput, false));

    // Theme Toggle
    document.getElementById('theme-toggle-btn').addEventListener('click', toggleTheme);

    // View Navigation
    DOM.monthViewBtn.addEventListener('click', () => { setState({ currentView: 'month' }); updateView(); });
    DOM.dayViewBtn.addEventListener('click', () => { setState({ currentView: 'day' }); updateView(); });
    
    document.getElementById('prev-btn').addEventListener('click', () => {
        if (state.currentView === 'month') {
            const newMonth = new Date(state.currentMonth.setMonth(state.currentMonth.getMonth() - 1));
            setState({ currentMonth: newMonth });
        } else {
            const newDate = new Date(state.selectedDate.setDate(state.selectedDate.getDate() - 1));
            setState({ selectedDate: newDate, currentMonth: new Date(newDate.getFullYear(), newDate.getMonth(), 1) });
        }
        updateView();
    });

    document.getElementById('next-btn').addEventListener('click', () => {
        if (state.currentView === 'month') {
            const newMonth = new Date(state.currentMonth.setMonth(state.currentMonth.getMonth() + 1));
            setState({ currentMonth: newMonth });
        } else {
            const newDate = new Date(state.selectedDate.setDate(state.selectedDate.getDate() + 1));
            setState({ selectedDate: newDate, currentMonth: new Date(newDate.getFullYear(), newDate.getMonth(), 1) });
        }
        updateView();
    });

    const todayBtn = document.getElementById('today-btn');
    todayBtn.addEventListener('click', async () => {
        uiSetButtonLoadingState(todayBtn, true);
        try {
            await new Promise(resolve => setTimeout(resolve, 50));
            
            const today = new Date();
            setState({
                selectedDate: today,
                currentMonth: new Date(today.getFullYear(), today.getMonth(), 1)
            });
            updateView();
        } catch (error) {
            console.error("Error navigating to today:", error);
            showMessage("Could not navigate to today's date.", 'error');
        } finally {
            uiSetButtonLoadingState(todayBtn, false);
        }
    });

    // Modals
    DOM.currentPeriodDisplay.addEventListener('click', () => {
        setState({ pickerYear: state.currentView === 'month' ? state.currentMonth.getFullYear() : state.selectedDate.getFullYear() });
        renderMonthPicker();
        DOM.monthPickerModal.classList.remove('hidden');
    });
    
    document.getElementById('close-month-picker-btn').addEventListener('click', () => DOM.monthPickerModal.classList.add('hidden'));
    document.getElementById('prev-year-btn').addEventListener('click', () => { setState({ pickerYear: state.pickerYear - 1 }); renderMonthPicker(); });
    document.getElementById('next-year-btn').addEventListener('click', () => { setState({ pickerYear: state.pickerYear + 1 }); renderMonthPicker(); });

    // Daily View Actions
    DOM.dailyNoteInput.addEventListener('input', (e) => saveData({ type: 'SAVE_NOTE', payload: e.target.value }));
    
    const addNewSlotBtn = document.getElementById('add-new-slot-btn');
    addNewSlotBtn.addEventListener('click', async () => {
        uiSetButtonLoadingState(addNewSlotBtn, true);
        try {
            await saveData({ type: 'ADD_SLOT' });
        } catch (error) {
            console.error("Error adding new slot:", error);
            showMessage("Could not add new slot.", 'error');
        } finally {
            uiSetButtonLoadingState(addNewSlotBtn, false);
        }
    });
    
    // Reset Data
    document.getElementById('reset-data-btn').addEventListener('click', () => {
        DOM.resetModalText.textContent = state.isOnlineMode
            ? "This will permanently delete all your activity data from the cloud. This action cannot be undone."
            : "This will permanently delete all your local activity data. This action cannot be undone.";
        DOM.confirmResetModal.classList.remove('hidden');
    });
    document.getElementById('cancel-reset-btn').addEventListener('click', () => DOM.confirmResetModal.classList.add('hidden'));
    document.getElementById('confirm-reset-btn').addEventListener('click', resetAllData);

    // CSV Handling
    const uploadCsvBtn = document.getElementById('upload-csv-btn');
    const uploadCsvInput = document.getElementById('upload-csv-input');
    const downloadCsvBtn = document.getElementById('download-csv-btn');

    uploadCsvBtn.addEventListener('click', () => uploadCsvInput.click());
    uploadCsvInput.addEventListener('change', handleFileUpload);
    downloadCsvBtn.addEventListener('click', downloadCSV);
}

// --- App Initialization ---
function init() {
    initUI(); 
    setupEventListeners();
    loadTheme();
    initAuth();
}

// Run the app once the DOM is ready
document.addEventListener('DOMContentLoaded', init);
