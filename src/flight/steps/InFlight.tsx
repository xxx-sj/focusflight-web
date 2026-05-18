import { useEffect } from 'react';
import { useFlightStore } from '../../store/flightStore';
import { useSettingsStore } from '../../store/settingsStore';
import Countdown from '../../components/Countdown';
import { requestWakeLock, releaseWakeLock } from '../../lib/wakelock';

export default function InFlight() {
  const { active, land, abort } = useFlightStore();
  const { settings } = useSettingsStore();

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  useEffect(() => {
    requestWakeLock();
    const onVis = () => { if (document.visibilityState === 'visible') requestWakeLock(); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      releaseWakeLock();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  if (!active || !active.flight.startedAt || !active.flight.plannedSeconds) return null;
  const cat = settings.categories.find(c => c.id === active.flight.category);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-orange-400 flex flex-col items-center justify-center gap-6 relative">
      <Countdown startedAt={active.flight.startedAt} plannedSeconds={active.flight.plannedSeconds} onExpire={land} />
      <div className="text-amber-50 text-sm tracking-widest font-mono opacity-70">
        {cat?.label} · {active.flight.seat} · {(active.flight.plannedSeconds / 60)} MIN
      </div>
      <button onClick={() => { if (confirm('Abort flight?')) abort(); }} className="absolute top-4 right-4 text-amber-50/40 text-xs">
        Abort
      </button>
    </div>
  );
}
