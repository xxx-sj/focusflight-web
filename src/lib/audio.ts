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

export class AudioBus {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private elements: Map<SoundId, HTMLAudioElement> = new Map();
  // Music intentionally uses a raw HTMLAudioElement (no Web Audio routing) so
  // that el.play() can run synchronously inside a user-gesture handler — the
  // Promise-based ctx.resume().then(...) chain otherwise loses the gesture
  // affordance and the browser blocks autoplay.
  private musicEl: HTMLAudioElement | null = null;
  private musicUrl: string | null = null;
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
    if (this.musicEl) this.musicEl.volume = this.musicVolume;
  }

  getMusicVolume(): number { return this.musicVolume; }

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
      // Honor ducking the moment engine starts (re-checked at every play).
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

  // Music uses raw HTMLAudioElement with its own volume property — independent
  // from AudioContext, so play() runs synchronously inside the click handler.
  playMusic(url: string): void {
    if (this.musicUrl === url && this.musicEl && !this.musicEl.paused) return;
    this.stopMusic();
    try {
      const el = new Audio(url);
      el.loop = true;
      el.preload = 'auto';
      // Floor volume so users with a stale `volume: 0` setting still hear
      // something on first preview — they can lower it from Settings.
      el.volume = Math.max(this.musicVolume, 0.05);
      const p = el.play();
      if (p && typeof p.catch === 'function') {
        p.catch((err) => {
          console.warn('[audioBus] music play() rejected:', err?.name, err?.message);
        });
      }
      el.addEventListener('error', () => {
        const e = el.error;
        console.warn('[audioBus] music element error:', e?.code, e?.message, 'src=', el.src);
      });
      console.info('[audioBus] playMusic url=', url, 'volume=', el.volume);
      this.musicEl = el;
      this.musicUrl = url;
      this.musicActive = true;
      this.applyEngineDucking();
    } catch (e) {
      console.warn('[audioBus] playMusic threw:', e);
      this.musicEl = null;
      this.musicUrl = null;
      this.musicActive = false;
    }
  }

  stopMusic(): void {
    if (this.musicEl) {
      try { this.musicEl.pause(); } catch { /* ignore */ }
      this.musicEl = null;
    }
    this.musicUrl = null;
    this.musicActive = false;
    this.applyEngineDucking();
  }
}

export const audioBus = new AudioBus();
