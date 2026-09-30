// Firebase configuration for WAFA frontend
import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAyMy6qkzlpzn9WPt0cJy6moHOxiOBI068",
  // The production Nginx server proxies /__/auth/ on this same domain.
  // Keeping the helper first-party makes redirect sign-in work in Safari.
  authDomain: typeof window !== 'undefined' && window.location.hostname === 'yourqcm.online'
    ? 'yourqcm.online'
    : 'elearning-8af75.firebaseapp.com',
  projectId: "elearning-8af75",
  storageBucket: "elearning-8af75.firebasestorage.app",
  messagingSenderId: "769145725342",
  appId: "1:769145725342:web:11047163a64fc25d5bb68f",
  measurementId: "G-996E4YCEWD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication with local persistence (keeps user logged in)
export const auth = getAuth(app);

// Set auth persistence to local (persists across browser sessions)
if (typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence).catch((error) => {
    console.error('Error setting auth persistence:', error);
  });
}

// Initialize Analytics (optional) - wrapped in try-catch to prevent blocking errors
let analytics = null;
if (typeof window !== 'undefined') {
  try {
    analytics = getAnalytics(app);
  } catch (error) {
    console.warn('Firebase Analytics initialization failed:', error.message);
    // Analytics is optional, app continues to work without it
  }
}

export { analytics };
export default app;
