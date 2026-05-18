let sentinel: WakeLockSentinel | null = null;

export async function requestWakeLock(): Promise<void> {
  if (!('wakeLock' in navigator)) return;
  try {
    sentinel = await navigator.wakeLock.request('screen');
  } catch {
    // permission denied or unsupported — silent
  }
}

export async function releaseWakeLock(): Promise<void> {
  if (sentinel) {
    try { await sentinel.release(); } catch { /* ignore */ }
    sentinel = null;
  }
}
