import React, { useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';

export type OrbState = 'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking' | 'disconnected' | 'error';

interface AIOrbProps {
  state: OrbState;
  inputLevel?: number; // 0.0 to 1.0 (from user mic)
  outputLevel?: number; // 0.0 to 1.0 (from Gemini speaking)
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg' | 'responsive';
}

export const AIOrb: React.FC<AIOrbProps> = ({
  state,
  inputLevel = 0,
  outputLevel = 0,
  onClick,
  size = 'responsive',
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Dynamic scale factor based on real audio amplitude
  const activeLevel = state === 'listening' ? inputLevel : state === 'speaking' ? outputLevel : 0;
  const pulseScale = 1 + activeLevel * 0.22;
  const coreScale = 1 + activeLevel * 0.35;
  const glowOpacity = Math.min(1, 0.4 + activeLevel * 0.6);

  // Status colors based on theme and state
  const colors = useMemo(() => {
    switch (state) {
      case 'error':
        return {
          primary: '#EF4444',
          secondary: '#F87171',
          core: '#FCA5A5',
          glow: 'rgba(239, 68, 68, 0.45)',
          track: 'rgba(239, 68, 68, 0.15)',
          label: 'System Alert',
        };
      case 'disconnected':
        return {
          primary: isDark ? '#475569' : '#64748B',
          secondary: isDark ? '#334155' : '#94A3B8',
          core: isDark ? '#64748B' : '#CBD5E1',
          glow: 'rgba(71, 85, 105, 0.2)',
          track: 'rgba(71, 85, 105, 0.1)',
          label: 'Standby / Offline',
        };
      case 'connecting':
        return {
          primary: '#F59E0B',
          secondary: '#FBBF24',
          core: '#FDE68A',
          glow: 'rgba(245, 158, 11, 0.45)',
          track: 'rgba(245, 158, 11, 0.15)',
          label: 'Synthesizing Link...',
        };
      case 'thinking':
        return {
          primary: '#8B5CF6',
          secondary: '#A78BFA',
          core: '#DDD6FE',
          glow: 'rgba(139, 92, 246, 0.45)',
          track: 'rgba(139, 92, 246, 0.15)',
          label: 'Processing Neural Core...',
        };
      case 'speaking':
        return {
          primary: isDark ? '#38BDF8' : '#0284C7',
          secondary: isDark ? '#7DD3FC' : '#38BDF8',
          core: '#FFFFFF',
          glow: isDark ? 'rgba(56, 189, 248, 0.65)' : 'rgba(2, 132, 199, 0.45)',
          track: 'rgba(56, 189, 248, 0.2)',
          label: 'Babu Speaking',
        };
      case 'listening':
        return {
          primary: '#10B981',
          secondary: '#34D399',
          core: '#A7F3D0',
          glow: 'rgba(16, 185, 129, 0.55)',
          track: 'rgba(16, 185, 129, 0.2)',
          label: 'Listening to Baby...',
        };
      case 'idle':
      default:
        return {
          primary: isDark ? '#38BDF8' : '#0284C7',
          secondary: isDark ? '#0EA5E9' : '#0369A1',
          core: isDark ? '#BAE6FD' : '#E0F2FE',
          glow: isDark ? 'rgba(56, 189, 248, 0.35)' : 'rgba(2, 132, 199, 0.2)',
          track: isDark ? 'rgba(56, 189, 248, 0.1)' : 'rgba(2, 132, 199, 0.1)',
          label: 'Ready for Prompt',
        };
    }
  }, [state, isDark]);

  // Size styling
  const sizeClasses = {
    sm: 'w-36 h-36',
    md: 'w-52 h-52',
    lg: 'w-72 h-72',
    responsive: 'w-48 h-48 sm:w-60 sm:h-60 md:w-72 md:h-72 lg:w-80 lg:h-80',
  }[size];

  return (
    <div className="flex flex-col items-center justify-center select-none">
      <div
        onClick={onClick}
        className={`relative ${sizeClasses} flex items-center justify-center cursor-pointer transition-transform duration-300 active:scale-95 group`}
        title={`Status: ${colors.label}`}
        role="button"
        tabIndex={0}
        aria-label={`Babu AI Assistant: ${colors.label}`}
      >
        {/* Ambient Glow Aura */}
        <div
          className="absolute inset-0 rounded-full blur-2xl transition-all duration-300 pointer-events-none"
          style={{
            backgroundColor: colors.glow,
            transform: `scale(${pulseScale * 1.1})`,
            opacity: glowOpacity,
          }}
        />

        {/* Dynamic Voice Wave Expansion Rings (Active when speaking or listening) */}
        {(state === 'speaking' || state === 'listening') && (
          <>
            <div
              className="absolute inset-0 rounded-full border border-sky-400/40 animate-ping pointer-events-none"
              style={{
                borderColor: colors.secondary,
                animationDuration: state === 'speaking' ? '1.8s' : '2.4s',
              }}
            />
            <div
              className="absolute -inset-4 rounded-full border border-sky-400/20 pointer-events-none transition-transform duration-150"
              style={{
                transform: `scale(${1 + activeLevel * 0.3})`,
                borderColor: colors.primary,
                opacity: activeLevel,
              }}
            />
          </>
        )}

        {/* SVG Multi-Layer JARVIS Arc Reactor Orb */}
        <svg
          viewBox="0 0 320 320"
          className="w-full h-full relative z-10 overflow-visible"
        >
          <defs>
            {/* Core Radial Gradient */}
            <radialGradient id={`core-grad-${state}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
              <stop offset="35%" stopColor={colors.core} stopOpacity="0.9" />
              <stop offset="70%" stopColor={colors.secondary} stopOpacity="0.6" />
              <stop offset="100%" stopColor={colors.primary} stopOpacity="0" />
            </radialGradient>

            {/* Sweep radar mask */}
            <linearGradient id="sweep-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colors.primary} stopOpacity="0.8" />
              <stop offset="100%" stopColor={colors.primary} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Layer 1: Outermost HUD Calibration Ring */}
          <circle
            cx="160"
            cy="160"
            r="152"
            fill="none"
            stroke={colors.track}
            strokeWidth="1.5"
          />

          {/* Layer 2: Rotating Outer Ring with Tick Segments */}
          <g
            className={state === 'connecting' ? 'animate-spin-fast' : 'animate-spin-slow'}
            style={{ transformOrigin: '160px 160px' }}
          >
            <circle
              cx="160"
              cy="160"
              r="142"
              fill="none"
              stroke={colors.primary}
              strokeWidth="2.5"
              strokeDasharray="18 10 32 14 60 16"
              strokeOpacity="0.75"
            />
            {/* Cardinal HUD markers */}
            <line x1="160" y1="12" x2="160" y2="24" stroke={colors.primary} strokeWidth="2.5" />
            <line x1="160" y1="296" x2="160" y2="308" stroke={colors.primary} strokeWidth="2.5" />
            <line x1="12" y1="160" x2="24" y2="160" stroke={colors.primary} strokeWidth="2.5" />
            <line x1="296" y1="160" x2="308" y2="160" stroke={colors.primary} strokeWidth="2.5" />
          </g>

          {/* Layer 3: Counter-Rotating Arc Segments */}
          <g
            className={state === 'thinking' ? 'animate-spin-reverse-fast' : 'animate-spin-reverse-slow'}
            style={{ transformOrigin: '160px 160px' }}
          >
            <circle
              cx="160"
              cy="160"
              r="122"
              fill="none"
              stroke={colors.secondary}
              strokeWidth="4"
              strokeDasharray="45 25 15 25 70 30"
              strokeLinecap="round"
              strokeOpacity="0.85"
            />
            <circle
              cx="160"
              cy="160"
              r="108"
              fill="none"
              stroke={colors.primary}
              strokeWidth="1.5"
              strokeDasharray="6 8"
              strokeOpacity="0.6"
            />
          </g>

          {/* Layer 4: Interactive Pulse Ring (Reactivity to Volume) */}
          <circle
            cx="160"
            cy="160"
            r={88 * pulseScale}
            fill="none"
            stroke={colors.secondary}
            strokeWidth={state === 'speaking' || state === 'listening' ? 3.5 : 2}
            strokeDasharray="40 12 24 12"
            strokeOpacity={0.8 + activeLevel * 0.2}
            style={{ transition: 'r 0.08s ease-out' }}
          />

          {/* Layer 5: Inner Reactor Chassis */}
          <circle
            cx="160"
            cy="160"
            r="66"
            fill="none"
            stroke={colors.primary}
            strokeWidth="3"
            strokeDasharray="20 10"
            strokeOpacity="0.9"
          />

          {/* Layer 6: Central Energy Core with Reactive Scale */}
          <g style={{ transformOrigin: '160px 160px', transform: `scale(${coreScale})`, transition: 'transform 0.08s ease-out' }}>
            {/* Core Ambient Fill */}
            <circle
              cx="160"
              cy="160"
              r="48"
              fill={`url(#core-grad-${state})`}
              className={state === 'idle' ? 'animate-pulse-halo' : ''}
            />

            {/* Core Hexagonal Filament/Triangle HUD */}
            <polygon
              points="160,126 189,178 131,178"
              fill="none"
              stroke={colors.core}
              strokeWidth="2.5"
              strokeOpacity="0.95"
            />

            {/* Glowing Core Dot */}
            <circle
              cx="160"
              cy="160"
              r="14"
              fill="#FFFFFF"
              stroke={colors.primary}
              strokeWidth="2"
            />
          </g>
        </svg>
      </div>

      {/* Futuristic Status Typography */}
      <div className="mt-3 flex items-center gap-2 text-xs font-mono tracking-wider uppercase">
        <span
          className="inline-block w-2 h-2 rounded-full"
          style={{
            backgroundColor: colors.primary,
            boxShadow: `0 0 8px ${colors.primary}`,
          }}
        />
        <span className="font-semibold text-slate-800 dark:text-slate-200">
          {colors.label}
        </span>
      </div>
    </div>
  );
};
