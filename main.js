import { auth } from './firebase-config.js';
import { initAuth, signUpWithEmail, signInWithEmail, resetPassword, signInWithGoogle, appSignOut } from './auth.js';
import { saveData, loadOfflineData, resetAllData, downloadCSV, handleFileUpload } from './data.js';
import { DOM, initUI, updateView, renderMonthPicker, setInputErrorState } from './ui.js';

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

// --- Event Listener Setup ---
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

    // Add input listeners to remove error state on typing
    emailInput.addEventListener('input', () => setInputErrorState(emailInput, false));
    passwordInput.addEventListener('input', () => setInputErrorState(passwordInput, false));

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

    document.getElementById('today-btn').addEventListener('click', () => {
        const today = new Date();
        setState({
            selectedDate: today,
            currentMonth: new Date(today.getFullYear(), today.getMonth(), 1)
        });
        updateView();
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
    document.getElementById('add-new-slot-btn').addEventListener('click', () => saveData({ type: 'ADD_SLOT' }));
    
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
    // Initialize UI references first, now that the DOM is loaded.
    initUI(); 
    setupEventListeners();
    // initAuth handles the entire logic for deciding which screen to show on load
    initAuth();
}

// Run the app once the DOM is ready
document.addEventListener('DOMContentLoaded', init);
