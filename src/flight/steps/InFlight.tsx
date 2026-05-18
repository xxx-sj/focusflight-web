import { useEffect, useState } from 'react';
import { useFlightStore } from '../../store/flightStore';
import { useSettingsStore } from '../../store/settingsStore';
import Countdown from '../../components/Countdown';
import WorldMap from '../../components/WorldMap';
import { requestWakeLock, releaseWakeLock } from '../../lib/wakelock';
import { audioBus } from '../../lib/audio';
import { notify } from '../../lib/notifications';
import { findTrack } from '../../lofi';
import { findCountry } from '../../data/countries';
import { elapsedSeconds } from '../../lib/timer';

export default function InFlight() {
  const { active, land, abort } = useFlightStore();
  const { settings } = useSettingsStore();
  const sound = useSettingsStore((s) => s.settings.soundEnabled);
  const setSound = useSettingsStore((s) => s.setSoundEnabled);
  const [, setTick] = useState(0);

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

  // Drive the plane along the map path. ~5 fps re-renders are plenty smooth
  // for a flight that lasts many minutes, and avoids burning CPU on a
  // long-running session.
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 200);
    return () => clearInterval(id);
  }, []);

  if (!active || !active.flight.startedAt || !active.flight.plannedSeconds) return null;
  const cat = settings.categories.find((c) => c.id === active.flight.category);
  const track = findTrack(active.lofiTrack);
  const origin = findCountry(active.origin);
  const destination = findCountry(active.destination);

  const elapsed = elapsedSeconds(active.flight.startedAt);
  const progress = Math.max(0, Math.min(1, elapsed / active.flight.plannedSeconds));

  function handleExpire() {
    audioBus.stop('engine');
    audioBus.play('captain_landing');
    setTimeout(() => audioBus.play('landing'), 5500);
    if (useSettingsStore.getState().settings.notificationsEnabled) {
      notify('Flight landed', 'Your focus session is complete.');
    }
    land();
  }

  function handleAbort() {
    if (confirm('Abort flight?')) {
      audioBus.stop('engine');
      abort();
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center gap-6 bg-black text-white">
      {/* World map background */}
      <div className="absolute inset-0 flex items-center justify-center p-8 opacity-90">
        <WorldMap
          origin={origin}
          destination={destination}
          progress={progress}
          className="w-full h-full max-w-5xl"
        />
      </div>

      {/* Countdown + meta on top */}
      <div className="relative z-10 flex flex-col items-center gap-4">
        <Countdown
          startedAt={active.flight.startedAt}
          plannedSeconds={active.flight.plannedSeconds}
          onExpire={handleExpire}
        />
        <div className="text-white/70 text-sm tracking-widest font-mono">
          {cat?.label} · {origin && destination ? `${origin.iata} → ${destination.iata}` : active.flight.seat} · {active.flight.plannedSeconds / 60} MIN
        </div>
        {track && (
          <div className="text-white/50 text-xs tracking-widest font-mono">
            ♪ Now playing: {track.label}
          </div>
        )}
      </div>

      <button
        onClick={() => setSound(!sound)}
        aria-label={sound ? 'Mute sound' : 'Unmute sound'}
        className="absolute top-4 right-16 text-white/60 text-lg z-10">
        {sound ? '🔊' : '🔇'}
      </button>
      <button onClick={handleAbort} className="absolute top-4 right-4 text-white/40 text-xs z-10">
        Abort
      </button>
    </div>
  );
}
