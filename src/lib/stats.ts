import type { Flight } from '../types';

function startOfLocalDay(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function startOfWeekMonday(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - (day - 1));
  return d.getTime();
}

const DAY_MS = 86_400_000;
const WEEK_MS = 7 * DAY_MS;

export function weeklyFocusSeconds(history: Flight[]): number {
  const weekStart = startOfWeekMonday(Date.now());
  const weekEnd = weekStart + WEEK_MS;
  return history
    .filter(f => f.status === 'completed' && f.completedAt != null && f.completedAt >= weekStart && f.completedAt < weekEnd)
    .reduce((s, f) => s + f.actualSeconds, 0);
}

export function streakDays(history: Flight[]): number {
  const days = new Set<number>();
  for (const f of history) {
    if (f.status !== 'completed' || f.completedAt == null) continue;
    days.add(startOfLocalDay(f.completedAt));
  }
  if (days.size === 0) return 0;

  const today = startOfLocalDay(Date.now());
  let cursor = days.has(today) ? today : today - DAY_MS;
  if (!days.has(cursor)) return 0;

  let count = 0;
  while (days.has(cursor)) {
    count++;
    cursor -= DAY_MS;
  }
  return count;
}

export function averageFlightSeconds(history: Flight[]): number {
  const completed = history.filter(f => f.status === 'completed');
  if (completed.length === 0) return 0;
  return Math.round(completed.reduce((s, f) => s + f.actualSeconds, 0) / completed.length);
}

export type WeeklyByDay = { dayLabel: string; categories: Record<string, number> };

export function weeklyByDay(history: Flight[]): WeeklyByDay[] {
  const labels = ['월', '화', '수', '목', '금', '토', '일'];
  const weekStart = startOfWeekMonday(Date.now());
  const out: WeeklyByDay[] = labels.map(l => ({ dayLabel: l, categories: {} }));
  for (const f of history) {
    if (f.status !== 'completed' || f.completedAt == null) continue;
    const diffDays = Math.floor((startOfLocalDay(f.completedAt) - weekStart) / DAY_MS);
    if (diffDays < 0 || diffDays > 6) continue;
    const bucket = out[diffDays].categories;
    bucket[f.category] = (bucket[f.category] || 0) + f.actualSeconds;
  }
  return out;
}

export function categoryBreakdown(history: Flight[], sinceMs: number = 0): Record<string, number> {
  const out: Record<string, number> = {};
  for (const f of history) {
    if (f.status !== 'completed' || f.completedAt == null) continue;
    if (f.completedAt < sinceMs) continue;
    out[f.category] = (out[f.category] || 0) + f.actualSeconds;
  }
  return out;
}
