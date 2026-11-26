/**
 * Audio engine (Phase 1).
 *
 * Why procedural instead of MP3 files:
 *  - the initial load stays tiny (this file is ~4 KB of code, no binary assets);
 *  - no licensing questions for the lo-fi loop or the sound effects;
 *  - volumes, mute and ducking are simple parameters, and the mix adapts to the
 *    player's settings (music/effects sliders that already existed in Phase 0).
 *
 * How it works: everything is scheduled on the Web Audio clock with oscillators
 * and a tiny noise buffer. The music is a 4-bar lo-fi progression (Fmaj7, Em7,
 * Dm7, Cmaj7) with a soft bass, a pad and a brushed hi-hat; effects are short
 * envelopes (tap, step, eat, shower, sleep, complete, alert, tutorial).
 *
 * Browsers block audio until a user gesture: `unlock()` is called by the first
 * tap/click anywhere in the app. Everything degrades silently if Web Audio is
 * unavailable (older Safari in some modes, jsdom in tests).
 */
import { vibrate } from '@/platform/device';
import { useGameStore } from '@/stores/gameStore';

export type SoundName =
  | 'tap'
  | 'step'
  | 'eat'
  | 'shower'
  | 'sleep'
  | 'wake'
  | 'complete'
  | 'alert'
  | 'tutorial'
  | 'pause'
  | 'resume';

type AudioContextClass = typeof AudioContext;

class AudioEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicTimer: ReturnType<typeof setInterval> | null = null;
  private musicBar = 0;
  private musicStartedAt = 0;
  private musicEnabled = true;
  private noiseBuffer: AudioBuffer | null = null;

  /** Creates the context lazily (must happen inside a user gesture). */
  unlock(): void {
    if (this.context) {
      if (this.context.state === 'suspended') void this.context.resume();
      return;
    }
    const ContextClass: AudioContextClass | undefined =
      (globalThis as { AudioContext?: AudioContextClass; webkitAudioContext?: AudioContextClass })
        .AudioContext ??
      (globalThis as { webkitAudioContext?: AudioContextClass }).webkitAudioContext;
    if (!ContextClass) return;
    try {
      this.context = new ContextClass();
      this.master = this.context.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.context.destination);
      this.musicGain = this.context.createGain();
      this.musicGain.connect(this.master);
      this.sfxGain = this.context.createGain();
      this.sfxGain.connect(this.master);
      this.noiseBuffer = this.buildNoise();
      this.applySettings();
      this.startMusic();
    } catch {
      this.context = null;
    }
  }

  /** Reads the current volumes from the save (called on every settings change). */
  applySettings(): void {
    if (!this.context || !this.musicGain || !this.sfxGain) return;
    const settings = useGameStore.getState().save?.settings;
    const music = settings?.musicVolume ?? 0.5;
    const sfx = settings?.sfxVolume ?? 0.7;
    const now = this.context.currentTime;
    this.musicGain.gain.setTargetAtTime(this.musicEnabled ? music * 0.22 : 0, now, 0.2);
    this.sfxGain.gain.setTargetAtTime(sfx * 0.55, now, 0.05);
  }

  /** Music on/off (used by the pause button and by the "reduce motion" mode). */
  setMusicEnabled(enabled: boolean): void {
    this.musicEnabled = enabled;
    this.applySettings();
  }

  get isRunning(): boolean {
    return this.context !== null && this.context.state === 'running';
  }

  play(name: SoundName): void {
    const context = this.context;
    if (!context || !this.sfxGain || context.state !== 'running') return;
    const now = context.currentTime;
    switch (name) {
      case 'tap':
        this.blip(660, 0.06, now, 'sine', 0.5);
        break;
      case 'step':
        this.blip(220 + Math.random() * 40, 0.035, now, 'triangle', 0.25);
        break;
      case 'eat':
        this.blip(420, 0.09, now, 'triangle', 0.4);
        this.blip(520, 0.09, now + 0.1, 'triangle', 0.35);
        break;
      case 'shower':
        this.noise(now, 0.5, 0.16, 2400);
        break;
      case 'sleep':
        this.blip(392, 0.5, now, 'sine', 0.35);
        this.blip(329.6, 0.6, now + 0.18, 'sine', 0.3);
        this.blip(261.6, 0.8, now + 0.36, 'sine', 0.25);
        break;
      case 'wake':
        this.blip(523.3, 0.18, now, 'sine', 0.35);
        this.blip(659.3, 0.18, now + 0.14, 'sine', 0.32);
        this.blip(784, 0.3, now + 0.28, 'sine', 0.3);
        break;
      case 'complete':
        this.blip(587.3, 0.12, now, 'sine', 0.35);
        this.blip(880, 0.22, now + 0.1, 'sine', 0.3);
        break;
      case 'alert':
        this.blip(880, 0.08, now, 'square', 0.15);
        this.blip(880, 0.08, now + 0.14, 'square', 0.15);
        break;
      case 'tutorial':
        this.blip(659.3, 0.12, now, 'sine', 0.3);
        this.blip(784, 0.14, now + 0.09, 'sine', 0.3);
        this.blip(1046.5, 0.2, now + 0.18, 'sine', 0.25);
        break;
      case 'pause':
        this.blip(440, 0.1, now, 'sine', 0.25);
        this.blip(330, 0.14, now + 0.08, 'sine', 0.22);
        break;
      case 'resume':
        this.blip(330, 0.1, now, 'sine', 0.22);
        this.blip(440, 0.14, now + 0.08, 'sine', 0.25);
        break;
      default:
        break;
    }
  }

  /* ------------------------------------------------------------------ */
  /*                          MUSIC (LO-FI LOOP)                        */
  /* ------------------------------------------------------------------ */

  private startMusic(): void {
    if (!this.context || !this.musicGain) return;
    if (this.musicTimer) return;
    this.musicStartedAt = this.context.currentTime;
    this.scheduleBar();
    // One bar every 2.4 s — slow enough to feel like lo-fi, light on CPU.
    this.musicTimer = setInterval(() => this.scheduleBar(), 2400);
  }

  private scheduleBar(): void {
    const context = this.context;
    if (!context || !this.musicGain) return;
    if (!this.musicEnabled) return;
    const bar = this.musicBar % 4;
    this.musicBar += 1;
    const chords: number[][] = [
      [349.2, 440, 523.3, 659.3], // Fmaj7
      [329.6, 392, 493.9, 587.3], // Em7
      [293.7, 349.2, 440, 523.3], // Dm7
      [261.6, 329.6, 392, 493.9], // Cmaj7
    ];
    const chord = chords[bar] ?? chords[3]!;
    const start = context.currentTime + 0.05;
    // Soft pad: each note fades in and out across the bar.
    for (const frequency of chord) {
      this.pad(frequency, start, 2.3, 0.045);
    }
    // Bass on the first beat.
    this.blip(chord[0]! / 2, 1.1, start, 'sine', 0.16, this.musicGain);
    // Brushed hat on beats 2 and 4.
    this.noise(start + 0.6, 0.08, 0.05, 7000, this.musicGain);
    this.noise(start + 1.8, 0.08, 0.04, 7000, this.musicGain);
    // Sparse melody note, different each bar.
    const melody = [523.3, 587.3, 659.3, 493.9][bar] ?? 523.3;
    this.blip(melody, 0.5, start + 1.2, 'triangle', 0.07, this.musicGain);
    void this.musicStartedAt;
  }

  /* ------------------------------------------------------------------ */
  /*                             PRIMITIVES                             */
  /* ------------------------------------------------------------------ */

  private blip(
    frequency: number,
    duration: number,
    when: number,
    type: OscillatorType,
    volume: number,
    destination?: GainNode,
  ): void {
    const context = this.context;
    const target = destination ?? this.sfxGain;
    if (!context || !target) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, when);
    gain.gain.setValueAtTime(0, when);
    gain.gain.linearRampToValueAtTime(volume, when + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    oscillator.connect(gain);
    gain.connect(target);
    oscillator.start(when);
    oscillator.stop(when + duration + 0.02);
  }

  private pad(frequency: number, when: number, duration: number, volume: number): void {
    const context = this.context;
    if (!context || !this.musicGain) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, when);
    gain.gain.setValueAtTime(0, when);
    gain.gain.linearRampToValueAtTime(volume, when + 0.35);
    gain.gain.linearRampToValueAtTime(volume * 0.8, when + duration - 0.4);
    gain.gain.linearRampToValueAtTime(0, when + duration);
    oscillator.connect(gain);
    gain.connect(this.musicGain);
    oscillator.start(when);
    oscillator.stop(when + duration + 0.02);
  }

  private noise(
    when: number,
    duration: number,
    volume: number,
    highpass: number,
    destination?: GainNode,
  ): void {
    const context = this.context;
    const target = destination ?? this.sfxGain;
    if (!context || !target || !this.noiseBuffer) return;
    const source = context.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = context.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = highpass;
    const gain = context.createGain();
    gain.gain.setValueAtTime(volume, when);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(target);
    source.start(when);
    source.stop(when + duration + 0.02);
  }

  private buildNoise(): AudioBuffer | null {
    const context = this.context;
    if (!context) return null;
    const length = Math.floor(context.sampleRate * 1);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  /** Stops everything (used when leaving the game screen in tests). */
  stopMusic(): void {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}

export const audio = new AudioEngine();

/** Haptic feedback that respects the player's setting. */
export function hapticTap(pattern: number | number[] = 10): void {
  const haptics = useGameStore.getState().save?.settings.haptics ?? true;
  if (haptics) vibrate(pattern);
}

/** Namespaced helpers so screens read like `sound.play('eat')`. */
export const sound = {
  play: (name: SoundName) => audio.play(name),
  unlock: () => audio.unlock(),
  applySettings: () => audio.applySettings(),
  music: (enabled: boolean) => audio.setMusicEnabled(enabled),
  stop: () => audio.stopMusic(),
};

let unlocked = false;

/**
 * Installs a one-time gesture listener that unlocks the audio context.
 * Called from `main.tsx`; safe to call multiple times.
 */
export function installAudioUnlock(): void {
  if (unlocked || typeof document === 'undefined') return;
  const unlock = () => {
    audio.unlock();
    audio.applySettings();
    document.removeEventListener('pointerdown', unlock);
    document.removeEventListener('keydown', unlock);
    unlocked = true;
  };
  document.addEventListener('pointerdown', unlock, { once: false });
  document.addEventListener('keydown', unlock, { once: false });
}
