// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: "cortext-ai-4a5b5.firebaseapp.com",
    projectId: "cortext-ai-4a5b5",
    storageBucket: "cortext-ai-4a5b5.firebasestorage.app",
    messagingSenderId: "598413403215",
    appId: "1:598413403215:web:cbd70e61747d7811dbf63a",
    measurementId: "G-LPNZKYLSZ5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth= getAuth(app);
export const googleProvider = new GoogleAuthProvider();