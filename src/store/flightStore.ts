import { create } from 'zustand';
import type { ActiveFlight, Flight, FlightStep } from '../types';
import { appendFlight, loadActive, saveActive } from '../lib/storage';
import { nanoid } from 'nanoid';
import { elapsedSeconds } from '../lib/timer';
import { audioBus } from '../lib/audio';

const ORDER: FlightStep[] = ['booking', 'boarding', 'checkin', 'inflight', 'landed'];

function randomSeat(): string {
  const row = Math.floor(Math.random() * 10) + 1;
  const col = 'ABCDEF'[Math.floor(Math.random() * 6)];
  return `${row}${col}`;
}

type State = {
  active: ActiveFlight | null;
  lastCompleted: Flight | null;
  startBooking: () => void;
  setDuration: (minutes: number) => void;
  setCategory: (id: string) => void;
  setSeat: (seat: string) => void;
  advance: () => void;
  startFlight: () => void;
  land: () => void;
  abort: () => void;
  hydrate: () => void;
  dismissLanded: () => void;
  setLofiTrack: (id: string | null) => void;
  setOrigin: (code: string | null) => void;
  setDestination: (code: string | null) => void;
};

/**
 * Persistence policy
 * ──────────────────
 * The active flight is only written to localStorage *after the timer has
 * actually started* (stub tear → `startFlight()`). All pre-flight setup
 * (booking / boarding / checkin) is in-memory only — a refresh during setup
 * just starts a fresh booking, which is what you'd expect since nothing
 * irreversible happened yet.
 *
 *   - startFlight() → save (only persistence write during a flight's life)
 *   - abort()       → clear
 *   - land()        → clear
 *
 * Everything else (startBooking, setDuration, advance, setOrigin, …) updates
 * the Zustand store but does *not* touch localStorage.
 */

export const useFlightStore = create<State>((set, get) => ({
  active: null,
  lastCompleted: null,

  hydrate: () => {
    const a = loadActive();
    set({ active: a });
  },

  dismissLanded: () => set({ lastCompleted: null }),

  startBooking: () => {
    const a: ActiveFlight = { step: 'booking', flight: { id: nanoid(8), seat: randomSeat() } };
    set({ active: a });
  },

  setDuration: (minutes) => set(s => {
    if (!s.active) return s;
    return { active: { ...s.active, flight: { ...s.active.flight, plannedSeconds: minutes * 60 } } };
  }),

  setCategory: (id) => set(s => {
    if (!s.active) return s;
    return { active: { ...s.active, flight: { ...s.active.flight, category: id } } };
  }),

  setSeat: (seat) => set(s => {
    if (!s.active) return s;
    return { active: { ...s.active, flight: { ...s.active.flight, seat } } };
  }),

  setLofiTrack: (id) => set(s => {
    if (!s.active) return s;
    return { active: { ...s.active, lofiTrack: id } };
  }),

  setOrigin: (code) => set(s => {
    if (!s.active) return s;
    return { active: { ...s.active, origin: code } };
  }),

  setDestination: (code) => set(s => {
    if (!s.active) return s;
    return { active: { ...s.active, destination: code } };
  }),

  advance: () => set(s => {
    if (!s.active) return s;
    const idx = ORDER.indexOf(s.active.step);
    const next = ORDER[Math.min(idx + 1, ORDER.length - 1)];
    return { active: { ...s.active, step: next } };
  }),

  startFlight: () => set(s => {
    if (!s.active) return s;
    const a: ActiveFlight = {
      ...s.active,                              // preserve origin/destination/lofiTrack
      step: 'inflight',
      flight: { ...s.active.flight, startedAt: Date.now() },
    };
    saveActive(a);                              // ← only persistence point
    return { active: a };
  }),

  land: () => {
    const a = get().active;
    if (!a || !a.flight.startedAt || !a.flight.plannedSeconds || !a.flight.category || !a.flight.seat) {
      set({ active: null }); saveActive(null); return;
    }
    const completedAt = Date.now();
    const actualSeconds = Math.min(elapsedSeconds(a.flight.startedAt), a.flight.plannedSeconds);
    const flight: Flight = {
      id: a.flight.id || nanoid(8),
      category: a.flight.category,
      plannedSeconds: a.flight.plannedSeconds,
      actualSeconds,
      seat: a.flight.seat,
      startedAt: a.flight.startedAt,
      completedAt,
      status: 'completed',
    };
    appendFlight(flight);
    audioBus.stop('engine');
    set({ active: null, lastCompleted: flight });
    saveActive(null);
  },

  abort: () => {
    audioBus.stop('engine');
    set({ active: null });
    saveActive(null);
  },
}));
