import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin SDK
let firebaseApp = null;

const getEnvironmentServiceAccount = () => {
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n').trim();

  if (!projectId || !clientEmail || !privateKey) return null;
  return { projectId, clientEmail, privateKey };
};

try {
  // Check if Firebase is already initialized
  if (!admin.apps.length) {
    const environmentServiceAccount = getEnvironmentServiceAccount();
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim()
      || path.join(__dirname, '..', 'firebase-service-account.json');
    let serviceAccount = environmentServiceAccount;
    let credentialSource = 'environment variables';

    if (!serviceAccount) {
      try {
        serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
        credentialSource = 'server-side service-account file';
      } catch (fileError) {
        if (fileError.code !== 'ENOENT') {
          console.error('Firebase service-account file could not be read:', fileError.message);
        }
      }
    }

    if (serviceAccount) {
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log(`Firebase Admin SDK initialized from ${credentialSource}`);
    } else {
      console.warn('Firebase Admin SDK is not configured. Provide server-side Firebase credentials.');
    }
  } else {
    firebaseApp = admin.app();
  }
} catch (error) {
  console.error('❌ Error initializing Firebase Admin SDK:', error.message);
}

/**
 * Verify Firebase ID token
 * @param {string} idToken - Firebase ID token from client
 * @returns {Promise<Object>} Decoded token with user info
 */
export const verifyFirebaseToken = async (idToken) => {
  if (!firebaseApp) {
    throw new Error('Firebase Admin SDK is not initialized');
  }
  
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    throw new Error(`Token verification failed: ${error.message}`);
  }
};

/**
 * Generate Firebase password reset link
 * @param {string} email - User's email address
 * @returns {Promise<string>} Password reset link
 */
export const generatePasswordResetLink = async (email) => {
  if (!firebaseApp) {
    throw new Error('Firebase Admin SDK is not initialized');
  }
  
  try {
    const link = await admin.auth().generatePasswordResetLink(email);
    return link;
  } catch (error) {
    throw new Error(`Failed to generate password reset link: ${error.message}`);
  }
};

/**
 * Get Firebase user by email
 * @param {string} email - User's email address
 * @returns {Promise<Object>} Firebase user record
 */
export const getFirebaseUserByEmail = async (email) => {
  if (!firebaseApp) {
    throw new Error('Firebase Admin SDK is not initialized');
  }
  
  try {
    const userRecord = await admin.auth().getUserByEmail(email);
    return userRecord;
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      return null;
    }
    throw new Error(`Failed to get Firebase user: ${error.message}`);
  }
};

/**
 * Check if Firebase is initialized
 * @returns {boolean}
 */
export const isFirebaseInitialized = () => {
  return firebaseApp !== null;
};

export default admin;
