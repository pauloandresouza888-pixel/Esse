import type { Weather } from '../types';

export type SoundKind = 'ui' | 'place' | 'delete' | 'error' | 'success' | 'coin' | 'level' | 'thunder' | 'bird' | 'work' | 'rain';

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private ambience: GainNode | null = null;
  private rainGain: GainNode | null = null;
  private rainSource: AudioBufferSourceNode | null = null;
  private birdTimer: number | null = null;
  private enabled = false;
  private started = false;
  private weather: Weather = 'clear';
  private night = false;
  private lastBird = 0;

  get isEnabled() { return this.enabled; }

  unlock() {
    if (this.started) {
      void this.ctx?.resume();
      return;
    }
    if (typeof window === 'undefined') return;
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    try {
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.enabled ? 0.32 : 0;
      this.master.connect(this.ctx.destination);
      this.createAmbience();
      this.createRain();
      this.started = true;
      this.birdTimer = window.setInterval(() => this.maybeBird(), 3200);
      void this.ctx.resume();
    } catch {
      this.ctx = null;
    }
  }

  private createAmbience() {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    this.ambience = ctx.createGain();
    this.ambience.gain.value = 0.045;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 720;
    filter.Q.value = 0.4;
    this.ambience.connect(filter);
    filter.connect(this.master);

    [110, 164.81, 220, 329.63].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = i % 2 ? 'sine' : 'triangle';
      osc.frequency.value = freq;
      gain.gain.value = i === 0 ? 0.34 : 0.16;
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.045 + i * 0.018;
      lfoGain.gain.value = 0.08;
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      osc.connect(gain);
      gain.connect(this.ambience!);
      osc.start();
      lfo.start();
    });
  }

  private createRain() {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const length = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i += 1) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.2;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1400;
    this.rainGain = ctx.createGain();
    this.rainGain.gain.value = 0;
    source.connect(filter);
    filter.connect(this.rainGain);
    this.rainGain.connect(this.master);
    source.start();
    this.rainSource = source;
  }

  setEnabled(value: boolean) {
    this.enabled = value;
    if (!this.ctx || !this.master) {
      if (value) this.unlock();
      return;
    }
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(value ? 0.32 : 0, now, 0.15);
  }

  setEnvironment(weather: Weather, night: boolean) {
    this.weather = weather;
    this.night = night;
    if (!this.ctx || !this.rainGain || !this.ambience) return;
    const now = this.ctx.currentTime;
    const rainLevel = weather === 'storm' ? 0.32 : weather === 'rain' ? 0.2 : weather === 'cloudy' ? 0.025 : 0;
    this.rainGain.gain.setTargetAtTime(rainLevel, now, 0.7);
    this.ambience.gain.setTargetAtTime(night ? 0.026 : 0.045, now, 1.2);
  }

  private tone(freq: number, duration: number, type: OscillatorType, volume: number, delay = 0, endFreq?: number) {
    if (!this.ctx || !this.master || !this.enabled) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(30, endFreq), t + duration);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(volume, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t);
    osc.stop(t + duration + 0.03);
  }

  private noiseBurst(duration: number, volume: number, cutoff: number) {
    if (!this.ctx || !this.master || !this.enabled) return;
    const ctx = this.ctx;
    const length = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    source.connect(filter); filter.connect(gain); gain.connect(this.master);
    source.start();
  }

  private maybeBird() {
    if (!this.enabled || this.night || this.weather === 'storm') return;
    if (this.weather === 'rain' && Math.random() > 0.2) return;
    if (Math.random() > 0.55) return;
    const now = performance.now();
    if (now - this.lastBird < 6000) return;
    this.lastBird = now;
    this.play('bird');
  }

  play(kind: SoundKind) {
    if (!this.enabled) return;
    switch (kind) {
      case 'ui': this.tone(620, 0.07, 'sine', 0.06, 0, 480); break;
      case 'place': this.tone(390, 0.12, 'triangle', 0.09, 0, 620); this.tone(780, 0.08, 'sine', 0.035, 0.04); break;
      case 'delete': this.tone(320, 0.12, 'triangle', 0.07, 0, 150); break;
      case 'error': this.tone(190, 0.18, 'sawtooth', 0.055, 0, 110); break;
      case 'success': [523, 659, 784].forEach((f, i) => this.tone(f, 0.22, 'sine', 0.055, i * 0.09)); break;
      case 'coin': this.tone(880, 0.09, 'square', 0.035); this.tone(1320, 0.14, 'square', 0.028, 0.06); break;
      case 'level': [392, 523, 659, 880].forEach((f, i) => this.tone(f, 0.28, 'triangle', 0.05, i * 0.11)); break;
      case 'work': this.tone(220, 0.25, 'sine', 0.05, 0, 330); break;
      case 'thunder': this.noiseBurst(1.2, 0.16, 180); this.tone(58, 0.8, 'sine', 0.05, 0, 36); break;
      case 'bird': {
        const base = 1500 + Math.random() * 700;
        this.tone(base, 0.09, 'sine', 0.025, 0, base * 1.35);
        this.tone(base * 1.2, 0.08, 'sine', 0.02, 0.12, base * 0.9);
        break;
      }
      case 'rain': this.noiseBurst(0.4, 0.03, 900); break;
    }
  }

  dispose() {
    if (this.birdTimer !== null && typeof window !== 'undefined') window.clearInterval(this.birdTimer);
    try { this.rainSource?.stop(); } catch { /* já parado */ }
    void this.ctx?.close();
    this.ctx = null;
    this.started = false;
  }
}

export const audio = new AudioEngine();
