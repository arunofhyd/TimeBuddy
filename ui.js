import { state, setState } from './main.js';
import { saveData, updateActivityOrder, deleteActivity, subscribeToData } from './data.js';

// --- DOM Element References ---
export let DOM = {};

export function initUI() {
    DOM = {
        loginView: document.getElementById('login-view'),
        appView: document.getElementById('app-view'),
        userIdDisplay: document.getElementById('user-id-display'),
        messageDisplay: document.getElementById('message-display'),
        messageText: document.getElementById('message-text'),
        emailSigninBtn: document.getElementById('email-signin-btn'),
        emailSignupBtn: document.getElementById('email-signup-btn'),
        forgotPasswordBtn: document.getElementById('forgot-password-btn'),
        currentPeriodDisplay: document.getElementById('current-period-display'),
        monthViewBtn: document.getElementById('month-view-btn'),
        dayViewBtn: document.getElementById('day-view-btn'),
        calendarView: document.getElementById('calendar-view'),
        dailyView: document.getElementById('daily-view'),
        dailyNoteInput: document.getElementById('daily-note-input'),
        dailyActivityTableBody: document.getElementById('daily-activity-table-body'),
        noDailyActivitiesMessage: document.getElementById('no-daily-activities-message'),
        hourlyPromptModal: document.getElementById('hourly-prompt-modal'),
        hourlyActivityInput: document.getElementById('hourly-activity-input'),
        monthPickerModal: document.getElementById('month-picker-modal'),
        pickerYearDisplay: document.getElementById('picker-year-display'),
        monthGrid: document.getElementById('month-grid'),
        confirmResetModal: document.getElementById('confirm-reset-modal'),
        resetModalText: document.getElementById('reset-modal-text'),
    };
}

// --- Input Error State ---
export function setInputErrorState(inputElement, hasError) {
    if (hasError) {
        inputElement.classList.add('border-red-500', 'ring-red-500');
        inputElement.classList.remove('border-gray-200');
    } else {
        inputElement.classList.remove('border-red-500', 'ring-red-500');
        inputElement.classList.add('border-gray-200');
    }
}

// --- Button Loading State ---
const spinner = `<svg class="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>`;

export function setButtonLoadingState(button, isLoading) {
    if (isLoading) {
        button.disabled = true;
        // Store original content
        button.dataset.originalContent = button.innerHTML;
        
        // Get computed size and lock it
        const rect = button.getBoundingClientRect();
        button.style.width = `${rect.width}px`;
        button.style.height = `${rect.height}px`;

        // Set loading content. The inner div helps with centering.
        button.innerHTML = `<div class="flex items-center justify-center w-full h-full">${spinner}<span>Processing...</span></div>`;
    } else {
        button.disabled = false;
        // Restore original content
        if (button.dataset.originalContent) {
            button.innerHTML = button.dataset.originalContent;
        }
        // Remove fixed size
        button.style.width = '';
        button.style.height = '';
    }
}

// --- View Management with Fading Transitions ---
export function showLoginView() {
    DOM.appView.classList.add('opacity-0', 'scale-95');
    setTimeout(() => {
        DOM.appView.classList.add('hidden');
        DOM.loginView.classList.remove('hidden');
        DOM.loginView.classList.remove('opacity-0', 'scale-95');
    }, 300);
}

export function showAppView() {
    DOM.loginView.classList.add('opacity-0', 'scale-95');
    setTimeout(() => {
        DOM.loginView.classList.add('hidden');
        DOM.appView.classList.remove('hidden');
        DOM.appView.classList.remove('opacity-0', 'scale-95');
    }, 300);
}

export function handleUserLogin(user) {
    if (state.unsubscribeFromFirestore) {
        state.unsubscribeFromFirestore();
    }
    setState({ userId: user.uid, isOnlineMode: true });
    DOM.userIdDisplay.textContent = `User ID: ${user.uid}`;
    subscribeToData(user.uid);
    showAppView();
}

// --- Message Display ---
export function showMessage(msg, type = 'info') {
    DOM.messageText.textContent = msg;
    DOM.messageDisplay.className = 'fixed bottom-5 right-5 z-50 px-4 py-3 rounded-lg shadow-md transition-opacity duration-300';
    if (type === 'error') {
        DOM.messageDisplay.classList.add('bg-red-100', 'border', 'border-red-400', 'text-red-700');
    } else if (type === 'success') {
        DOM.messageDisplay.classList.add('bg-green-100', 'border', 'border-green-400', 'text-green-700');
    } else {
        DOM.messageDisplay.classList.add('bg-blue-100', 'border', 'border-blue-400', 'text-blue-700');
    }
    DOM.messageDisplay.classList.add('show');
    clearTimeout(DOM.messageDisplay.dataset.timeoutId);
    const timeoutId = setTimeout(() => DOM.messageDisplay.classList.remove('show'), 3000);
    DOM.messageDisplay.dataset.timeoutId = timeoutId;
}

// --- Main View Rendering ---
export function updateView() {
    if (!DOM.appView || (DOM.appView.classList.contains('hidden') && DOM.loginView.classList.contains('hidden'))) return;

    const isMonthView = state.currentView === 'month';
    DOM.monthViewBtn.classList.toggle('btn-primary', isMonthView);
    DOM.monthViewBtn.classList.toggle('btn-secondary', !isMonthView);
    DOM.dayViewBtn.classList.toggle('btn-primary', !isMonthView);
    DOM.dayViewBtn.classList.toggle('btn-secondary', isMonthView);

    DOM.calendarView.classList.toggle('hidden', !isMonthView);
    DOM.dailyView.classList.toggle('hidden', isMonthView);

    if (isMonthView) {
        DOM.currentPeriodDisplay.textContent = state.currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        renderCalendar();
    } else {
        DOM.currentPeriodDisplay.textContent = formatDateForDisplay(getYYYYMMDD(state.selectedDate));
        renderDailyActivities();
    }
}

// --- Calendar Rendering ---
function renderCalendar() {
    while (DOM.calendarView.children.length > 7) DOM.calendarView.removeChild(DOM.calendarView.lastChild);
    
    const year = state.currentMonth.getFullYear();
    const month = state.currentMonth.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const today = new Date();

    for (let i = 0; i < firstDayOfMonth.getDay(); i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'calendar-day-cell other-month';
        emptyCell.innerHTML = '<div class="calendar-day-content"></div>';
        DOM.calendarView.appendChild(emptyCell);
    }

    for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
        const date = new Date(year, month, day);
        const dateKey = getYYYYMMDD(date);
        const dayData = state.allStoredData[dateKey] || {};
        const noteText = dayData.note || '';
        const hasActivity = Object.keys(dayData).some(key => key !== '_userCleared' && key !== 'note' && dayData[key].text?.trim());

        const dayCell = document.createElement('div');
        dayCell.className = 'calendar-day-cell current-month';
        if (date.getDay() === 0) dayCell.classList.add('is-sunday');
        if (hasActivity) dayCell.classList.add('has-activity');
        if (getYYYYMMDD(date) === getYYYYMMDD(today)) dayCell.classList.add('is-today');
        if (getYYYYMMDD(date) === getYYYYMMDD(state.selectedDate) && state.currentView === 'day') dayCell.classList.add('selected-day');

        dayCell.innerHTML = `
            <div class="calendar-day-content">
                <div class="day-number">${day}</div>
                <div class="day-note-container">${noteText ? `<span class="day-note">${noteText}</span>` : ''}</div>
                ${hasActivity ? '<div class="activity-indicator"></div>' : ''}
            </div>`;
        dayCell.dataset.date = dateKey;
        dayCell.addEventListener('click', () => {
            setState({ selectedDate: date, currentView: 'day' });
            updateView();
        });
        DOM.calendarView.appendChild(dayCell);
    }

    const totalCells = firstDayOfMonth.getDay() + lastDayOfMonth.getDate();
    for (let i = 0; i < (7 - (totalCells % 7)) % 7; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'calendar-day-cell other-month';
        emptyCell.innerHTML = '<div class="calendar-day-content"></div>';
        DOM.calendarView.appendChild(emptyCell);
    }
}

// --- Daily Activities Rendering ---
function renderDailyActivities() {
    DOM.dailyActivityTableBody.innerHTML = '';
    const dateKey = getYYYYMMDD(state.selectedDate);
    const dailyActivitiesMap = state.allStoredData[dateKey] || {};
    let dailyActivitiesArray = [];

    DOM.dailyNoteInput.value = dailyActivitiesMap.note || '';

    const hasStoredActivities = Object.keys(dailyActivitiesMap).filter(key => key !== '_userCleared' && key !== 'note').length > 0;
    
    if (hasStoredActivities) {
        dailyActivitiesArray = Object.keys(dailyActivitiesMap)
            .filter(timeKey => timeKey !== '_userCleared' && timeKey !== 'note')
            .map(timeKey => ({ time: timeKey, ...dailyActivitiesMap[timeKey] }))
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    } else if (dailyActivitiesMap._userCleared !== true && state.selectedDate.getDay() !== 0) {
        for (let h = 8; h <= 17; h++) {
            dailyActivitiesArray.push({ time: `${String(h).padStart(2, '0')}:00-${String(h + 1).padStart(2, '0')}:00`, text: "", order: h - 8 });
        }
    }

    DOM.noDailyActivitiesMessage.classList.toggle('hidden', dailyActivitiesArray.length > 0);

    dailyActivitiesArray.forEach((activity, index) => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-100 transition-colors duration-150';
        row.draggable = true;
        row.dataset.time = activity.time;

        const isFirst = index === 0;
        const isLast = index === dailyActivitiesArray.length - 1;

        row.innerHTML = `
            <td class="py-3 px-4 whitespace-nowrap text-sm text-gray-900 border-b border-gray-100 cursor-text time-editable" data-time="${activity.time}" contenteditable="true">${activity.time}</td>
            <td class="py-3 px-4 text-sm text-gray-900 border-b border-gray-100">
                <div class="activity-text-editable" data-time="${activity.time}" contenteditable="true">${formatTextForDisplay(activity.text)}</div>
            </td>
            <td class="py-3 px-4 text-sm flex space-x-1 justify-center items-center">
                <button class="icon-btn move-up-btn" aria-label="Move Up" ${isFirst ? 'disabled' : ''}>
                    <svg class="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path></svg>
                </button>
                <button class="icon-btn move-down-btn" aria-label="Move Down" ${isLast ? 'disabled' : ''}>
                    <svg class="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                </button>
                <button class="icon-btn delete-btn delete" aria-label="Delete">
                    <svg class="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
            </td>`;
        DOM.dailyActivityTableBody.appendChild(row);
    });

    attachDailyActivityEventListeners();
    attachDragAndDropListeners();
}


// --- Daily Activity Event Handlers ---
function attachDailyActivityEventListeners() {
    DOM.dailyActivityTableBody.querySelectorAll('.activity-text-editable, .time-editable').forEach(el => {
        el.addEventListener('click', handleInlineEditClick);
        el.addEventListener('blur', handleInlineEditBlur);
        el.addEventListener('keydown', handleInlineEditKeydown);
    });
    DOM.dailyActivityTableBody.querySelectorAll('.move-up-btn').forEach(btn => btn.addEventListener('click', handleMoveUpClick));
    DOM.dailyActivityTableBody.querySelectorAll('.move-down-btn').forEach(btn => btn.addEventListener('click', handleMoveDownClick));
    DOM.dailyActivityTableBody.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', handleDeleteButtonClick));
}

function handleMoveUpClick(event) {
    const currentRow = event.currentTarget.closest('tr');
    if (currentRow.previousElementSibling) {
        DOM.dailyActivityTableBody.insertBefore(currentRow, currentRow.previousElementSibling);
        updateActivityOrder();
    }
}

function handleMoveDownClick(event) {
    const currentRow = event.currentTarget.closest('tr');
    if (currentRow.nextElementSibling) {
        DOM.dailyActivityTableBody.insertBefore(currentRow.nextElementSibling, currentRow);
        updateActivityOrder();
    }
}

function handleInlineEditClick(event) {
    const target = event.currentTarget;
    if (state.editingInlineTimeKey && state.editingInlineTimeKey !== target.dataset.time) {
        DOM.dailyActivityTableBody.querySelector(`[data-time="${state.editingInlineTimeKey}"]`)?.blur();
    }
    target.classList.add('editing');
    setState({ editingInlineTimeKey: target.dataset.time });
}

function handleInlineEditBlur(event) {
    const target = event.currentTarget;
    if (state.editingInlineTimeKey === target.dataset.time) {
        if (target.classList.contains('time-editable')) {
            saveData({ type: 'UPDATE_TIME', payload: { oldTimeKey: target.dataset.time, newTimeKey: target.innerText.trim() } });
        } else {
            saveData({ type: 'UPDATE_ACTIVITY_TEXT', payload: { timeKey: target.dataset.time, newText: target.innerText.trim() } });
        }
    }
    target.classList.remove('editing');
}

function handleInlineEditKeydown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        event.currentTarget.blur();
    }
}

function handleDeleteButtonClick(event) {
    const timeKey = event.currentTarget.closest('tr').dataset.time;
    deleteActivity(getYYYYMMDD(state.selectedDate), timeKey);
}

// --- Drag and Drop Handlers ---
function attachDragAndDropListeners() {
    DOM.dailyActivityTableBody.querySelectorAll('tr').forEach(row => {
        row.addEventListener('dragstart', handleDragStart);
        row.addEventListener('dragover', handleDragOver);
        row.addEventListener('dragleave', handleDragLeave);
        row.addEventListener('drop', handleDrop);
        row.addEventListener('dragend', handleDragEnd);
    });
}

function handleDragStart(e) {
    setState({ draggedItem: e.target.closest('tr') });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', state.draggedItem.dataset.time);
    state.draggedItem.classList.add('dragging');
}

function handleDragOver(e) {
    e.preventDefault();
    const targetRow = e.target.closest('tr');
    if (targetRow && targetRow !== state.draggedItem) {
        DOM.dailyActivityTableBody.querySelectorAll('.drag-over-top, .drag-over-bottom').forEach(row => row.classList.remove('drag-over-top', 'drag-over-bottom'));
        const rect = targetRow.getBoundingClientRect();
        targetRow.classList.add(e.clientY - rect.top < rect.height / 2 ? 'drag-over-top' : 'drag-over-bottom');
    }
}

function handleDragLeave(e) {
    e.target.closest('tr')?.classList.remove('drag-over-top', 'drag-over-bottom');
}

function handleDrop(e) {
    e.preventDefault();
    const targetRow = e.target.closest('tr');
    if (!targetRow || targetRow === state.draggedItem) return;

    const rect = targetRow.getBoundingClientRect();
    const dropBefore = e.clientY - rect.top < rect.height / 2;
    
    DOM.dailyActivityTableBody.querySelectorAll('.drag-over-top, .drag-over-bottom').forEach(row => row.classList.remove('drag-over-top', 'drag-over-bottom'));
    DOM.dailyActivityTableBody.insertBefore(state.draggedItem, dropBefore ? targetRow : targetRow.nextSibling);
    
    updateActivityOrder();
}

function handleDragEnd() {
    state.draggedItem?.classList.remove('dragging');
    setState({ draggedItem: null });
    DOM.dailyActivityTableBody.querySelectorAll('.drag-over-top, .drag-over-bottom').forEach(row => row.classList.remove('drag-over-top', 'drag-over-bottom'));
}

// --- Month Picker ---
export function renderMonthPicker() {
    DOM.monthGrid.innerHTML = '';
    DOM.pickerYearDisplay.textContent = state.pickerYear;
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    monthNames.forEach((name, index) => {
        const button = document.createElement('button');
        button.className = 'px-4 py-3 rounded-lg font-medium text-gray-800 bg-gray-100 hover:bg-blue-100 hover:text-blue-700';
        button.textContent = name;
        if (state.pickerYear === state.currentMonth.getFullYear() && index === state.currentMonth.getMonth()) {
            button.classList.add('bg-blue-500', 'text-white');
            button.classList.remove('bg-gray-100', 'text-gray-800');
        }
        button.addEventListener('click', () => {
            const newMonth = new Date(state.pickerYear, index, 1);
            const lastDayOfNewMonth = new Date(state.pickerYear, index + 1, 0).getDate();
            let newSelectedDate = new Date(state.selectedDate);
            if (newSelectedDate.getDate() > lastDayOfNewMonth) {
                newSelectedDate.setDate(lastDayOfNewMonth);
            }
            newSelectedDate.setMonth(index);
            newSelectedDate.setFullYear(state.pickerYear);

            setState({ currentMonth: newMonth, selectedDate: newSelectedDate });
            updateView();
            DOM.monthPickerModal.classList.add('hidden');
        });
        DOM.monthGrid.appendChild(button);
    });
}


// --- Utility Functions ---
export function getYYYYMMDD(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatDateForDisplay(dateString) {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' });
}

function formatTextForDisplay(text) {
    return (text || "").replace(/\n/g, '<br>');
}
