import { doc, setDoc, deleteDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from './firebase-config.js';
import { state, setState } from './main.js';
import { showMessage, updateView, getYYYYMMDD, DOM, showAppView } from './ui.js';

// --- Data Subscription ---
export function subscribeToData(userId) {
    const userDocRef = doc(db, "users", userId);
    const unsubscribe = onSnapshot(userDocRef, (doc) => {
        const data = doc.exists() ? doc.data() : {};
        setState({ allStoredData: data });
        if (state.isOnlineMode) {
            updateView();
        }
    });
    setState({ unsubscribeFromFirestore: unsubscribe });
}

// --- Unified Save Function ---
export async function saveData(action) {
    let dataCopy = JSON.parse(JSON.stringify(state.allStoredData));
    const dateKey = getYYYYMMDD(state.selectedDate);
    let successMessage = null; // Variable to hold our success message

    const isNewDay = !dataCopy[dateKey] || (Object.keys(dataCopy[dateKey]).length === 0 && !dataCopy[dateKey]?._userCleared);

    if (isNewDay && (action.type === 'ADD_SLOT' || action.type === 'UPDATE_ACTIVITY_TEXT')) {
        dataCopy[dateKey] = {};
        if (state.selectedDate.getDay() !== 0) {
            for (let h = 8; h <= 17; h++) {
                const timeKey = `${String(h).padStart(2, '0')}:00-${String(h + 1).padStart(2, '0')}:00`;
                dataCopy[dateKey][timeKey] = { text: "", order: h - 8 };
            }
        }
    } else if (!dataCopy[dateKey]) {
        dataCopy[dateKey] = {};
    }

    switch (action.type) {
        case 'SAVE_NOTE': {
            if (action.payload) {
                dataCopy[dateKey].note = action.payload;
            } else {
                delete dataCopy[dateKey].note;
            }
            break; // No success message needed for this one
        }
        case 'ADD_SLOT': {
            let newTimeKey = "00:00", counter = 0;
            while (dataCopy[dateKey][newTimeKey]) {
                newTimeKey = `00:00-${++counter}`;
            }
            const existingKeys = Object.keys(dataCopy[dateKey]).filter(k => k !== '_userCleared' && k !== 'note');
            const maxOrder = existingKeys.length > 0 ? Math.max(...Object.values(dataCopy[dateKey]).filter(v => typeof v === 'object').map(v => v.order || 0)) : -1;
            dataCopy[dateKey][newTimeKey] = { text: "", order: maxOrder + 1 };
            delete dataCopy[dateKey]._userCleared;
            successMessage = "New slot added!"; // Set the message
            break;
        }
        case 'UPDATE_ACTIVITY_TEXT': {
            if (dataCopy[dateKey][action.payload.timeKey]) {
                dataCopy[dateKey][action.payload.timeKey].text = action.payload.newText;
            } else {
                const order = Object.keys(dataCopy[dateKey]).filter(k => k !== '_userCleared' && k !== 'note').length;
                dataCopy[dateKey][action.payload.timeKey] = { text: action.payload.newText, order };
            }
            delete dataCopy[dateKey]._userCleared;
            successMessage = "Activity updated!"; // Set the message
            break;
        }
        case 'UPDATE_TIME': {
            const { oldTimeKey, newTimeKey } = action.payload;
            if (!newTimeKey) {
                showMessage("Time cannot be empty.", 'error');
                return;
            }
            if (dataCopy[dateKey][newTimeKey] && oldTimeKey !== newTimeKey) {
                showMessage(`Time "${newTimeKey}" already exists.`, 'error');
                return;
            }
            const entry = dataCopy[dateKey][oldTimeKey];
            if (entry) {
                delete dataCopy[dateKey][oldTimeKey];
                dataCopy[dateKey][newTimeKey] = entry;
            }
            successMessage = "Time updated!"; // Set the message
            break;
        }
    }

    if (state.isOnlineMode && state.userId) {
        await saveDataToFirestore(dataCopy);
    } else {
        // Wrap offline logic in a promise to ensure it's async and animation plays
        await new Promise(resolve => {
            saveDataToLocalStorage(dataCopy);
            setState({ allStoredData: dataCopy });
            updateView();
            setTimeout(resolve, 50); // Small delay to ensure spinner is visible
        });
    }
    
    // Show the success message at the very end
    if (successMessage) {
        showMessage(successMessage, 'success');
    }
}

// --- Local & Firestore Helper Operations ---
function loadDataFromLocalStorage() {
    try {
        const storedData = localStorage.getItem('activityTrackerData');
        return storedData ? JSON.parse(storedData) : {};
    } catch (error) {
        console.error("Error loading local data:", error);
        showMessage("Could not load local data.", 'error');
        return {};
    }
}

function saveDataToLocalStorage(data) {
    try {
        localStorage.setItem('activityTrackerData', JSON.stringify(data));
    } catch (error) {
        console.error("Error saving local data:", error);
        showMessage("Could not save data locally.", 'error');
    }
}

async function saveDataToFirestore(data) {
    if (!state.userId) return;
    try {
        await setDoc(doc(db, "users", state.userId), data);
    } catch (error) {
        console.error("Error saving to Firestore:", error);
        showMessage("Error: Could not save data to the cloud.", 'error');
    }
}

// --- Standalone Data Functions ---
export function loadOfflineData() {
    localStorage.setItem('sessionMode', 'offline');
    const data = loadDataFromLocalStorage();
    setState({ allStoredData: data, isOnlineMode: false, userId: null });
    showAppView();
    setTimeout(updateView, 0);
}

export async function resetAllData() {
    if (state.isOnlineMode && state.userId) {
        try {
            await deleteDoc(doc(db, "users", state.userId));
            showMessage("All cloud data has been reset.", 'success');
        } catch (error) {
            showMessage("Failed to reset cloud data.", 'error');
        }
    } else {
        localStorage.removeItem('activityTrackerData');
        setState({ allStoredData: {} });
        updateView();
        showMessage("All local data has been reset.", 'success');
    }
    DOM.confirmResetModal.classList.add('hidden');
}

export function updateActivityOrder() {
    const dateKey = getYYYYMMDD(state.selectedDate);
    const dailyActivitiesMap = state.allStoredData[dateKey] || {};
    const orderedTimeKeys = Array.from(DOM.dailyActivityTableBody.children).map(row => row.dataset.time);
    
    let newDailyActivitiesMap = {};
    if (dailyActivitiesMap.note) newDailyActivitiesMap.note = dailyActivitiesMap.note;

    orderedTimeKeys.forEach((timeKey, index) => {
        const originalEntry = dailyActivitiesMap[timeKey] || { text: '' };
        newDailyActivitiesMap[timeKey] = { text: originalEntry.text, order: index };
    });

    if (dailyActivitiesMap._userCleared) newDailyActivitiesMap._userCleared = true;

    const updatedData = { ...state.allStoredData, [dateKey]: newDailyActivitiesMap };
    
    if (state.isOnlineMode && state.userId) {
        saveDataToFirestore(updatedData);
    } else {
        saveDataToLocalStorage(updatedData);
        setState({ allStoredData: updatedData });
    }
    showMessage("Activities reordered!", 'success');
}

export function deleteActivity(dateKey, timeKey) {
    const dataCopy = JSON.parse(JSON.stringify(state.allStoredData));
    if (dataCopy[dateKey]?.[timeKey]) {
        delete dataCopy[dateKey][timeKey];
        if (Object.keys(dataCopy[dateKey]).filter(k => k !== '_userCleared' && k !== 'note').length === 0) {
            dataCopy[dateKey]._userCleared = true;
        }

        if (state.isOnlineMode && state.userId) {
            saveDataToFirestore(dataCopy);
        } else {
            saveDataToLocalStorage(dataCopy);
            setState({ allStoredData: dataCopy });
            updateView();
        }
        showMessage("Activity deleted.", 'success');
    }
}

// --- CSV Helper Functions ---
function parseCsvLine(line) {
    const result = [];
    let inQuote = false, field = '';
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (inQuote && line[i + 1] === '"') {
                field += '"'; i++;
            } else {
                inQuote = !inQuote;
            }
        } else if (char === ',' && !inQuote) {
            result.push(field);
            field = '';
        } else {
            field += char;
        }
    }
    result.push(field);
    return result.map(f => f.trim().replace(/^"|"$/g, ''));
}

function parseDisplayDateToYYYYMMDD(displayDateStr) {
    const date = new Date(displayDateStr);
    return isNaN(date.getTime()) ? null : getYYYYMMDD(date);
}

function formatDateForDisplay(dateString) {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });
}

// --- Main CSV Export Function ---
export function downloadCSV() {
    let activitiesToExport = [];
    Object.keys(state.allStoredData).forEach(dateKey => {
        const dailyData = state.allStoredData[dateKey];
        Object.keys(dailyData)
            .filter(timeKey => timeKey !== '_userCleared' && timeKey !== 'note' && dailyData[timeKey].text?.trim())
            .forEach(timeKey => {
                activitiesToExport.push({ date: dateKey, time: timeKey, ...dailyData[timeKey] });
            });
    });

    if (activitiesToExport.length === 0) {
        return showMessage("No activities found to export.", 'info');
    }

    activitiesToExport.sort((a, b) => a.date.localeCompare(b.date) || (a.order ?? 0) - (b.order ?? 0));

    let csvContent = "data:text/csv;charset=utf-8,Date,Time,Activity\n";
    csvContent += activitiesToExport.map(entry => {
        const activity = `"${entry.text.replace(/"/g, '""')}"`;
        const displayDate = `"${formatDateForDisplay(entry.date)}"`;
        const time = `"${entry.time}"`;
        return `${displayDate},${time},${activity}`;
    }).join("\n");

    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `TimeBuddy_Export.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// --- Main CSV Import Function ---
export function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const csvContent = e.target.result;
        const dataCopy = JSON.parse(JSON.stringify(state.allStoredData));
        const lines = csvContent.split('\n').filter(line => line.trim());

        if (lines.length <= 1) {
            return showMessage("CSV file is empty or has no data.", 'error');
        }

        lines.slice(1).forEach(line => {
            const row = parseCsvLine(line);
            if (row.length < 3) return;

            const [displayDateStr, time, activityText] = row;
            const dateKey = parseDisplayDateToYYYYMMDD(displayDateStr);

            if (!dateKey || !time) {
                console.warn(`Skipping row with invalid date or time: ${line}`);
                return;
            }

            if (!dataCopy[dateKey]) {
                dataCopy[dateKey] = {};
            }

            const importedText = activityText.trim();
            if (dataCopy[dateKey][time]) {
                const existingText = dataCopy[dateKey][time].text.trim();
                if (existingText !== importedText && !existingText.includes(importedText)) {
                    dataCopy[dateKey][time].text = existingText ? `${existingText}\n${importedText}` : importedText;
                }
            } else {
                const order = Object.keys(dataCopy[dateKey]).filter(k => k !== '_userCleared' && k !== 'note').length;
                dataCopy[dateKey][time] = { text: importedText, order };
            }
        });

        if (state.isOnlineMode && state.userId) {
            saveDataToFirestore(dataCopy);
        } else {
            saveDataToLocalStorage(dataCopy);
            setState({ allStoredData: dataCopy });
            updateView();
        }
        showMessage("CSV data imported successfully!", 'success');
        event.target.value = '';
    };
    reader.onerror = () => showMessage("Error reading file.", 'error');
    reader.readAsText(file);
}
