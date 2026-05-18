import { describe, it, expect, beforeEach } from 'vitest';
import type { ActiveFlight } from '../types';
import {
  loadSettings, saveSettings, DEFAULT_SETTINGS,
  loadHistory, appendFlight,
  loadActive, saveActive,
} from './storage';

describe('storage:settings', () => {
  beforeEach(() => localStorage.clear());

  it('returns DEFAULT_SETTINGS when nothing stored', () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('round-trips a saved Settings object', () => {
    const s = { ...DEFAULT_SETTINGS, volume: 0.3 };
    saveSettings(s);
    expect(loadSettings()).toEqual(s);
  });

  it('seed-merges missing keys into stored settings', () => {
    const { volume, ...legacy } = DEFAULT_SETTINGS;
    localStorage.setItem('focusflight:settings', JSON.stringify(legacy));
    expect(loadSettings().volume).toBe(DEFAULT_SETTINGS.volume);
  });

  it('falls back to defaults on corrupt JSON', () => {
    localStorage.setItem('focusflight:settings', '{not json');
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });
});

describe('storage:history', () => {
  beforeEach(() => localStorage.clear());

  it('appends flight at front, returns empty when none', () => {
    expect(loadHistory()).toEqual([]);
    const f = { id: '1', category: 'work', plannedSeconds: 1500, actualSeconds: 1500, seat: '1A', startedAt: 0, completedAt: 10, status: 'completed' as const };
    appendFlight(f);
    expect(loadHistory()).toEqual([f]);
  });

  it('evicts oldest after HISTORY_LIMIT (1000)', () => {
    for (let i = 0; i < 1002; i++) {
      appendFlight({ id: String(i), category: 'work', plannedSeconds: 60, actualSeconds: 60, seat: '1A', startedAt: i, completedAt: i, status: 'completed' });
    }
    const h = loadHistory();
    expect(h.length).toBe(1000);
    expect(h[0].id).toBe('1001'); // newest first
    expect(h[999].id).toBe('2');
  });

  it('returns empty array on corrupt JSON', () => {
    localStorage.setItem('focusflight:history', '{not json');
    expect(loadHistory()).toEqual([]);
  });
});

describe('storage:active', () => {
  beforeEach(() => localStorage.clear());

  it('saves and clears active flight', () => {
    expect(loadActive()).toBeNull();
    const a: ActiveFlight = { step: 'inflight', flight: { id: 'x', seat: '5C' } };
    saveActive(a);
    expect(loadActive()).toEqual(a);
    saveActive(null);
    expect(loadActive()).toBeNull();
  });

  it('returns null on corrupt JSON', () => {
    localStorage.setItem('focusflight:active', '{not json');
    expect(loadActive()).toBeNull();
  });
});
