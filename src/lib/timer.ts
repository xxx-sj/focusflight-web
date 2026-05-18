export function elapsedSeconds(startedAt: number): number {
  return Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
}

export function remainingSeconds(startedAt: number, plannedSeconds: number): number {
  return Math.max(0, plannedSeconds - elapsedSeconds(startedAt));
}

export function isExpired(startedAt: number, plannedSeconds: number): boolean {
  return elapsedSeconds(startedAt) >= plannedSeconds;
}

export function formatMMSS(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
