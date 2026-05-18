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
  const volume = useSettingsStore((s) => s.settings.volume);
  const musicVolume = useSettingsStore((s) => s.settings.musicVolume);
  const setSound = useSettingsStore((s) => s.setSoundEnabled);
  const setVolume = useSettingsStore((s) => s.setVolume);
  const setMusicVolume = useSettingsStore((s) => s.setMusicVolume);
  const [, setTick] = useState(0);
  const [showSoundPanel, setShowSoundPanel] = useState(false);

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
  const hasUserRoute = !!origin && !!destination;

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
      {/* World map background — fills the viewport with a little breathing room */}
      <div className="absolute inset-0 p-6 sm:p-10">
        <WorldMap
          origin={origin}
          destination={destination}
          progress={progress}
          className="w-full h-full opacity-90"
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
          {cat?.label} · {hasUserRoute && origin && destination ? `${origin.iata} → ${destination.iata}` : `Seat ${active.flight.seat}`} · {active.flight.plannedSeconds / 60} MIN
        </div>
        {track && (
          <div className="text-white/50 text-xs tracking-widest font-mono">
            ♪ Now playing: {track.label}
          </div>
        )}
      </div>

      {/* Sound controls — quick access without leaving the flight */}
      <div className="absolute top-4 right-16 z-10">
        <button
          onClick={() => setShowSoundPanel((v) => !v)}
          aria-label="Sound controls"
          className="text-white/70 text-lg hover:text-white"
        >
          {sound ? '🔊' : '🔇'}
        </button>
        {showSoundPanel && (
          <div className="absolute top-9 right-0 w-64 bg-black/80 backdrop-blur border border-white/15 rounded-lg p-4 space-y-3 text-white text-xs shadow-xl">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={sound}
                onChange={(e) => setSound(e.target.checked)}
                className="cursor-pointer"
              />
              <span>사운드 활성화</span>
            </label>
            <div>
              <div className="flex justify-between mb-1">
                <span>효과음 (엔진, 기장)</span>
                <span className="opacity-60">{Math.round(volume * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                disabled={!sound}
                className="w-full accent-orange-400 disabled:opacity-40"
              />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span>음악</span>
                <span className="opacity-60">{Math.round(musicVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={musicVolume}
                onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                disabled={!sound}
                className="w-full accent-orange-400 disabled:opacity-40"
              />
            </div>
          </div>
        )}
      </div>
      <button onClick={handleAbort} className="absolute top-4 right-4 text-white/40 text-xs z-10">
        Abort
      </button>
    </div>
  );
}
