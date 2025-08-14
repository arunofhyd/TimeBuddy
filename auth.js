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
import { showMessage, setButtonLoadingState, DOM, showLoginView, handleUserLogin as uiHandleUserLogin, setInputErrorState } from './ui.js';
import { loadOfflineData } from './data.js';
import { state, setState } from './main.js';

function handleUserLogin(user) {
    localStorage.setItem('sessionMode', 'online');
    uiHandleUserLogin(user); // Call the UI handler from ui.js
}

function handleUserLogout() {
    // Unsubscribe from any active listener to prevent memory leaks
    if (state.unsubscribeFromFirestore) {
        state.unsubscribeFromFirestore();
    }
    localStorage.removeItem('sessionMode');
    
    // Fully reset the application state to clear the old user's data
    setState({
        allStoredData: {},
        userId: null,
        isOnlineMode: false,
        unsubscribeFromFirestore: null
    });

    showLoginView();
}

// --- Initialize Auth and Session ---
export function initAuth() {
    // This listener runs once on page load to check the initial state
    const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe(); // Stop listening after the initial check
        if (user) {
            handleUserLogin(user);
        } else {
            const sessionMode = localStorage.getItem('sessionMode');
            if (sessionMode === 'offline') {
                loadOfflineData();
            } else {
                handleUserLogout(); // Show the login screen
            }
        }
    });
}

// --- Email/Password Auth with Loading State ---
export async function signUpWithEmail(email, password) {
    const button = DOM.emailSignupBtn;
    let hasError = false;
    if (!email) {
        setInputErrorState(document.getElementById('email-input'), true);
        hasError = true;
    }
    if (password.length < 6) {
        setInputErrorState(document.getElementById('password-input'), true);
        hasError = true;
    }
    if (hasError) {
        return showMessage("Email and a password of at least 6 characters are required.", 'error');
    }

    setButtonLoadingState(button, true, 'Sign Up');
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        handleUserLogin(userCredential.user); // Manually handle login
    } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
            showMessage("An account already exists with this email. Please sign in instead.", 'error');
        } else {
            showMessage(`Sign-up failed: ${error.message}`, 'error');
        }
    } finally {
        setButtonLoadingState(button, false);
    }
}

export async function signInWithEmail(email, password) {
    const button = DOM.emailSigninBtn;
    let hasError = false;
    if (!email) {
        setInputErrorState(document.getElementById('email-input'), true);
        hasError = true;
    }
    if (!password) {
        setInputErrorState(document.getElementById('password-input'), true);
        hasError = true;
    }
    if (hasError) {
        return showMessage("Email and password are required.", 'error');
    }

    setButtonLoadingState(button, true, 'Sign In');
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        handleUserLogin(userCredential.user); // Manually handle login
    } catch (error) {
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            showMessage("Incorrect email or password. Please try again.", 'error');
        } else {
            showMessage(`Sign-in failed: ${error.message}`, 'error');
        }
    } finally {
        setButtonLoadingState(button, false);
    }
}

export async function resetPassword(email) {
    const button = DOM.forgotPasswordBtn;
    if (!email) {
        setInputErrorState(document.getElementById('email-input'), true);
        return showMessage("Please enter your email address.", 'info');
    }
    setButtonLoadingState(button, true, 'Forgot Password?');
    try {
        await sendPasswordResetEmail(auth, email);
        showMessage("Password reset email sent! Please check your inbox.", 'success');
    } catch (error) {
        showMessage(`Error sending reset email: ${error.message}`, 'error');
    } finally {
        setButtonLoadingState(button, false);
    }
}

// --- Google Auth ---
export async function signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        handleUserLogin(result.user); // Manually handle login
    } catch (error) {
        showMessage(`Google sign-in failed: ${error.message}`, 'error');
    }
}

// --- Sign Out ---
export async function appSignOut() {
    if (state.isOnlineMode) {
        try {
            await signOut(auth);
            handleUserLogout();
        } catch (error) {
            showMessage(`Sign-out failed: ${error.message}`, 'error');
        }
    } else {
        // For offline mode, just clear the session and go to the login screen
        handleUserLogout();
    }
}
