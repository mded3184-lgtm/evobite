/**
 * Procedural sound effects via Web Audio. No audio files: every sound is a few oscillators
 * or a noise burst with an envelope, so the game stays tiny and loads instantly.
 *
 * Browsers only allow audio after a user gesture, so the context is created in `unlock()`,
 * which the UI calls from the Play button click.
 */
type Wave = OscillatorType;

interface ToneOpts {
  freq: number;
  /** Frequency to glide to over the duration. */
  to?: number;
  dur: number;
  type?: Wave;
  gain?: number;
  delay?: number;
}

export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private boostNode: { src: AudioBufferSourceNode; gain: GainNode } | null = null;
  private lastOrbAt = 0;
  private orbStreak = 0;
  private _muted: boolean;
  /** Muted by the platform (CrazyGames audio setting), independent of the player's toggle. */
  private platformMuted = false;

  constructor(muted = false) {
    this._muted = muted;
  }

  get muted(): boolean {
    return this._muted;
  }

  setMuted(muted: boolean): void {
    this._muted = muted;
    this.applyVolume();
  }

  setPlatformMuted(muted: boolean): void {
    this.platformMuted = muted;
    this.applyVolume();
  }

  /** True when no sound should play, for either reason. */
  get silent(): boolean {
    return this._muted || this.platformMuted;
  }

  private applyVolume(): void {
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this.silent ? 0 : 0.5, this.ctx.currentTime, 0.02);
    }
    if (this.silent) this.boost(false);
  }

  /** Must be called from a user gesture (click / key / touch). Safe to call repeatedly. */
  unlock(): void {
    if (!this.ctx) {
      // Older Safari exposes only the prefixed constructor.
      const w = window as unknown as {
        AudioContext?: typeof AudioContext;
        webkitAudioContext?: typeof AudioContext;
      };
      const Ctor = w.AudioContext ?? w.webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.silent ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
      this.noiseBuffer = this.makeNoise();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  /** Silence everything (e.g. while an ad plays or the tab is hidden). */
  suspend(): void {
    this.boost(false);
    if (this.ctx?.state === 'running') void this.ctx.suspend();
  }

  resume(): void {
    if (this.ctx?.state === 'suspended') void this.ctx.resume();
  }

  // ---- game sounds -------------------------------------------------------

  /** Soft blip; pitch climbs during a quick eating streak, which feels great. */
  orb(): void {
    const now = performance.now();
    if (now - this.lastOrbAt < 45) return;
    this.orbStreak = now - this.lastOrbAt < 400 ? Math.min(this.orbStreak + 1, 12) : 0;
    this.lastOrbAt = now;
    const f = 520 * Math.pow(2, this.orbStreak / 12);
    this.tone({ freq: f, to: f * 1.5, dur: 0.07, type: 'sine', gain: 0.18 });
  }

  chomp(): void {
    this.noise({ dur: 0.12, gain: 0.35, filter: 900 });
    this.tone({ freq: 220, to: 90, dur: 0.18, type: 'square', gain: 0.12 });
  }

  revenge(): void {
    this.chomp();
    [523, 659, 784, 1047].forEach((f, i) => {
      this.tone({ freq: f, dur: 0.12, type: 'triangle', gain: 0.2, delay: 0.06 * i });
    });
  }

  offer(): void {
    this.tone({ freq: 880, dur: 0.15, type: 'sine', gain: 0.15 });
    this.tone({ freq: 1320, dur: 0.2, type: 'sine', gain: 0.12, delay: 0.08 });
  }

  evolve(): void {
    [392, 523, 659, 784].forEach((f, i) => {
      this.tone({
        freq: f,
        to: f * 1.02,
        dur: 0.22,
        type: 'triangle',
        gain: 0.18,
        delay: 0.07 * i,
      });
    });
    this.noise({ dur: 0.35, gain: 0.08, filter: 4000, delay: 0.1 });
  }

  death(): void {
    this.boost(false);
    this.tone({ freq: 330, to: 55, dur: 0.6, type: 'sawtooth', gain: 0.14 });
    this.noise({ dur: 0.25, gain: 0.25, filter: 600 });
  }

  /** Purchase: bright two-note coin sound. */
  coin(): void {
    this.tone({ freq: 988, dur: 0.08, type: 'square', gain: 0.1 });
    this.tone({ freq: 1319, dur: 0.25, type: 'square', gain: 0.1, delay: 0.08 });
  }

  /** Not enough coins. */
  deny(): void {
    this.tone({ freq: 180, to: 140, dur: 0.18, type: 'square', gain: 0.1 });
  }

  click(): void {
    this.tone({ freq: 660, dur: 0.05, type: 'square', gain: 0.07 });
  }

  /** Looping filtered-noise "whoosh" while boosting. */
  boost(on: boolean): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || !this.noiseBuffer) return;
    if (on && !this.boostNode && !this.silent) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      src.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1200;
      filter.Q.value = 0.8;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      gain.gain.setTargetAtTime(0.12, ctx.currentTime, 0.04);
      src.connect(filter).connect(gain).connect(this.master);
      src.start();
      this.boostNode = { src, gain };
    } else if (!on && this.boostNode) {
      const { src, gain } = this.boostNode;
      gain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
      src.stop(ctx.currentTime + 0.3);
      this.boostNode = null;
    }
  }

  // ---- primitives --------------------------------------------------------

  private tone({ freq, to, dur, type = 'sine', gain = 0.2, delay = 0 }: ToneOpts): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || this.silent) return;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (to !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private noise({
    dur,
    gain,
    filter,
    delay = 0,
  }: {
    dur: number;
    gain: number;
    filter: number;
    delay?: number;
  }): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || !this.noiseBuffer || this.silent) return;
    const t = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = filter;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(lp).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  private makeNoise(): AudioBuffer | null {
    const ctx = this.ctx;
    if (!ctx) return null;
    const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }
}
