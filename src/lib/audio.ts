export type SoundId = 'takeoff' | 'engine' | 'landing' | 'captain_takeoff' | 'captain_landing';

const URLS: Record<SoundId, string> = {
  takeoff: '/sounds/takeoff.mp3',
  engine: '/sounds/engine.mp3',
  landing: '/sounds/landing.mp3',
  captain_takeoff: '/sounds/captain_takeoff.mp3',
  captain_landing: '/sounds/captain_landing.mp3',
};

// When music plays, engine ducks to this fraction of its normal volume.
const ENGINE_AMBIENT_FACTOR = 0.35;

/**
 * Effects-only audio bus (engine / captain / takeoff / landing). In-flight
 * music is rendered declaratively by <MusicLayer>; this class only needs to
 * know whether music is active so it can duck the engine accordingly.
 */
export class AudioBus {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private elements: Map<SoundId, HTMLAudioElement> = new Map();
  private volume = 0.6;
  private musicVolume = 0.4;
  private musicActive = false;

  init(): void {
    if (this.ctx) return;
    const Ctx: typeof AudioContext | undefined =
      (window as any).AudioContext ?? (window as any).webkitAudioContext;
    if (!Ctx) return;
    try {
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);

      for (const id of Object.keys(URLS) as SoundId[]) {
        const el = new Audio(URLS[id]);
        el.preload = 'auto';
        el.loop = id === 'engine';
        const source = this.ctx.createMediaElementSource(el);
        source.connect(this.master);
        this.elements.set(id, el);
      }
    } catch {
      this.ctx = null;
      this.master = null;
    }
  }

  async resume(): Promise<void> {
    if (this.ctx?.state === 'suspended') {
      try { await this.ctx.resume(); } catch { /* ignore */ }
    }
  }

  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.master) this.master.gain.value = this.volume;
  }
  getVolume(): number { return this.volume; }

  setMusicVolume(v: number): void {
    this.musicVolume = Math.max(0, Math.min(1, v));
  }
  getMusicVolume(): number { return this.musicVolume; }

  /** Notify the bus that music is playing — used to duck engine ambient. */
  setMusicActive(active: boolean): void {
    this.musicActive = active;
    this.applyEngineDucking();
  }

  private fade(toValue: number, durationMs = 200): void {
    if (!this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    const g = this.master.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(toValue, now + durationMs / 1000);
  }

  private applyEngineDucking(): void {
    const engine = this.elements.get('engine');
    if (engine) engine.volume = this.musicActive ? ENGINE_AMBIENT_FACTOR : 1.0;
  }

  play(id: SoundId): void {
    const el = this.elements.get(id);
    if (!el) return;
    if (id === 'engine') {
      el.volume = this.musicActive ? ENGINE_AMBIENT_FACTOR : 1.0;
    }
    const start = () => {
      el.currentTime = 0;
      this.fade(this.volume, 200);
      el.play().catch(() => { /* file missing or blocked */ });
    };
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().then(start).catch(() => start());
    } else {
      start();
    }
  }

  stop(id: SoundId): void {
    const el = this.elements.get(id);
    if (!el) return;
    if (id === 'engine') {
      this.fade(0, 200);
      window.setTimeout(() => {
        el.pause();
        el.currentTime = 0;
        this.fade(this.volume, 200);
      }, 220);
    } else {
      el.pause();
      el.currentTime = 0;
    }
  }
}

export const audioBus = new AudioBus();
