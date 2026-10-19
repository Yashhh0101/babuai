import React, { useState } from 'react';
import { X, Check, Copy, ExternalLink, ShieldAlert, Sparkles, Key } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { FirebaseConfig } from '../services/firebase';

interface Props {
  onClose: () => void;
}

export const FirebaseConfigModal: React.FC<Props> = ({ onClose }) => {
  const { configureFirebase, isConfigured } = useAuth();
  const [activeTab, setActiveTab] = useState<'instructions' | 'config'>('instructions');

  const [apiKey, setApiKey] = useState('');
  const [authDomain, setAuthDomain] = useState('');
  const [projectId, setProjectId] = useState('');
  const [appId, setAppId] = useState('');
  const [jsonConfig, setJsonConfig] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSaveJson = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsed = JSON.parse(jsonConfig);
      const cfg: FirebaseConfig = {
        apiKey: parsed.apiKey,
        authDomain: parsed.authDomain,
        projectId: parsed.projectId,
        storageBucket: parsed.storageBucket,
        messagingSenderId: parsed.messagingSenderId,
        appId: parsed.appId,
      };
      const ok = configureFirebase(cfg);
      if (ok) {
        setStatusMsg({ type: 'success', text: 'Firebase initialized successfully!' });
      } else {
        setStatusMsg({ type: 'error', text: 'Invalid configuration format. Make sure apiKey and projectId are present.' });
      }
    } catch {
      setStatusMsg({ type: 'error', text: 'Invalid JSON. Please verify syntax.' });
    }
  };

  const handleSaveFields = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey || !projectId) {
      setStatusMsg({ type: 'error', text: 'API Key and Project ID are mandatory.' });
      return;
    }
    const cfg: FirebaseConfig = {
      apiKey: apiKey.trim(),
      authDomain: authDomain.trim() || `${projectId.trim()}.firebaseapp.com`,
      projectId: projectId.trim(),
      appId: appId.trim(),
    };
    const ok = configureFirebase(cfg);
    if (ok) {
      setStatusMsg({ type: 'success', text: 'Firebase initialized successfully!' });
    } else {
      setStatusMsg({ type: 'error', text: 'Failed to initialize Firebase with these parameters.' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-6">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-500">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Firebase Authentication Setup
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Setup guide & configuration for BABU AI
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

        {/* Tab switcher */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-5 pt-3 gap-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('instructions')}
            className={`pb-2.5 transition-colors border-b-2 ${
              activeTab === 'instructions'
                ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            1. Setup Guide (7 Steps)
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`pb-2.5 transition-colors border-b-2 ${
              activeTab === 'config'
                ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            2. Enter Web Config
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 max-h-[70vh] overflow-y-auto space-y-4">
          {statusMsg && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                  : 'bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400'
              }`}
            >
              <span>{statusMsg.text}</span>
            </div>
          )}

          {activeTab === 'instructions' ? (
            <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300">
              <div className="p-3.5 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/40 text-sky-800 dark:text-sky-300 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 shrink-0 text-sky-500 mt-0.5" />
                <span>
                  Babu AI uses official Firebase Authentication for secure email registration, password login, email verification, and password resets. Follow these steps to configure your Firebase project:
                </span>
              </div>

              <ol className="space-y-3 list-decimal list-inside pl-1 leading-relaxed">
                <li className="pl-1">
                  <strong>Create a Firebase Project:</strong> Visit{' '}
                  <a
                    href="https://console.firebase.google.com"
                    target="_blank"
                    rel="noreferrer"
                    className="text-sky-600 dark:text-sky-400 underline inline-flex items-center gap-0.5"
                  >
                    console.firebase.google.com <ExternalLink className="w-3 h-3 inline" />
                  </a>{' '}
                  and click "Add project".
                </li>
                <li className="pl-1">
                  <strong>Register the Web App:</strong> In Project Overview, click the Web icon (<code>&lt;/&gt;</code>), choose a name like "Babu AI", and click Register.
                </li>
                <li className="pl-1">
                  <strong>Enable Email/Password Provider:</strong> Go to <strong>Authentication &gt; Sign-in method</strong>, click <strong>Email/Password</strong>, turn the switch to <strong>Enabled</strong>, and Save.
                </li>
                <li className="pl-1">
                  <strong>Configure Authorized Domain:</strong> Under Authentication &gt; Settings &gt; Authorized domains, add your application host URL (e.g. your Cloud Run or preview domain).
                </li>
                <li className="pl-1">
                  <strong>Configure Email Templates:</strong> Under Authentication &gt; Templates, review the "Email address verification" and "Password reset" email subjects and sender name.
                </li>
                <li className="pl-1">
                  <strong>Supply Environment Variables or Paste Config:</strong> Add <code>VITE_FIREBASE_API_KEY</code>, <code>VITE_FIREBASE_AUTH_DOMAIN</code>, <code>VITE_FIREBASE_PROJECT_ID</code> to your environment, OR switch to the "Enter Web Config" tab right here.
                </li>
                <li className="pl-1">
                  <strong>Verify in BABU AI:</strong> Test registration with your email, click the verification email link, and test password reset.
                </li>
              </ol>
            </div>
          ) : (
            <div className="space-y-4">
              <form onSubmit={handleSaveFields} className="space-y-3 text-xs">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Firebase API Key (apiKey)
                  </label>
                  <input
                    type="text"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Project ID (projectId)
                    </label>
                    <input
                      type="text"
                      value={projectId}
                      onChange={(e) => setProjectId(e.target.value)}
                      placeholder="babu-ai-app"
                      className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Auth Domain (authDomain)
                    </label>
                    <input
                      type="text"
                      value={authDomain}
                      onChange={(e) => setAuthDomain(e.target.value)}
                      placeholder="babu-ai-app.firebaseapp.com"
                      className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    App ID (appId - optional)
                  </label>
                  <input
                    type="text"
                    value={appId}
                    onChange={(e) => setAppId(e.target.value)}
                    placeholder="1:123456789:web:abcdef"
                    className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-sky-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition-colors shadow-sm"
                >
                  Save & Initialize Firebase
                </button>
              </form>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                <span className="text-xs font-semibold text-slate-500 block mb-1.5">
                  Or Paste firebaseConfig object JSON:
                </span>
                <form onSubmit={handleSaveJson} className="space-y-2">
                  <textarea
                    rows={4}
                    value={jsonConfig}
                    onChange={(e) => setJsonConfig(e.target.value)}
                    placeholder='{ "apiKey": "...", "authDomain": "...", "projectId": "..." }'
                    className="w-full p-2.5 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-sky-500"
                  />
                  <button
                    type="submit"
                    className="w-full py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium text-xs transition-colors"
                  >
                    Parse and Apply JSON
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                isConfigured ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
            <span className="text-slate-500 dark:text-slate-400">
              {isConfigured ? 'Firebase Active' : 'Not Configured (Demo Mode Available)'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
