import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  weeklyFocusSeconds, streakDays, averageFlightSeconds,
  weeklyByDay, categoryBreakdown,
} from './stats';
import type { Flight } from '../types';

const f = (over: Partial<Flight>): Flight => ({
  id: 'x', category: 'work', plannedSeconds: 1500, actualSeconds: 1500,
  seat: '1A', startedAt: 0, completedAt: 0, status: 'completed', ...over,
});

describe('stats:weeklyFocusSeconds', () => {
  beforeEach(() => vi.useFakeTimers().setSystemTime(new Date('2026-05-18T10:00:00')));  // Monday
  afterEach(() => vi.useRealTimers());

  it('sums actualSeconds for completed flights this week (local Mon-Sun)', () => {
    const monday = new Date('2026-05-18T09:00:00').getTime();
    const sunday = new Date('2026-05-24T09:00:00').getTime();
    const lastWeek = new Date('2026-05-11T09:00:00').getTime();
    const history = [
      f({ completedAt: monday, actualSeconds: 1500 }),
      f({ completedAt: sunday, actualSeconds: 600 }),
      f({ completedAt: lastWeek, actualSeconds: 9999 }),
    ];
    expect(weeklyFocusSeconds(history)).toBe(2100);
  });

  it('ignores aborted flights', () => {
    const t = new Date('2026-05-18T11:00:00').getTime();
    expect(weeklyFocusSeconds([f({ completedAt: t, actualSeconds: 600, status: 'aborted' })])).toBe(0);
  });
});

describe('stats:streakDays', () => {
  beforeEach(() => vi.useFakeTimers().setSystemTime(new Date('2026-05-18T15:00:00')));
  afterEach(() => vi.useRealTimers());

  const day = (d: string) => new Date(d).getTime();

  it('is 0 when no flights', () => {
    expect(streakDays([])).toBe(0);
  });

  it('counts today if today has a completed flight', () => {
    expect(streakDays([f({ completedAt: day('2026-05-18T10:00:00') })])).toBe(1);
  });

  it('counts back from yesterday if no flight today', () => {
    const h = [
      f({ id: 'a', completedAt: day('2026-05-17T10:00:00') }),
      f({ id: 'b', completedAt: day('2026-05-16T10:00:00') }),
    ];
    expect(streakDays(h)).toBe(2);
  });

  it('breaks on gap', () => {
    const h = [
      f({ id: 'a', completedAt: day('2026-05-17T10:00:00') }),
      f({ id: 'b', completedAt: day('2026-05-15T10:00:00') }),
    ];
    expect(streakDays(h)).toBe(1);
  });

  it('ignores aborted', () => {
    expect(streakDays([f({ status: 'aborted', completedAt: day('2026-05-18T10:00:00') })])).toBe(0);
  });
});

describe('stats:averageFlightSeconds', () => {
  it('averages only completed', () => {
    expect(averageFlightSeconds([
      f({ id: 'a', actualSeconds: 1500 }),
      f({ id: 'b', actualSeconds: 900 }),
      f({ id: 'c', actualSeconds: 9999, status: 'aborted' }),
    ])).toBe(1200);
  });

  it('returns 0 when no completed flights', () => {
    expect(averageFlightSeconds([])).toBe(0);
  });
});

describe('stats:weeklyByDay', () => {
  beforeEach(() => vi.useFakeTimers().setSystemTime(new Date('2026-05-20T10:00:00')));  // Wednesday
  afterEach(() => vi.useRealTimers());

  it('buckets seconds per (day, category)', () => {
    const wed = new Date('2026-05-20T09:00:00').getTime();
    const result = weeklyByDay([
      f({ completedAt: wed, category: 'work', actualSeconds: 1500 }),
      f({ completedAt: wed, category: 'study', actualSeconds: 600 }),
    ]);
    expect(result[2].categories).toEqual({ work: 1500, study: 600 });
    expect(result[0].dayLabel).toBe('월');
    expect(result.length).toBe(7);
  });
});

describe('stats:categoryBreakdown', () => {
  it('sums actualSeconds per category', () => {
    expect(categoryBreakdown([
      f({ category: 'work', actualSeconds: 1500 }),
      f({ category: 'work', actualSeconds: 600 }),
      f({ category: 'study', actualSeconds: 300 }),
    ])).toEqual({ work: 2100, study: 300 });
  });

  it('respects sinceMs filter', () => {
    const old = new Date('2026-01-01T00:00:00').getTime();
    const recent = new Date('2026-05-15T00:00:00').getTime();
    const cutoff = new Date('2026-05-10T00:00:00').getTime();
    expect(categoryBreakdown([
      f({ completedAt: old, category: 'work', actualSeconds: 1500 }),
      f({ completedAt: recent, category: 'work', actualSeconds: 600 }),
    ], cutoff)).toEqual({ work: 600 });
  });
});
