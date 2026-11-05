/**
 * Web Audio API Sound Manager for ZORK CRAFT
 * Synthesizes retro gaming and Minecraft-style audio effects without external files.
 * Default: Sound is OFF. Respects user toggle everywhere.
 */

class SoundManager {
  private ctx: AudioContext | null = null;
  private isEnabled: boolean = false;

  constructor() {
    // Check localStorage preference, default is OFF
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('zork_sound_enabled');
      this.isEnabled = stored === 'true';
    }
  }

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggle(): boolean {
    this.isEnabled = !this.isEnabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('zork_sound_enabled', this.isEnabled ? 'true' : 'false');
    }
    if (this.isEnabled) {
      this.initContext();
      this.playClick();
    }
    return this.isEnabled;
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('zork_sound_enabled', enabled ? 'true' : 'false');
    }
    if (enabled) {
      this.initContext();
    }
  }

  public getEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Crisp UI Button Click (40ms 8-bit blip)
   */
  public playClick() {
    if (!this.isEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(480, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(840, this.ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.045);
    } catch {}
  }

  /**
   * Category Navigation Transition (Smooth chime)
   */
  public playCategory() {
    if (!this.isEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.05); // E5

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.13);
    } catch {}
  }

  /**
   * Modal Open Sweep
   */
  public playModal() {
    if (!this.isEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(580, now + 0.08);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
    } catch {}
  }

  /**
   * Download Handoff / Fanfare
   */
  public playDownload() {
    if (!this.isEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      [
        { f: 523.25, t: 0 },
        { f: 659.25, t: 0.08 },
        { f: 783.99, t: 0.16 },
        { f: 1046.5, t: 0.24 },
      ].forEach((note) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(note.f, now + note.t);

        gain.gain.setValueAtTime(0.14, now + note.t);
        gain.gain.exponentialRampToValueAtTime(0.001, now + note.t + 0.12);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(now + note.t);
        osc.stop(now + note.t + 0.13);
      });
    } catch {}
  }

  /**
   * Success Action Chord
   */
  public playSuccess() {
    if (!this.isEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      [587.33, 880.0].forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.06);

        gain.gain.setValueAtTime(0.12, now + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.15);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(now + i * 0.06);
        osc.stop(now + i * 0.06 + 0.16);
      });
    } catch {}
  }

  /**
   * Error Sound (Low buzz)
   */
  public playError() {
    if (!this.isEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.15);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.16);
    } catch {}
  }

  /**
   * Creeper Fuse Hiss (Bandpass white noise for 450ms)
   */
  public playHiss() {
    if (!this.isEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.45);
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2500, now);
      filter.Q.setValueAtTime(2.5, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.02, now);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.35);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      whiteNoise.start(now);
      whiteNoise.stop(now + 0.45);
    } catch {}
  }

  /**
   * Creeper Explosion Sound (Lowpass noise burst)
   */
  public playExplosion() {
    if (!this.isEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const bufferSize = this.ctx.sampleRate * 0.6;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(60, now + 0.55);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      whiteNoise.start(now);
      whiteNoise.stop(now + 0.6);
    } catch {}
  }
}

export const soundManager = new SoundManager();
