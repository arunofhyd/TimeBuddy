// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAe3dgAsfpwNEw-QC6DuqLeQ8PtuZWIKfQ",
    authDomain: "timebuddyaoh.firebaseapp.com",
    projectId: "timebuddyaoh",
    storageBucket: "timebuddyaoh.appspot.com",
    messagingSenderId: "799969115640",
    appId: "1:799969115640:web:023d09796cd565e98fea0d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = firebaseConfig.appId;

// Export the instances to be used in other modules
export { auth, db, appId };
