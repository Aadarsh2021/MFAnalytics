// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";

// import { getFirestore } from "firebase/firestore"; // No longer used, moved to Supabase

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBEtlFx97cdZ6IbW-weRG_GL2wc3pYXGms",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "mf-p-13860.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "mf-p-13860",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "mf-p-13860.firebasestorage.app",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "113893156292",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:113893156292:web:a140dc179fd3a90fdcb091",
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-FV6XNZSHFS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
const auth = getAuth(app);

export { app, analytics, auth };
