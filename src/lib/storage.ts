import type { Settings, Flight, ActiveFlight } from '../types';

export const DEFAULT_SETTINGS: Settings = {
  categories: [
    { id: 'work', label: '일', color: '#F4A261' },
    { id: 'study', label: '공부', color: '#2A9D8F' },
    { id: 'reading', label: '독서', color: '#E76F51' },
  ],
  defaultDurationMinutes: 25,
  notificationsEnabled: false,
  soundEnabled: true,
  volume: 0.6,
};

const KEY_SETTINGS = 'focusflight:settings';
const KEY_HISTORY = 'focusflight:history';
const KEY_ACTIVE = 'focusflight:active';
const KEY_VERSION = 'focusflight:schemaVersion';
const CURRENT_VERSION = 1;
const HISTORY_LIMIT = 1000;

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function loadSettings(): Settings {
  const stored = readJSON<Partial<Settings> | null>(KEY_SETTINGS, null);
  if (!stored) return DEFAULT_SETTINGS;
  return { ...DEFAULT_SETTINGS, ...stored };
}

export function saveSettings(s: Settings): void {
  localStorage.setItem(KEY_SETTINGS, JSON.stringify(s));
  localStorage.setItem(KEY_VERSION, String(CURRENT_VERSION));
}

export function loadHistory(): Flight[] {
  const arr = readJSON<Flight[]>(KEY_HISTORY, []);
  return Array.isArray(arr) ? arr : [];
}

export function appendFlight(f: Flight): void {
  const next = [f, ...loadHistory()].slice(0, HISTORY_LIMIT);
  localStorage.setItem(KEY_HISTORY, JSON.stringify(next));
}

export function loadActive(): ActiveFlight | null {
  return readJSON<ActiveFlight | null>(KEY_ACTIVE, null);
}

export function saveActive(a: ActiveFlight | null): void {
  if (a === null) localStorage.removeItem(KEY_ACTIVE);
  else localStorage.setItem(KEY_ACTIVE, JSON.stringify(a));
}
