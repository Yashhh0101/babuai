import React, { useState } from 'react';
import {
  X,
  User,
  Sliders,
  Volume2,
  Globe,
  ShieldCheck,
  LogOut,
  Mail,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { PWAInstallButton } from './PWAInstallButton';

interface SettingsModalProps {
  onClose: () => void;
  selectedVoice: string;
  onVoiceChange: (voice: string) => void;
  language: string;
  onLanguageChange: (lang: string) => void;
  assistantNickname: string;
  onNicknameChange: (name: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  onClose,
  selectedVoice,
  onVoiceChange,
  language,
  onLanguageChange,
  assistantNickname,
  onNicknameChange,
}) => {
  const { user, updateUserDisplayName, resendVerification, checkEmailVerified, logoutUser } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [displayName, setDisplayName] = useState(user?.displayName || 'Baby');
  const [nameSaved, setNameSaved] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifMessage, setVerifMessage] = useState<string | null>(null);

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (displayName.trim()) {
      await updateUserDisplayName(displayName.trim());
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 2000);
    }
  };

  const handleCheckVerification = async () => {
    setVerifying(true);
    setVerifMessage(null);
    const verified = await checkEmailVerified();
    setVerifying(false);
    if (verified) {
      setVerifMessage('Email verified successfully!');
    } else {
      setVerifMessage('Email not verified yet. Please check your inbox.');
    }
  };

  const handleResend = async () => {
    setVerifying(true);
    setVerifMessage(null);
    const sent = await resendVerification();
    setVerifying(false);
    if (sent) {
      setVerifMessage('Verification email resent. Please check your inbox.');
    } else {
      setVerifMessage('Failed to resend. Please wait a minute and retry.');
    }
  };

  const voices = [
    { id: 'Zephyr', name: 'Zephyr', desc: 'Calm, crisp & modern assistant (Default)' },
    { id: 'Fenrir', name: 'Fenrir', desc: 'Deep, resonant & authoritative' },
    { id: 'Puck', name: 'Puck', desc: 'Warm, energetic & lively' },
    { id: 'Charon', name: 'Charon', desc: 'Sophisticated & contemplative' },
    { id: 'Kore', name: 'Kore', desc: 'Bright, precise & articulate' },
  ];

  const languages = [
    { id: 'auto', name: 'Auto-Detect (English, Hindi, Hinglish)' },
    { id: 'en', name: 'English (US & International)' },
    { id: 'hi', name: 'Hindi (हिंदी)' },
    { id: 'hinglish', name: 'Hinglish (Natural conversational)' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-500">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                BABU AI Settings
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Personal preferences, voice tuning & account
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Settings Body */}
        <div className="p-5 max-h-[75vh] overflow-y-auto space-y-6 text-xs text-slate-700 dark:text-slate-300">
          {/* User Profile Section */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              <span>User Profile</span>
            </h3>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-900 dark:text-white block">
                    {user?.displayName || 'Baby'}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 text-xs">
                    {user?.email || 'Guest User'}
                  </span>
                </div>
                {user?.isGuest ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    Guest Mode
                  </span>
                ) : user?.emailVerified ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Verified
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Unverified
                  </span>
                )}
              </div>

              {/* Unverified actions */}
              {!user?.isGuest && !user?.emailVerified && (
                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-2">
                  <p className="text-[11px] text-amber-700 dark:text-amber-300">
                    Your email is not verified yet. Verification ensures full session protection.
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCheckVerification}
                      disabled={verifying}
                      className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-medium text-[11px] transition-colors flex items-center gap-1"
                    >
                      <RefreshCw className={`w-3 h-3 ${verifying ? 'animate-spin' : ''}`} />
                      Check Status
                    </button>
                    <button
                      onClick={handleResend}
                      disabled={verifying}
                      className="px-2.5 py-1 rounded bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium text-[11px] transition-colors"
                    >
                      Resend Email
                    </button>
                  </div>
                  {verifMessage && (
                    <p className="text-[11px] text-sky-600 dark:text-sky-400 font-medium">
                      {verifMessage}
                    </p>
                  )}
                </div>
              )}

              {/* Display Name Edit */}
              <form onSubmit={handleSaveName} className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your nickname (e.g. Tony)"
                  className="flex-1 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs transition-colors"
                >
                  {nameSaved ? 'Saved!' : 'Update'}
                </button>
              </form>
            </div>
          </section>

          {/* Assistant Persona & Nickname */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Persona & Call Name</span>
            </h3>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
              <label className="block text-slate-600 dark:text-slate-400 text-xs">
                How Babu addresses you (Default: <strong>Baby</strong>)
              </label>
              <input
                type="text"
                value={assistantNickname}
                onChange={(e) => onNicknameChange(e.target.value)}
                placeholder="Baby"
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-sky-500"
              />
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Babu greets you: "Hello, my name is Babu... And from now on, I'll call you {assistantNickname || 'Baby'}."
              </p>
            </div>
          </section>

          {/* Voice Personality */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5" />
              <span>Gemini Live Voice</span>
            </h3>

            <div className="space-y-2">
              {voices.map((v) => (
                <label
                  key={v.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedVoice === v.id
                      ? 'border-sky-500 bg-sky-500/10 text-slate-900 dark:text-white'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="voice"
                    value={v.id}
                    checked={selectedVoice === v.id}
                    onChange={() => onVoiceChange(v.id)}
                    className="mt-0.5 text-sky-600 focus:ring-sky-500"
                  />
                  <div>
                    <span className="font-semibold block">{v.name}</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">{v.desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </section>

          {/* Language Preference */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" />
              <span>Language Support</span>
            </h3>

            <select
              value={language}
              onChange={(e) => onLanguageChange(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-sky-500"
            >
              {languages.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </section>

          {/* Display & App Setup */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Appearance & Progressive Web App
            </h3>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div>
                <span className="font-semibold text-slate-900 dark:text-white block">Theme Mode</span>
                <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Current: {theme === 'dark' ? 'JARVIS Dark' : 'Clean Light'}
                </span>
              </div>
              <button
                onClick={toggleTheme}
                className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-medium transition-colors"
              >
                Switch to {theme === 'dark' ? 'Light' : 'Dark'}
              </button>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div>
                <span className="font-semibold text-slate-900 dark:text-white block">PWA Installation</span>
                <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Install BABU AI for standalone desktop & mobile access
                </span>
              </div>
              <PWAInstallButton />
            </div>
          </section>

          {/* Logout button */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <button
              onClick={() => {
                logoutUser();
                onClose();
              }}
              className="px-3.5 py-2 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-500/10 font-semibold text-xs flex items-center gap-1.5 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out & Terminate Session</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
