/**
 * Procedural ambient soundtrack: a slow four-chord loop with a soft pad, a sub bass on the
 * strong beats and sparse plucked notes with a little delay. No audio files, nothing to load.
 *
 * Notes are scheduled a fraction of a second ahead on a timer, the standard Web Audio
 * pattern, so playback stays steady even when the main thread hiccups.
 */
const BPM = 92;
const EIGHTH = 60 / BPM / 2;
const LOOKAHEAD_SEC = 0.25;
const TICK_MS = 80;
const BAR_EIGHTHS = 8;

/** Midi note numbers. Each chord lasts two bars. */
const CHORDS: readonly (readonly number[])[] = [
  [57, 64, 67, 72], // Am7
  [53, 60, 64, 69], // Fmaj7
  [48, 55, 64, 71], // Cmaj7
  [55, 62, 64, 71], // G6
];
/** A minor pentatonic across two octaves, for the plucks. */
const PLUCK_NOTES = [69, 72, 74, 76, 79, 81, 84, 86, 88];

function hz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export class Music {
  private readonly out: GainNode;
  private readonly padFilter: BiquadFilterNode;
  private readonly delay: DelayNode;
  private timer: number | null = null;
  private nextTime = 0;
  private step = 0;
  private pad: { osc: OscillatorNode[]; gain: GainNode } | null = null;

  constructor(
    private readonly ctx: AudioContext,
    destination: AudioNode,
  ) {
    this.out = ctx.createGain();
    this.out.gain.value = 0.9;
    this.out.connect(destination);

    this.padFilter = ctx.createBiquadFilter();
    this.padFilter.type = 'lowpass';
    this.padFilter.frequency.value = 900;
    this.padFilter.Q.value = 0.5;
    this.padFilter.connect(this.out);

    // Dotted-eighth echo on the plucks for a sense of space.
    this.delay = ctx.createDelay(1);
    this.delay.delayTime.value = EIGHTH * 1.5;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.32;
    const wet = ctx.createGain();
    wet.gain.value = 0.5;
    this.delay.connect(feedback).connect(this.delay);
    this.delay.connect(wet).connect(this.out);
  }

  get playing(): boolean {
    return this.timer !== null;
  }

  start(): void {
    if (this.timer !== null) return;
    this.nextTime = this.ctx.currentTime + 0.05;
    this.timer = window.setInterval(() => {
      this.schedule();
    }, TICK_MS);
  }

  stop(): void {
    if (this.timer === null) return;
    window.clearInterval(this.timer);
    this.timer = null;
    this.releasePad(this.ctx.currentTime);
  }

  private schedule(): void {
    while (this.nextTime < this.ctx.currentTime + LOOKAHEAD_SEC) {
      this.playStep(this.step, this.nextTime);
      this.step++;
      this.nextTime += EIGHTH;
    }
  }

  private playStep(step: number, time: number): void {
    const inBar = step % BAR_EIGHTHS;
    const bar = Math.floor(step / BAR_EIGHTHS);
    const chord = CHORDS[Math.floor(bar / 2) % CHORDS.length] ?? CHORDS[0];
    if (!chord) return;

    if (inBar === 0 && bar % 2 === 0) this.startPad(chord, time);

    // Sub bass on beats 1 and 3.
    if (inBar === 0 || inBar === 4) this.bass((chord[0] ?? 57) - 12, time, inBar === 0 ? 1 : 0.7);

    // Sparse plucks, never on the downbeat so the bass keeps the pulse.
    if (inBar !== 0 && Math.random() < 0.42) {
      const pool = Math.random() < 0.6 ? chord.map((n) => n + 12) : PLUCK_NOTES;
      const note = pool[Math.floor(Math.random() * pool.length)] ?? 69;
      this.pluck(note, time);
    }
  }

  private startPad(chord: readonly number[], time: number): void {
    this.releasePad(time);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.05, time + 1.2);
    gain.connect(this.padFilter);
    const osc: OscillatorNode[] = [];
    for (const note of chord) {
      for (const detune of [-5, 6]) {
        const o = this.ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.value = hz(note);
        o.detune.value = detune;
        o.connect(gain);
        o.start(time);
        osc.push(o);
      }
    }
    this.pad = { osc, gain };
  }

  private releasePad(time: number): void {
    const pad = this.pad;
    if (!pad) return;
    pad.gain.gain.cancelScheduledValues(time);
    pad.gain.gain.setValueAtTime(Math.max(0.0001, pad.gain.gain.value), time);
    pad.gain.gain.exponentialRampToValueAtTime(0.0001, time + 1.4);
    for (const o of pad.osc) o.stop(time + 1.5);
    this.pad = null;
  }

  private bass(note: number, time: number, level: number): void {
    const o = this.ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = hz(note);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(0.16 * level, time + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.9);
    o.connect(g).connect(this.out);
    o.start(time);
    o.stop(time + 1);
  }

  private pluck(note: number, time: number): void {
    const o = this.ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = hz(note);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(0.06, time + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.45);
    o.connect(g);
    g.connect(this.out);
    g.connect(this.delay);
    o.start(time);
    o.stop(time + 0.5);
  }
}
