import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { elapsedSeconds, remainingSeconds, isExpired, formatMMSS } from './timer';

describe('timer', () => {
  beforeEach(() => vi.useFakeTimers().setSystemTime(new Date('2026-05-18T10:00:00Z')));
  afterEach(() => vi.useRealTimers());

  it('elapsed returns 0 at start', () => {
    expect(elapsedSeconds(Date.now())).toBe(0);
  });

  it('elapsed reflects wall clock passage', () => {
    const start = Date.now();
    vi.advanceTimersByTime(45_000);
    expect(elapsedSeconds(start)).toBe(45);
  });

  it('remaining is planned - elapsed, never negative', () => {
    const start = Date.now();
    vi.advanceTimersByTime(30_000);
    expect(remainingSeconds(start, 60)).toBe(30);
    vi.advanceTimersByTime(60_000);
    expect(remainingSeconds(start, 60)).toBe(0);
  });

  it('isExpired true when elapsed >= planned', () => {
    const start = Date.now();
    expect(isExpired(start, 60)).toBe(false);
    vi.advanceTimersByTime(60_000);
    expect(isExpired(start, 60)).toBe(true);
  });

  it('elapsed clamps to 0 if clock goes backward', () => {
    const future = Date.now() + 60_000;
    expect(elapsedSeconds(future)).toBe(0);
  });
});

describe('formatMMSS', () => {
  it('formats common durations', () => {
    expect(formatMMSS(0)).toBe('00:00');
    expect(formatMMSS(59)).toBe('00:59');
    expect(formatMMSS(60)).toBe('01:00');
    expect(formatMMSS(1500)).toBe('25:00');
    expect(formatMMSS(3725)).toBe('62:05');
  });
});
