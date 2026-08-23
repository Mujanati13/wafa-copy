import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendEmailVerification,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  confirmPasswordReset,
  verifyPasswordResetCode,
  signOut as firebaseSignOut
} from 'firebase/auth';
import { auth } from '@/config/firebase';
import axios from 'axios';
import { userService } from '@/services/userService';
import { dashboardService } from '@/services/dashboardService';

const API_URL = import.meta.env.VITE_API_URL;

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();

/**
 * Register with email and password (using backend local strategy - no email verification required)
 */
export const registerWithEmail = async (email, password, userData) => {
  try {
    // First check with backend if email exists
    try {
      const checkResponse = await axios.post(`${API_URL}/auth/check-email`, { email });

      if (checkResponse.data.exists && checkResponse.data.authProvider === 'firebase') {
        throw new Error('Cette adresse email est déjà enregistrée avec Google. Veuillez utiliser le bouton "Continuer avec Google".');
      }
    } catch (checkError) {
      // If check endpoint doesn't exist or fails, continue with registration
      if (checkError.message && checkError.message.includes('Google')) {
        throw checkError;
      }
    }

    // Register directly with backend (email verification disabled)
    const response = await axios.post(`${API_URL}/auth/register`, {
      email,
      password,
      username: `${userData.firstName} ${userData.lastName}`.trim(),
      firstName: userData.firstName,
      lastName: userData.lastName,
      newsletter: userData.newsletter
    }, {
      withCredentials: true
    });

    return {
      success: true,
      user: response.data.user,
      needsVerification: response.data.requiresVerification || false, // Backend now returns false
      message: response.data.message || 'Inscription réussie! Vous pouvez maintenant vous connecter.'
    };
  } catch (error) {
    console.error('Registration error:', error);

    // Special handling for email already exists
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('Cette adresse email est déjà utilisée. Si vous vous êtes inscrit avec Google, veuillez utiliser le bouton "Continuer avec Google".');
    }

    throw handleAuthError(error);
  }
};

/**
 * Login with email and password (using backend local strategy - no email verification required)
 */
export const loginWithEmail = async (email, password) => {
  try {
    // Login directly with backend (MongoDB + Passport local strategy)
    const response = await axios.post(`${API_URL}/auth/login`, {
      email,
      password
    }, {
      withCredentials: true
    });

    // Store JWT token
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }

    // Ensure stale dashboard/profile caches are reset for the new session.
    dashboardService.clearCache();
    userService.clearProfileCache();

    return {
      success: true,
      user: response.data.user,
      token: response.data.token,
      needsVerification: false
    };
  } catch (error) {
    console.error('Login error:', error);
    throw handleAuthError(error);
  }
};

/**
 * Login with Google
 */
export const loginWithGoogle = async () => {
  try {
    // Sign in with Google popup
    const result = await signInWithPopup(auth, googleProvider);

    // Get Firebase ID token
    const idToken = await result.user.getIdToken();

    // Authenticate with backend
    const response = await axios.post(`${API_URL}/auth/firebase`, {
      idToken
    }, {
      withCredentials: true
    });

    // Store JWT token
    localStorage.setItem('token', response.data.token);

    // Ensure stale dashboard/profile caches are reset for the new session.
    dashboardService.clearCache();
    userService.clearProfileCache();

    return {
      success: true,
      user: response.data.user,
      token: response.data.token
    };
  } catch (error) {
    console.error('Google login error:', error);
    throw handleAuthError(error);
  }
};

/**
 * Resend email verification
 */
export const resendVerificationEmail = async (email = null) => {
  try {
    // If no user is logged in, try to sign in first
    let user = auth.currentUser;

    if (!user && email) {
      // User needs to be signed in to resend verification
      throw new Error('Veuillez vous reconnecter pour renvoyer l\'email de vérification');
    }

    if (!user) {
      throw new Error('Aucun utilisateur connecté');
    }

    // Reload user to check current verification status
    await user.reload();

    if (user.emailVerified) {
      throw new Error('Email déjà vérifié');
    }

    // Configure action code settings
    const actionCodeSettings = {
      url: `${window.location.origin}/login?verified=true`,
      handleCodeInApp: false,
    };

    await sendEmailVerification(user, actionCodeSettings);

    return {
      success: true,
      message: 'Email de vérification envoyé avec succès'
    };
  } catch (error) {
    console.error('Resend verification error:', error);
    throw handleAuthError(error);
  }
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (email) => {
  try {
    const actionCodeSettings = {
      url: `${window.location.origin}/login?reset=true`,
      handleCodeInApp: false,
    };

    await firebaseSendPasswordResetEmail(auth, email, actionCodeSettings);

    return {
      success: true,
      message: 'Email de réinitialisation envoyé avec succès'
    };
  } catch (error) {
    console.error('Password reset error:', error);
    throw handleAuthError(error);
  }
};

/**
 * Verify password reset code
 */
export const verifyPasswordResetCodeService = async (oobCode) => {
  try {
    const email = await verifyPasswordResetCode(auth, oobCode);

    return {
      success: true,
      email
    };
  } catch (error) {
    console.error('Verify password reset code error:', error);
    throw handleAuthError(error);
  }
};

/**
 * Confirm password reset with new password
 */
export const confirmPasswordResetService = async (oobCode, newPassword) => {
  try {
    await confirmPasswordReset(auth, oobCode, newPassword);

    return {
      success: true,
      message: 'Mot de passe réinitialisé avec succès'
    };
  } catch (error) {
    console.error('Confirm password reset error:', error);
    throw handleAuthError(error);
  }
};

/**
 * Sign out
 */
export const signOut = async () => {
  try {
    // Call backend logout endpoint to destroy session
    try {
      await axios.post(`${API_URL}/auth/logout`, {}, {
        withCredentials: true,
        headers: localStorage.getItem('token')
          ? { Authorization: `Bearer ${localStorage.getItem('token')}` }
          : undefined
      });
    } catch (logoutError) {
      console.error('Backend logout error:', logoutError);
      // Continue with local cleanup even if backend logout fails
    }

    // Also attempt Firebase sign out if user has a Firebase session
    try {
      await firebaseSignOut(auth);
    } catch (firebaseError) {
      console.error('Firebase sign out error:', firebaseError);
    }

    // Clear all auth tokens and user data
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userProfile');
    localStorage.removeItem('pendingVerificationEmail');
    dashboardService.clearCache();
    userService.clearProfileCache();
    window.dispatchEvent(new Event('auth-state-changed'));
    
    // Clear all user-specific exam progress data
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('exam_progress_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));

    return {
      success: true,
      message: 'Déconnexion réussie'
    };
  } catch (error) {
    console.error('Sign out error:', error);
    // Force local cleanup even on error
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userProfile');
    dashboardService.clearCache();
    userService.clearProfileCache();
    window.dispatchEvent(new Event('auth-state-changed'));
    throw handleAuthError(error);
  }
};

/**
 * Get current user
 */
export const getCurrentUser = () => {
  return auth.currentUser;
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = () => {
  return auth.currentUser !== null && localStorage.getItem('token') !== null;
};

/**
 * Handle Firebase auth errors
 */
const handleAuthError = (error) => {
  // Handle axios errors from backend API
  if (error.response) {
    // Backend returned an error response
    const message = error.response.data?.message || error.response.data?.error;
    if (message) {
      const authError = new Error(message);
      authError.code = error.response.data?.code;
      authError.activeSession = error.response.data?.activeSession;
      authError.status = error.response.status;
      return authError;
    }
  }

  // Handle Firebase errors (for Google login)
  const errorMessages = {
    'auth/email-already-in-use': 'Cette adresse email est déjà utilisée. Essayez de vous connecter ou utilisez "Mot de passe oublié".',
    'auth/invalid-email': 'Adresse email invalide',
    'auth/operation-not-allowed': 'Opération non autorisée',
    'auth/weak-password': 'Le mot de passe doit contenir au moins 6 caractères',
    'auth/user-disabled': 'Ce compte a été désactivé',
    'auth/user-not-found': 'Aucun compte trouvé avec cet email',
    'auth/wrong-password': 'Mot de passe incorrect',
    'auth/invalid-credential': 'Email ou mot de passe incorrect',
    'auth/too-many-requests': 'Trop de tentatives. Veuillez réessayer plus tard',
    'auth/network-request-failed': 'Erreur de connexion réseau',
    'auth/popup-closed-by-user': 'Connexion annulée',
    'auth/cancelled-popup-request': 'Connexion annulée',
    'auth/account-exists-with-different-credential': 'Un compte existe déjà avec cette adresse email mais avec une méthode de connexion différente'
  };

  return new Error(errorMessages[error.code] || error.message || 'Une erreur est survenue');
};
