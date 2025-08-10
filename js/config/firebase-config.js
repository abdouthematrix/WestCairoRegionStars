// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCiDNP9O-xRZrCNuGrdtiPrN9FBiVfEjfE",
    authDomain: "westcairostars.firebaseapp.com",
    projectId: "westcairostars",
    storageBucket: "westcairostars.firebasestorage.app",
    messagingSenderId: "145275818178",
    appId: "1:145275818178:web:78145f9c54f20b415aab5b"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = firebase.auth();
const db = firebase.firestore();

// Export for global access
window.firebase = firebase;
window.auth = auth;
window.db = db;