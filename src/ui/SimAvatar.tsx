import { useId } from 'react';
import { moodLabel } from '../game/constants';
import type { Sim } from '../game/types';

interface Props {
  sim: Sim;
  size?: number;
  showMood?: boolean;
  className?: string;
}

export function SimAvatar({ sim, size = 54, showMood = true, className = '' }: Props) {
  const id = useId().replace(/:/g, '');
  const a = sim.appearance;
  const mood = moodLabel(sim.mood);
  const hair = a.hair;
  const skin = a.skin;

  return (
    <span
      className={`sim-avatar ${className}`}
      style={{ width: size, height: size }}
      title={`${sim.name} · ${mood.label}`}
    >
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <defs>
          <linearGradient id={`bg-${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor={mood.color} stopOpacity="0.55" />
            <stop offset="1" stopColor="#1c2b36" stopOpacity="0.95" />
          </linearGradient>
          <linearGradient id={`shirt-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop stopColor={a.top} />
            <stop offset="1" stopColor={a.bottom} />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="18" fill={`url(#bg-${id})`} />
        <circle cx="32" cy="29" r="17" fill="#ffffff" opacity="0.08" />
        <path d="M10 64c2-13 10-20 22-20s20 7 22 20z" fill={`url(#shirt-${id})`} />
        <path d="M25 44h14v8H25z" fill={skin} opacity="0.96" />
        <path d="M23 47c3 4 15 4 18 0" fill="none" stroke={a.bottom} strokeWidth="3" opacity="0.45" />
        <ellipse cx="32" cy="27" rx="15" ry="17" fill={skin} />
        <ellipse cx="17.5" cy="28" rx="3.2" ry="5" fill={skin} />
        <ellipse cx="46.5" cy="28" rx="3.2" ry="5" fill={skin} />

        {a.hairStyle === 'long' && (
          <>
            <path d="M17 25c0-13 7-20 15-20s15 7 15 20v22c-3 2-6 2-9 1V25c-3-5-9-5-12 0v23c-3 1-6 1-9-1z" fill={hair} />
            <path d="M18 17c3-10 9-14 14-14s12 5 14 14c-5-5-9-7-14-7s-9 2-14 7z" fill={hair} />
          </>
        )}
        {a.hairStyle === 'wavy' && (
          <>
            <path d="M17 25c0-12 7-19 15-19s15 7 15 19c-3-2-5-6-5-10-4 5-15 7-20 3-1 4-3 6-5 7z" fill={hair} />
            <path d="M18 24c-2 8-1 14 2 18M46 24c2 8 1 14-2 18" stroke={hair} strokeWidth="5" strokeLinecap="round" fill="none" />
          </>
        )}
        {a.hairStyle === 'short' && (
          <path d="M17 25c0-12 7-19 15-19s15 7 15 19c-4-3-6-8-6-12-5 6-15 7-20 4 0 4-2 7-4 8z" fill={hair} />
        )}
        {a.hairStyle === 'fade' && (
          <>
            <path d="M18 22c1-11 7-16 14-16s13 5 14 16c-5-4-9-5-14-5s-9 1-14 5z" fill={hair} />
            <path d="M18 22h28" stroke="#000000" strokeOpacity="0.18" strokeWidth="2" />
          </>
        )}
        {a.hairStyle === 'bun' && (
          <>
            <circle cx="32" cy="7" r="7" fill={hair} />
            <path d="M18 24c0-12 6-18 14-18s14 6 14 18c-4-4-8-6-14-6s-10 2-14 6z" fill={hair} />
          </>
        )}
        {a.hairStyle === 'curly' && (
          <>
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <circle key={i} cx={19 + i * 4.4} cy={13 + (i % 2) * 3} r={5.4} fill={hair} />
            ))}
          </>
        )}

        <ellipse cx="26.5" cy="29" rx="3.3" ry="2.5" fill="#f7f3ec" />
        <ellipse cx="37.5" cy="29" rx="3.3" ry="2.5" fill="#f7f3ec" />
        <circle cx="26.8" cy="29" r="1.7" fill={a.eyes} />
        <circle cx="37.2" cy="29" r="1.7" fill={a.eyes} />
        <circle cx="27.2" cy="28.7" r="0.65" fill="#ffffff" />
        <circle cx="37.6" cy="28.7" r="0.65" fill="#ffffff" />
        <path d="M29 36c2 1.8 4 1.8 6 0" stroke="#a55e5b" strokeWidth="1.7" strokeLinecap="round" fill="none" />
        <ellipse cx="32" cy="32.5" rx="1.6" ry="2" fill={skin} opacity="0.72" />
        {a.freckles && (
          <>
            <circle cx="23" cy="32" r="0.75" fill="#9b644b" />
            <circle cx="25" cy="33.5" r="0.65" fill="#9b644b" />
            <circle cx="39" cy="32" r="0.75" fill="#9b644b" />
            <circle cx="41" cy="33.5" r="0.65" fill="#9b644b" />
          </>
        )}
        {a.glasses && (
          <>
            <circle cx="26.5" cy="29" r="5.2" fill="none" stroke="#3b4147" strokeWidth="1.6" />
            <circle cx="37.5" cy="29" r="5.2" fill="none" stroke="#3b4147" strokeWidth="1.6" />
            <path d="M31.7 29h0.6M21.3 28l-3-1M42.7 28l3-1" stroke="#3b4147" strokeWidth="1.5" fill="none" />
          </>
        )}
      </svg>
      {showMood && <span className="avatar-mood" style={{ background: mood.color }}>{mood.icon}</span>}
    </span>
  );
}
