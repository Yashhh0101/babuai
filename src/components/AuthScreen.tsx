import React, { useState } from 'react';
import {
  Shield,
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Settings,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { FirebaseConfigModal } from './FirebaseConfigModal';

interface AuthScreenProps {
  onSuccess?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccess }) => {
  const {
    loginUser,
    registerUser,
    sendPasswordReset,
    resendVerification,
    error,
    clearError,
    isConfigured,
    enterGuestMode,
  } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [termsAccepted, setTermsAccepted] = useState(true);

  const [loading, setLoading] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [verificationPending, setVerificationPending] = useState(false);

  const validateEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setInfoMessage(null);

    if (!validateEmail(email)) {
      setInfoMessage('Please provide a valid email address.');
      return;
    }
    if (!password) {
      setInfoMessage('Please enter your password.');
      return;
    }

    setLoading(true);
    const ok = await loginUser(email, password, rememberMe);
    setLoading(false);
    if (ok && onSuccess) {
      onSuccess();
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setInfoMessage(null);

    if (!name.trim()) {
      setInfoMessage('Please enter your full name or nickname.');
      return;
    }
    if (!validateEmail(email)) {
      setInfoMessage('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setInfoMessage('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setInfoMessage('Passwords do not match. Please re-enter.');
      return;
    }
    if (!termsAccepted) {
      setInfoMessage('Please agree to the Terms of Service to proceed.');
      return;
    }

    setLoading(true);
    const res = await registerUser(name, email, password);
    setLoading(false);

    if (res.success) {
      if (res.requiresVerification) {
        setVerificationPending(true);
        setInfoMessage(res.message || 'Verification link sent! Please check your email.');
      } else if (onSuccess) {
        onSuccess();
      }
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setInfoMessage(null);

    if (!validateEmail(email)) {
      setInfoMessage('Please enter your registered email address.');
      return;
    }

    setLoading(true);
    const ok = await sendPasswordReset(email);
    setLoading(false);

    if (ok) {
      setInfoMessage('Password reset link sent! Check your email inbox to update your password.');
    }
  };

  const handleResendVerification = async () => {
    setLoading(true);
    const ok = await resendVerification();
    setLoading(false);
    if (ok) {
      setInfoMessage('A new verification email has been dispatched. Please check your inbox and spam folder.');
    }
  };

  return (
    <div className="min-h-screen min-h-dvh flex flex-col justify-center items-center p-4 sm:p-6 md:p-8 hud-grid-pattern relative">
      {/* Top right floating theme & config controls */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
        <button
          onClick={() => setShowConfigModal(true)}
          className="p-2 rounded-xl bg-slate-800/20 dark:bg-slate-800/80 hover:bg-slate-700/50 border border-slate-300/40 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs flex items-center gap-1.5 transition-colors"
          title="Firebase & Engine Settings"
        >
          <Settings className="w-4 h-4" />
          <span className="hidden sm:inline">Firebase Setup</span>
        </button>

        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl bg-slate-800/20 dark:bg-slate-800/80 hover:bg-slate-700/50 border border-slate-300/40 dark:border-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
          title="Toggle Light / Dark theme"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>

      <div className="w-full max-w-md my-auto">
        {/* Futuristic Brand Banner */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-400/30 text-sky-500 mb-3 shadow-[0_0_20px_rgba(56,189,248,0.25)]">
            <Shield className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center justify-center gap-2">
            <span>BABU AI</span>
            <span className="text-xs px-2 py-0.5 rounded-md font-mono bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
              JARVIS v2.0
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
            Autonomous, real-time voice intelligence addressing you as Baby
          </p>
        </div>

        {/* Auth Glass Card */}
        <div className="hud-panel rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
          {/* Top subtle HUD scanning accent line */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-sky-500 to-transparent opacity-75" />

          {/* Mode Switcher Tabs */}
          {mode !== 'forgot' && (
            <div className="grid grid-cols-2 p-1 bg-slate-200/50 dark:bg-slate-900/60 rounded-xl mb-6 border border-slate-300/40 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  clearError();
                  setInfoMessage(null);
                }}
                className={`py-2 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                  mode === 'login'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  clearError();
                  setInfoMessage(null);
                }}
                className={`py-2 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                  mode === 'register'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>
          )}

          {/* Error & Info Callouts */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {infoMessage && (
            <div className="mb-4 p-3 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-700 dark:text-sky-300 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-sky-500" />
              <div className="space-y-1">
                <span>{infoMessage}</span>
                {verificationPending && (
                  <div>
                    <button
                      type="button"
                      onClick={handleResendVerification}
                      disabled={loading}
                      className="text-sky-600 dark:text-sky-400 font-semibold underline hover:no-underline text-xs mt-1"
                    >
                      Resend verification email
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* LOGIN FORM */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tony@stark.com"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-sky-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      clearError();
                      setInfoMessage(null);
                    }}
                    className="text-xs text-sky-600 dark:text-sky-400 hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-sky-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300 dark:border-slate-700 dark:bg-slate-900"
                  />
                  <span>Remember Session</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-2.5 px-4 rounded-xl font-medium text-sm text-white bg-sky-600 hover:bg-sky-500 disabled:opacity-60 transition-all duration-200 shadow-[0_0_15px_rgba(2,132,199,0.3)] flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Authenticate</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* REGISTRATION FORM */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Full Name / Display Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Tony Stark"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-sky-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tony@stark.com"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-sky-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Password (min 6 characters)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-sky-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-sky-500 transition-colors"
                  />
                </div>
              </div>

              <div className="text-xs text-slate-600 dark:text-slate-400 pt-1">
                <label className="flex items-start gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300 dark:border-slate-700 dark:bg-slate-900 mt-0.5"
                  />
                  <span>
                    I accept the terms and understand Babu AI stores user sessions responsibly.
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-2.5 px-4 rounded-xl font-medium text-sm text-white bg-sky-600 hover:bg-sky-500 disabled:opacity-60 transition-all duration-200 shadow-[0_0_15px_rgba(2,132,199,0.3)] flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Create JARVIS Account</span>
                    <Sparkles className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* FORGOT PASSWORD FORM */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="text-left">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Reset Password
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Enter your email address and Firebase will transmit a secure password reset link.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Account Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tony@stark.com"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-sky-500 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl font-medium text-sm text-white bg-sky-600 hover:bg-sky-500 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span>Send Reset Email</span>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    clearError();
                    setInfoMessage(null);
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
                >
                  ← Return to Sign In
                </button>
              </div>
            </form>
          )}

          {/* Quick Guest Demo Option */}
          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800/80 text-center">
            <button
              type="button"
              onClick={() => {
                enterGuestMode('Baby');
                if (onSuccess) onSuccess();
              }}
              className="text-xs text-sky-600 dark:text-sky-400 hover:underline inline-flex items-center gap-1.5"
            >
              <span>Explore Instant Guest Session as Baby</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Firebase Config Notice or Status */}
        <div className="mt-4 text-center">
          {!isConfigured ? (
            <button
              onClick={() => setShowConfigModal(true)}
              className="text-xs text-amber-600 dark:text-amber-400 inline-flex items-center gap-1 hover:underline"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Firebase Auth not configured yet? Click for setup instructions</span>
            </button>
          ) : (
            <span className="text-xs text-slate-500 dark:text-slate-500">
              Connected to Firebase Auth Project
            </span>
          )}
        </div>
      </div>

      {/* Firebase Setup Modal */}
      {showConfigModal && (
        <FirebaseConfigModal onClose={() => setShowConfigModal(false)} />
      )}
    </div>
  );
};
