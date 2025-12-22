// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBEtlFx97cdZ6IbW-weRG_GL2wc3pYXGms",
    authDomain: "mf-p-13860.firebaseapp.com",
    projectId: "mf-p-13860",
    storageBucket: "mf-p-13860.firebasestorage.app",
    messagingSenderId: "113893156292",
    appId: "1:113893156292:web:a140dc179fd3a90fdcb091",
    measurementId: "G-FV6XNZSHFS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Analytics defaults to check window object to avoid SSR errors
let analytics;
if (typeof window !== "undefined") {
    analytics = getAnalytics(app);
}

export { app, analytics };
