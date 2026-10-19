import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Square,
  Volume2,
  VolumeX,
  Send,
  Trash2,
  ChevronDown,
  ChevronUp,
  Settings,
  Sun,
  Moon,
  Shield,
  Clock,
  Sparkles,
  AlertCircle,
  LogOut,
  Download,
  MessageSquare,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { AIOrb, OrbState } from './AIOrb';
import { AudioStreamer } from '../utils/audioStreamer';
import { SettingsModal } from './SettingsModal';
import { PWAInstallButton } from './PWAInstallButton';
import { FirebaseConfigModal } from './FirebaseConfigModal';

interface TranscriptItem {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: string;
}

export const Dashboard: React.FC = () => {
  const { user, logoutUser, resendVerification, checkEmailVerified, isConfigured } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Assistant & Voice Settings
  const [selectedVoice, setSelectedVoice] = useState('Zephyr');
  const [language, setLanguage] = useState('auto');
  const [assistantNickname, setAssistantNickname] = useState('Baby');

  // Live Session State
  const [orbState, setOrbState] = useState<OrbState>('disconnected');
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [inputLevel, setInputLevel] = useState(0);
  const [outputLevel, setOutputLevel] = useState(0);
  const [sessionSeconds, setSessionSeconds] = useState(0);

  // Transcript & Chat Fallback
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([
    {
      id: 'greeting',
      role: 'assistant',
      text: `Hello, my name is Babu. I'm your personal AI assistant. And from now on, I'll call you ${user?.displayName || 'Baby'}. How can I help you today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [textInput, setTextInput] = useState('');
  const [isSendingText, setIsSendingText] = useState(false);
  const [isTranscriptExpanded, setIsTranscriptExpanded] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals & Panels
  const [showSettings, setShowSettings] = useState(false);
  const [showFirebaseModal, setShowFirebaseModal] = useState(false);
  const [verifSent, setVerifSent] = useState(false);

  // Refs
  const audioStreamerRef = useRef<AudioStreamer | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);

  // Session duration timer
  useEffect(() => {
    if (isConnected) {
      timerRef.current = setInterval(() => {
        setSessionSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setSessionSeconds(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isConnected]);

  const formatSessionTime = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Add transcript item helper
  const addTranscript = useCallback((role: 'user' | 'assistant' | 'system', text: string) => {
    setTranscripts((prev) => [
      ...prev,
      {
        id: Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
        role,
        text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  }, []);

  // Cleanup on unmount or logout
  const terminateSession = useCallback(() => {
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        // Ignore
      }
      wsRef.current = null;
    }

    if (audioStreamerRef.current) {
      audioStreamerRef.current.stop();
      audioStreamerRef.current = null;
    }

    setIsConnected(false);
    setIsMuted(false);
    setInputLevel(0);
    setOutputLevel(0);
    setOrbState('disconnected');
  }, []);

  useEffect(() => {
    return () => terminateSession();
  }, [terminateSession]);

  // Establish Live Voice Connection
  const startLiveSession = async () => {
    try {
      setErrorMessage(null);
      setOrbState('connecting');

      // 1. Initialize Audio Engine
      const streamer = new AudioStreamer({
        onAudioChunk: (base64) => {
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'audio', audio: base64 }));
          }
        },
        onInputLevel: (level) => {
          setInputLevel(level);
          if (level > 0.08) {
            setOrbState('listening');
          } else if (outputLevel < 0.05) {
            setOrbState('idle');
          }
        },
        onOutputLevel: (level) => {
          setOutputLevel(level);
          if (level > 0.05) {
            setOrbState('speaking');
          } else if (inputLevel < 0.08) {
            setOrbState('idle');
          }
        },
      });

      audioStreamerRef.current = streamer;
      await streamer.startRecording();

      // 2. Open WebSocket connection to /api/live
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/live`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Gemini Live WebSocket opened');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'status') {
            if (data.status === 'ready') {
              setIsConnected(true);
              setOrbState('idle');
            } else if (data.status === 'disconnected') {
              terminateSession();
            }
          } else if (data.type === 'audio' && data.audio) {
            // Stream audio chunk through speaker
            streamer.playChunk(data.audio);
            setOrbState('speaking');
          } else if (data.type === 'interrupted') {
            // Immediate interruption handling
            streamer.stopPlayback();
            setOrbState('listening');
          } else if (data.type === 'transcript') {
            addTranscript(data.role || 'assistant', data.text);
          } else if (data.type === 'error') {
            console.error('Gemini Live server error:', data.message);
            setErrorMessage(data.message || 'Gemini Live communication failure.');
            setOrbState('error');
          }
        } catch (err) {
          console.warn('Error parsing incoming message:', err);
        }
      };

      ws.onerror = (e) => {
        console.error('WebSocket connection error:', e);
        setErrorMessage('Unable to connect to Gemini Live engine. Please check backend secrets.');
        setOrbState('error');
        terminateSession();
      };

      ws.onclose = () => {
        setIsConnected(false);
        setOrbState('disconnected');
      };
    } catch (err: unknown) {
      console.error('Failed to start Live session:', err);
      const msg = err instanceof Error ? err.message : 'Microphone access denied or network issue.';
      setErrorMessage(`Microphone permission required: ${msg}`);
      setOrbState('error');
      terminateSession();
    }
  };

  // Toggle Mute
  const handleToggleMute = () => {
    if (!audioStreamerRef.current) return;
    const next = !isMuted;
    audioStreamerRef.current.setMuted(next);
    setIsMuted(next);
    if (next) {
      setInputLevel(0);
      setOrbState('idle');
    }
  };

  // Stop Speaking (Manual Interruption)
  const handleInterrupt = () => {
    if (audioStreamerRef.current) {
      audioStreamerRef.current.stopPlayback();
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'interrupt' }));
    }
    setOutputLevel(0);
    setOrbState(isMuted ? 'idle' : 'listening');
  };

  // Send Text Fallback
  const handleSendText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || isSendingText) return;

    const query = textInput.trim();
    setTextInput('');
    addTranscript('user', query);

    // If live WebSocket is connected, pass through live session
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'text', text: query }));
      setOrbState('thinking');
      return;
    }

    // Otherwise use backend /api/chat fallback
    setIsSendingText(true);
    setOrbState('thinking');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: query }),
      });
      const data = await res.json();

      if (res.ok && data.reply) {
        addTranscript('assistant', data.reply);
        setOrbState('idle');
      } else {
        addTranscript('system', data.fallback || data.error || 'Babu AI encountered an error.');
        setOrbState('idle');
      }
    } catch {
      addTranscript('system', 'Connection to Babu server timed out.');
      setOrbState('error');
    } finally {
      setIsSendingText(false);
    }
  };

  // Clear Transcripts
  const handleClearTranscript = () => {
    setTranscripts([]);
  };

  // Resend verification banner action
  const handleResendVerif = async () => {
    const ok = await resendVerification();
    if (ok) {
      setVerifSent(true);
      setTimeout(() => setVerifSent(false), 4000);
    }
  };

  return (
    <div className="min-h-screen min-h-dvh flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] hud-grid-pattern relative">
      {/* 1. TOP BAR / HEADER */}
      <header className="sticky top-0 z-30 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Zone 1: Brand Wordmark */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-400/30 text-sky-500 flex items-center justify-center shadow-[0_0_12px_rgba(56,189,248,0.3)]">
              <Shield className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-base sm:text-lg text-slate-900 dark:text-white">
                BABU AI
              </span>
              <span className="hidden sm:inline-block text-[11px] font-mono text-sky-600 dark:text-sky-400">
                JARVIS CORE
              </span>
            </div>
          </div>

          {/* Zone 2: Connection Status & Timer */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono">
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected
                    ? 'bg-emerald-500 shadow-[0_0_8px_#10B981]'
                    : orbState === 'connecting'
                    ? 'bg-amber-500 animate-pulse'
                    : 'bg-slate-400 dark:bg-slate-600'
                }`}
              />
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {isConnected ? 'LIVE' : orbState === 'connecting' ? 'SYNC' : 'STANDBY'}
              </span>
            </div>

            {isConnected && (
              <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-600 dark:text-slate-400">
                <Clock className="w-3.5 h-3.5 text-sky-500" />
                <span>{formatSessionTime(sessionSeconds)}</span>
              </div>
            )}
          </div>

          {/* Zone 3: Header Controls (Theme, PWA, Settings, User Profile) */}
          <div className="flex items-center gap-2 shrink-0">
            <PWAInstallButton />

            {/* Theme switcher */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            {/* Settings trigger */}
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
              title="Settings & Persona"
              aria-label="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* User Profile & Logout */}
            <div className="flex items-center gap-2 pl-1 border-l border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setShowSettings(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 text-xs font-medium border border-sky-500/20 transition-colors"
                title="Account Settings"
              >
                <span className="max-w-[70px] sm:max-w-[100px] truncate">
                  {user?.displayName || 'Baby'}
                </span>
              </button>

              <button
                onClick={logoutUser}
                className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                title="Log Out"
                aria-label="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Unverified Email Warning Banner */}
      {!user?.isGuest && !user?.emailVerified && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-xs text-amber-800 dark:text-amber-300">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                Your email is unverified. Please check your inbox to protect your personal Babu sessions.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleResendVerif}
                className="underline hover:no-underline font-semibold"
              >
                {verifSent ? 'Verification link sent!' : 'Resend verification email'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Callout Banner */}
      {errorMessage && (
        <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2.5 text-xs text-red-600 dark:text-red-400">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* 2. MAIN WORKSPACE / RESPONSIVE LAYOUT */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col lg:grid lg:grid-cols-12 gap-6 items-stretch">
        {/* LEFT / CENTER PANE: AI ORB & VOICE CONTROLS (Columns 1-7 on desktop) */}
        <section className="lg:col-span-7 flex flex-col items-center justify-between hud-panel rounded-2xl p-6 sm:p-8 relative min-h-[420px] sm:min-h-[480px]">
          {/* Subtle Corner HUD Reticles */}
          <div className="absolute top-3 left-3 w-3 h-3 border-t-2 border-l-2 border-sky-500/40" />
          <div className="absolute top-3 right-3 w-3 h-3 border-t-2 border-r-2 border-sky-500/40" />
          <div className="absolute bottom-3 left-3 w-3 h-3 border-b-2 border-l-2 border-sky-500/40" />
          <div className="absolute bottom-3 right-3 w-3 h-3 border-b-2 border-r-2 border-sky-500/40" />

          {/* Subheader Voice Persona Bar */}
          <div className="w-full flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-mono">
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-sky-500" />
              <span>SYSTEM: {selectedVoice.toUpperCase()} / GEMINI-3.8-LIVE</span>
            </span>
            <span>USER ID: {user?.displayName || 'Baby'}</span>
          </div>

          {/* CENTER: ANIMATED JARVIS AI ORB */}
          <div className="my-auto py-6 flex flex-col items-center justify-center">
            <AIOrb
              state={orbState}
              inputLevel={inputLevel}
              outputLevel={outputLevel}
              onClick={isConnected ? handleInterrupt : startLiveSession}
            />

            {/* Quick interactive hint */}
            <p className="mt-4 text-xs text-slate-500 dark:text-slate-400 text-center max-w-xs">
              {!isConnected
                ? 'Tap the core or hit Start Voice below to begin speaking with Babu'
                : orbState === 'speaking'
                ? 'Babu is speaking. Speak or tap Stop to interrupt.'
                : isMuted
                ? 'Microphone is muted. Unmute to talk.'
                : 'Listening for Baby... Speak naturally in English, Hindi, or Hinglish.'}
            </p>
          </div>

          {/* BOTTOM: MAIN VOICE CONTROLS BAR */}
          <div className="w-full pt-4 border-t border-slate-200 dark:border-slate-800/80">
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
              {/* Main Voice Toggle Button */}
              {!isConnected ? (
                <button
                  onClick={startLiveSession}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold text-sm text-white bg-sky-600 hover:bg-sky-500 shadow-[0_0_20px_rgba(2,132,199,0.35)] active:scale-95 transition-all duration-200"
                >
                  <Mic className="w-5 h-5 animate-pulse" />
                  <span>Start Voice Session</span>
                </button>
              ) : (
                <>
                  {/* End Conversation */}
                  <button
                    onClick={terminateSession}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 transition-all duration-200"
                    title="End live voice session"
                  >
                    <Square className="w-4 h-4 fill-current" />
                    <span>End Voice</span>
                  </button>

                  {/* Mute / Unmute */}
                  <button
                    onClick={handleToggleMute}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 border ${
                      isMuted
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                    title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                  >
                    {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    <span>{isMuted ? 'Unmute' : 'Mute Mic'}</span>
                  </button>

                  {/* Stop Speaking / Interrupt */}
                  <button
                    onClick={handleInterrupt}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-200"
                    title="Interrupt current speech"
                  >
                    <VolumeX className="w-4 h-4" />
                    <span>Stop Speaking</span>
                  </button>
                </>
              )}
            </div>

            {/* Mobile Transcript Drawer Toggle */}
            <div className="mt-3 text-center lg:hidden">
              <button
                onClick={() => setIsTranscriptExpanded(!isTranscriptExpanded)}
                className="inline-flex items-center gap-1.5 text-xs text-sky-600 dark:text-sky-400 hover:underline py-1"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>
                  {isTranscriptExpanded ? 'Hide Conversation Transcript' : 'Show Conversation Transcript'}
                </span>
                {isTranscriptExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </section>

        {/* RIGHT PANE: CONVERSATION TRANSCRIPT & TEXT FALLBACK (Columns 8-12 on desktop) */}
        <section
          className={`lg:col-span-5 flex flex-col hud-panel rounded-2xl overflow-hidden transition-all duration-300 ${
            isTranscriptExpanded ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* Transcript Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-sky-500" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Live Transcript
              </h2>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleClearTranscript}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                title="Clear transcript history"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Transcript Message Scroll Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 max-h-[380px] lg:max-h-[500px] min-h-[220px]">
            {transcripts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <Sparkles className="w-6 h-6 mb-2 opacity-50" />
                <p className="text-xs">No active conversation messages yet.</p>
                <p className="text-[11px] text-slate-500 mt-1">Speak into your mic or type a prompt below.</p>
              </div>
            ) : (
              transcripts.map((item) => (
                <div
                  key={item.id}
                  className={`flex flex-col ${
                    item.role === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-slate-400 font-mono">
                    <span>{item.role === 'user' ? (user?.displayName || 'Baby') : item.role === 'assistant' ? 'BABU AI' : 'SYSTEM'}</span>
                    <span>·</span>
                    <span>{item.timestamp}</span>
                  </div>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                      item.role === 'user'
                        ? 'bg-sky-600 text-white rounded-br-sm'
                        : item.role === 'assistant'
                        ? 'bg-slate-100 dark:bg-slate-800/90 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700/60 rounded-bl-sm'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    {item.text}
                  </div>
                </div>
              ))
            )}
            <div ref={transcriptEndRef} />
          </div>

          {/* TEXT INPUT FALLBACK */}
          <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 pb-safe">
            <form onSubmit={handleSendText} className="flex items-center gap-2">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Ask Babu anything..."
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-sky-500 transition-colors"
              />
              <button
                type="submit"
                disabled={!textInput.trim() || isSendingText}
                className="p-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white transition-colors"
                title="Send message"
              >
                {isSendingText ? (
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </form>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="w-full border-t border-slate-200 dark:border-slate-800/80 py-3 px-6 text-center text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>BABU AI v2.0 — Powered by Google Gemini Live</span>
          <div className="flex items-center gap-4 text-[11px]">
            <button
              onClick={() => setShowFirebaseModal(true)}
              className="hover:underline text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
            >
              {isConfigured ? 'Firebase Active' : 'Setup Firebase Auth'}
            </button>
            <span>·</span>
            <span>Privacy Preserving</span>
          </div>
        </div>
      </footer>

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          selectedVoice={selectedVoice}
          onVoiceChange={setSelectedVoice}
          language={language}
          onLanguageChange={setLanguage}
          assistantNickname={assistantNickname}
          onNicknameChange={setAssistantNickname}
        />
      )}

      {/* Firebase Config Modal */}
      {showFirebaseModal && (
        <FirebaseConfigModal onClose={() => setShowFirebaseModal(false)} />
      )}
    </div>
  );
};
