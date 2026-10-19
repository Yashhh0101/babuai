/**
 * Firebase Authentication & Configuration Service
 * Provides full support for official Firebase Web SDK Auth with Email/Password,
 * persistent sessions, verification, and password resets.
 */
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from 'firebase/auth';

export interface FirebaseConfig {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

// Check for existing environment variables or stored settings
const getInitialConfig = (): FirebaseConfig => {
  const env = import.meta.env;
  const stored = typeof window !== 'undefined' ? localStorage.getItem('babu_custom_firebase_config') : null;

  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed.apiKey && parsed.projectId) {
        return parsed;
      }
    } catch {
      // Ignore parse error
    }
  }

  return {
    apiKey: env.VITE_FIREBASE_API_KEY || '',
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: env.VITE_FIREBASE_APP_ID || '',
  };
};

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;
let isConfigValid = false;

export const initializeFirebase = (customConfig?: FirebaseConfig): { app: FirebaseApp | null; auth: Auth | null; isValid: boolean } => {
  const config = customConfig || getInitialConfig();

  // Validate that essential credentials exist
  if (config.apiKey && config.apiKey.length > 5 && config.projectId) {
    try {
      if (!getApps().length) {
        firebaseApp = initializeApp(config);
      } else {
        firebaseApp = getApps()[0];
      }
      firebaseAuth = getAuth(firebaseApp);
      isConfigValid = true;
      return { app: firebaseApp, auth: firebaseAuth, isValid: true };
    } catch (err) {
      console.warn('Firebase initialization error:', err);
      isConfigValid = false;
      return { app: null, auth: null, isValid: false };
    }
  }

  isConfigValid = false;
  return { app: null, auth: null, isValid: false };
};

// Initial bootstrap
const initial = initializeFirebase();
export const app = initial.app;
export const auth = initial.auth;

export const isFirebaseConfigured = (): boolean => {
  return isConfigValid && !!auth;
};

export const saveCustomFirebaseConfig = (cfg: FirebaseConfig) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('babu_custom_firebase_config', JSON.stringify(cfg));
    return initializeFirebase(cfg);
  }
  return { app: null, auth: null, isValid: false };
};

export const applyAuthPersistence = async (rememberMe: boolean) => {
  if (!auth) return;
  try {
    const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
    await setPersistence(auth, persistence);
  } catch (err) {
    console.warn('Failed to set auth persistence:', err);
  }
};
