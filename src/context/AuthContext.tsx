import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  reload,
} from 'firebase/auth';
import { auth, isFirebaseConfigured, applyAuthPersistence, saveCustomFirebaseConfig, FirebaseConfig } from '../services/firebase';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
  isGuest?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  firebaseUser: User | null;
  loading: boolean;
  isConfigured: boolean;
  error: string | null;
  clearError: () => void;
  registerUser: (name: string, email: string, pass: string) => Promise<{ success: boolean; requiresVerification: boolean; message?: string }>;
  loginUser: (email: string, pass: string, rememberMe?: boolean) => Promise<boolean>;
  logoutUser: () => Promise<void>;
  resendVerification: () => Promise<boolean>;
  checkEmailVerified: () => Promise<boolean>;
  sendPasswordReset: (email: string) => Promise<boolean>;
  updateUserDisplayName: (name: string) => Promise<boolean>;
  enterGuestMode: (guestName?: string) => void;
  configureFirebase: (config: FirebaseConfig) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const mapAuthError = (errCode: string): string => {
  switch (errCode) {
    case 'auth/email-already-in-use':
      return 'An account already exists with this email address. Please sign in.';
    case 'auth/invalid-email':
      return 'The email address provided is invalid. Please double check.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters long and include numbers or symbols.';
    case 'auth/user-not-found':
      return 'No account was found with this email. Please check your spelling or register.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password credentials. Please try again.';
    case 'auth/too-many-requests':
      return 'Access temporarily paused due to multiple failed login attempts. Please wait a moment.';
    case 'auth/network-request-failed':
      return 'Network communication failure. Please verify your internet connection.';
    case 'auth/user-disabled':
      return 'This account has been disabled by an administrator.';
    case 'auth/requires-recent-login':
      return 'This action requires recent authentication. Please sign in again.';
    default:
      return 'An unexpected authentication error occurred. Please try again.';
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState<boolean>(isFirebaseConfigured());

  useEffect(() => {
    // Check if running in guest session from localStorage
    const savedGuest = localStorage.getItem('babu_guest_session');
    if (savedGuest) {
      try {
        const guestData = JSON.parse(savedGuest);
        setUser(guestData);
        setLoading(false);
      } catch {
        localStorage.removeItem('babu_guest_session');
      }
    }

    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        // Clear any guest session
        localStorage.removeItem('babu_guest_session');
        setUser({
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Baby',
          emailVerified: fbUser.emailVerified,
          isGuest: false,
        });
      } else {
        // Only set user to null if not in active guest session
        const activeGuest = localStorage.getItem('babu_guest_session');
        if (!activeGuest) {
          setUser(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const clearError = () => setError(null);

  const registerUser = async (name: string, email: string, pass: string) => {
    setError(null);
    if (!auth) {
      setError('Firebase Authentication is not configured yet. Please configure Firebase settings.');
      return { success: false, requiresVerification: false };
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      const newUser = userCredential.user;

      // Set display name
      if (name.trim()) {
        await updateProfile(newUser, { displayName: name.trim() });
      }

      // Send verification email
      try {
        await sendEmailVerification(newUser);
      } catch (verifErr) {
        console.warn('Email verification send issue:', verifErr);
      }

      setUser({
        uid: newUser.uid,
        email: newUser.email,
        displayName: name.trim() || newUser.email?.split('@')[0] || 'Baby',
        emailVerified: false,
        isGuest: false,
      });

      return {
        success: true,
        requiresVerification: true,
        message: 'Account created! We sent a verification link to your email. Please verify before continuing.',
      };
    } catch (err: unknown) {
      const errCode = (err as { code?: string })?.code || '';
      const friendly = mapAuthError(errCode);
      setError(friendly);
      return { success: false, requiresVerification: false, message: friendly };
    }
  };

  const loginUser = async (email: string, pass: string, rememberMe = true): Promise<boolean> => {
    setError(null);
    if (!auth) {
      setError('Firebase is not configured. Please enter your Firebase project credentials.');
      return false;
    }

    try {
      await applyAuthPersistence(rememberMe);
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), pass);
      const loggedUser = userCredential.user;

      setUser({
        uid: loggedUser.uid,
        email: loggedUser.email,
        displayName: loggedUser.displayName || loggedUser.email?.split('@')[0] || 'Baby',
        emailVerified: loggedUser.emailVerified,
        isGuest: false,
      });

      return true;
    } catch (err: unknown) {
      const errCode = (err as { code?: string })?.code || '';
      setError(mapAuthError(errCode));
      return false;
    }
  };

  const logoutUser = async (): Promise<void> => {
    setError(null);
    localStorage.removeItem('babu_guest_session');
    setUser(null);

    if (auth) {
      try {
        await signOut(auth);
      } catch (err) {
        console.warn('Logout warning:', err);
      }
    }
  };

  const resendVerification = async (): Promise<boolean> => {
    if (!auth?.currentUser) return false;
    try {
      await sendEmailVerification(auth.currentUser);
      return true;
    } catch (err) {
      console.warn('Resend verification error:', err);
      setError('Could not resend email verification right now. Please wait a minute and retry.');
      return false;
    }
  };

  const checkEmailVerified = async (): Promise<boolean> => {
    if (!auth?.currentUser) return false;
    try {
      await reload(auth.currentUser);
      const isVerified = auth.currentUser.emailVerified;
      if (user) {
        setUser({ ...user, emailVerified: isVerified });
      }
      return isVerified;
    } catch {
      return false;
    }
  };

  const sendPasswordReset = async (email: string): Promise<boolean> => {
    setError(null);
    if (!auth) {
      setError('Firebase Authentication is not configured.');
      return false;
    }

    try {
      await sendPasswordResetEmail(auth, email.trim());
      return true;
    } catch (err: unknown) {
      const errCode = (err as { code?: string })?.code || '';
      setError(mapAuthError(errCode));
      return false;
    }
  };

  const updateUserDisplayName = async (name: string): Promise<boolean> => {
    if (!name.trim()) return false;
    const cleanName = name.trim();

    if (auth?.currentUser) {
      try {
        await updateProfile(auth.currentUser, { displayName: cleanName });
      } catch (err) {
        console.warn('Failed to update Firebase profile:', err);
      }
    }

    if (user) {
      const updated = { ...user, displayName: cleanName };
      setUser(updated);
      if (user.isGuest) {
        localStorage.setItem('babu_guest_session', JSON.stringify(updated));
      }
    }
    return true;
  };

  const enterGuestMode = (guestName = 'Baby') => {
    const guestUser: AuthUser = {
      uid: 'guest-' + Date.now().toString(36),
      email: 'guest@babu.ai',
      displayName: guestName,
      emailVerified: true,
      isGuest: true,
    };
    setUser(guestUser);
    localStorage.setItem('babu_guest_session', JSON.stringify(guestUser));
  };

  const configureFirebase = (config: FirebaseConfig): boolean => {
    const res = saveCustomFirebaseConfig(config);
    setIsConfigured(res.isValid);
    if (!res.isValid) {
      setError('Invalid Firebase configuration values. Please check your API Key and Project ID.');
    } else {
      setError(null);
    }
    return res.isValid;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        loading,
        isConfigured,
        error,
        clearError,
        registerUser,
        loginUser,
        logoutUser,
        resendVerification,
        checkEmailVerified,
        sendPasswordReset,
        updateUserDisplayName,
        enterGuestMode,
        configureFirebase,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
