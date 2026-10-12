/**
 * Fixed-timestep simulation with variable-rate rendering.
 * Simulation runs at a stable 60 Hz regardless of display refresh rate, which keeps
 * eating/collision deterministic and makes bots behave identically on 30 and 144 Hz screens.
 */
export interface LoopCallbacks {
  update: (dt: number) => void;
  render: (alpha: number) => void;
}

export class GameLoop {
  private static readonly STEP = 1 / 60;
  private static readonly MAX_FRAME = 0.25;

  private accumulator = 0;
  private last = 0;
  private rafId = 0;
  private running = false;

  constructor(private readonly callbacks: LoopCallbacks) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.rafId = requestAnimationFrame(this.frame);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  /**
   * Step the simulation by a fixed amount of time and draw one frame, independent of
   * requestAnimationFrame. Used (with the loop stopped) to record frame-perfect trailers.
   */
  advance(seconds: number): void {
    this.accumulator += seconds;
    while (this.accumulator >= GameLoop.STEP - 1e-9) {
      this.callbacks.update(GameLoop.STEP);
      this.accumulator -= GameLoop.STEP;
    }
    this.callbacks.render(Math.max(0, this.accumulator) / GameLoop.STEP);
  }

  private lastErrorAt = -Infinity;

  private readonly frame = (now: number): void => {
    if (!this.running) return;
    // Schedule the next frame first: an exception in one frame must never stop the game
    // (that used to freeze the screen until a reload).
    this.rafId = requestAnimationFrame(this.frame);
    let elapsed = (now - this.last) / 1000;
    this.last = now;
    // Clamp long gaps (tab switch) so we never spiral trying to catch up.
    if (elapsed > GameLoop.MAX_FRAME) elapsed = GameLoop.MAX_FRAME;
    this.accumulator += elapsed;

    try {
      while (this.accumulator >= GameLoop.STEP) {
        this.callbacks.update(GameLoop.STEP);
        this.accumulator -= GameLoop.STEP;
      }
      this.callbacks.render(this.accumulator / GameLoop.STEP);
    } catch (err) {
      this.accumulator = 0;
      // Log at most once every few seconds so a repeating error can't flood the console.
      if (now - this.lastErrorAt > 5000) {
        this.lastErrorAt = now;
        console.error('Frame failed, continuing', err);
      }
    }
  };
}
