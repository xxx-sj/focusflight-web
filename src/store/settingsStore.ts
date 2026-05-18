import { create } from 'zustand';
import { loadSettings, saveSettings, DEFAULT_SETTINGS } from '../lib/storage';
import type { Settings, Category } from '../types';

type State = {
  settings: Settings;
  setVolume: (v: number) => void;
  setSoundEnabled: (b: boolean) => void;
  setNotificationsEnabled: (b: boolean) => void;
  setDefaultDuration: (m: number) => void;
  addCategory: (c: Category) => void;
  removeCategory: (id: string) => void;
};

function commit(next: Settings): Settings {
  saveSettings(next);
  return next;
}

export const useSettingsStore = create<State>((set, get) => ({
  settings: loadSettings() ?? DEFAULT_SETTINGS,
  setVolume: (v) => set({ settings: commit({ ...get().settings, volume: Math.max(0, Math.min(1, v)) }) }),
  setSoundEnabled: (b) => set({ settings: commit({ ...get().settings, soundEnabled: b }) }),
  setNotificationsEnabled: (b) => set({ settings: commit({ ...get().settings, notificationsEnabled: b }) }),
  setDefaultDuration: (m) => set({ settings: commit({ ...get().settings, defaultDurationMinutes: m }) }),
  addCategory: (c) => set({ settings: commit({ ...get().settings, categories: [...get().settings.categories, c] }) }),
  removeCategory: (id) => set({ settings: commit({ ...get().settings, categories: get().settings.categories.filter(c => c.id !== id) }) }),
}));
