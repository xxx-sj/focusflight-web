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

function persist(active: ActiveFlight | null) {
  saveActive(active);
}

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
    set({ active: a }); persist(a);
  },

  setDuration: (minutes) => set(s => {
    if (!s.active) return s;
    const a = { ...s.active, flight: { ...s.active.flight, plannedSeconds: minutes * 60 } };
    persist(a); return { active: a };
  }),

  setCategory: (id) => set(s => {
    if (!s.active) return s;
    const a = { ...s.active, flight: { ...s.active.flight, category: id } };
    persist(a); return { active: a };
  }),

  setSeat: (seat) => set(s => {
    if (!s.active) return s;
    const a = { ...s.active, flight: { ...s.active.flight, seat } };
    persist(a); return { active: a };
  }),

  setLofiTrack: (id) => set(s => {
    if (!s.active) return s;
    const a = { ...s.active, lofiTrack: id };
    persist(a); return { active: a };
  }),

  setOrigin: (code) => set(s => {
    if (!s.active) return s;
    const a = { ...s.active, origin: code };
    persist(a); return { active: a };
  }),

  setDestination: (code) => set(s => {
    if (!s.active) return s;
    const a = { ...s.active, destination: code };
    persist(a); return { active: a };
  }),

  advance: () => set(s => {
    if (!s.active) return s;
    const idx = ORDER.indexOf(s.active.step);
    const next = ORDER[Math.min(idx + 1, ORDER.length - 1)];
    const a = { ...s.active, step: next };
    persist(a); return { active: a };
  }),

  startFlight: () => set(s => {
    if (!s.active) return s;
    const a: ActiveFlight = {
      ...s.active,                              // preserve origin/destination/lofiTrack
      step: 'inflight',
      flight: { ...s.active.flight, startedAt: Date.now() },
    };
    persist(a); return { active: a };
  }),

  land: () => {
    const a = get().active;
    if (!a || !a.flight.startedAt || !a.flight.plannedSeconds || !a.flight.category || !a.flight.seat) {
      set({ active: null }); persist(null); return;
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
    set({ active: null, lastCompleted: flight }); persist(null);
  },

  abort: () => {
    audioBus.stop('engine');
    set({ active: null });
    persist(null);
  },
}));
