import React from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthScreen } from './components/AuthScreen';
import { Dashboard } from './components/Dashboard';
import { Shield, WifiOff } from 'lucide-react';

function AppContent() {
  const { user, loading } = useAuth();
  const [isOnline, setIsOnline] = React.useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen min-h-dvh flex flex-col items-center justify-center bg-[#070B14] text-white p-4">
        <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-400/30 flex items-center justify-center text-sky-400 mb-4 animate-pulse shadow-[0_0_30px_rgba(56,189,248,0.3)]">
          <Shield className="w-8 h-8" />
        </div>
        <div className="text-sm font-mono tracking-widest text-sky-400 uppercase">
          Initializing Babu AI...
        </div>
        <div className="text-xs text-slate-500 mt-1">
          Resolving credentials and live audio neural link
        </div>
      </div>
    );
  }

  return (
    <>
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-600 text-white text-xs px-4 py-1.5 flex items-center justify-center gap-2 shadow-lg">
          <WifiOff className="w-3.5 h-3.5" />
          <span>Offline Mode — Real-time Gemini Live voice features require an active internet connection.</span>
        </div>
      )}

      {!user ? <AuthScreen /> : <Dashboard />}
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
