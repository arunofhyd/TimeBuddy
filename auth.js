import {
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { auth } from './firebase-config.js';
import { showMessage, setButtonLoadingState, showLoginView, handleUserLogin as uiHandleUserLogin } from './ui.js';
import { loadOfflineData } from './data.js';
import { state, setState } from './main.js';

function handleUserLogin(user) {
    localStorage.setItem('sessionMode', 'online');
    uiHandleUserLogin(user);
}

function handleUserLogout() {
    if (state.unsubscribeFromFirestore) {
        state.unsubscribeFromFirestore();
    }
    localStorage.removeItem('sessionMode');
    setState({
        allStoredData: {},
        userId: null,
        isOnlineMode: false,
        unsubscribeFromFirestore: null
    });
    showLoginView();
}

export function initAuth() {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe();
        if (user) {
            handleUserLogin(user);
        } else {
            const sessionMode = localStorage.getItem('sessionMode');
            if (sessionMode === 'offline') {
                loadOfflineData();
            } else {
                handleUserLogout();
            }
        }
    });
}

export async function signUpWithEmail(email, password) {
    const button = document.getElementById('email-signup-btn');
    if (!email || password.length < 6) {
        return showMessage("Email and a password of at least 6 characters are required.", 'error');
    }
    setButtonLoadingState(button, true);
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        handleUserLogin(userCredential.user);
    } catch (error) {
        showMessage(`Sign-up failed: ${error.message}`, 'error');
        setButtonLoadingState(button, false);
    }
}

export async function signInWithEmail(email, password) {
    const button = document.getElementById('email-signin-btn');
    if (!email || !password) {
        return showMessage("Email and password are required.", 'error');
    }
    setButtonLoadingState(button, true);
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        handleUserLogin(userCredential.user);
    } catch (error) {
        showMessage(`Sign-in failed: ${error.message}`, 'error');
        setButtonLoadingState(button, false);
    }
}

export async function resetPassword(email) {
    if (!email) {
        return showMessage("Please enter your email address.", 'info');
    }
    try {
        await sendPasswordResetEmail(auth, email);
        showMessage("Password reset email sent! Please check your inbox.", 'success');
    } catch (error) {
        showMessage(`Error sending reset email: ${error.message}`, 'error');
    }
}

export async function signInWithGoogle() {
    const button = document.getElementById('google-signin-btn');
    const provider = new GoogleAuthProvider();
    setButtonLoadingState(button, true);
    try {
        const result = await signInWithPopup(auth, provider);
        handleUserLogin(result.user);
    } catch (error) {
        showMessage(`Google sign-in failed: ${error.message}`, 'error');
        setButtonLoadingState(button, false);
    }
}

export async function appSignOut() {
    if (state.isOnlineMode) {
        try {
            await signOut(auth);
            handleUserLogout();
        } catch (error) {
            showMessage(`Sign-out failed: ${error.message}`, 'error');
        }
    } else {
        handleUserLogout();
    }
}
