import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useFlightStore } from '../../store/flightStore';
import { useSettingsStore } from '../../store/settingsStore';
import Countdown from '../../components/Countdown';
import { requestWakeLock, releaseWakeLock } from '../../lib/wakelock';
import { audioBus } from '../../lib/audio';
import { notify } from '../../lib/notifications';
import { findTrack } from '../../lofi';
import { backgroundFor } from '../../lib/seatTheme';

function Cloud({ delay, top, scale }: { delay: number; top: string; scale: number }) {
  return (
    <motion.div
      className="absolute w-32 h-8 bg-paper/70 rounded-full blur-sm"
      style={{ top, scale }}
      initial={{ x: '-30vw' }}
      animate={{ x: '130vw' }}
      transition={{ duration: 30, delay, repeat: Infinity, ease: 'linear' }}
    />
  );
}

export default function InFlight() {
  const { active, land, abort } = useFlightStore();
  const { settings } = useSettingsStore();
  const sound = useSettingsStore(s => s.settings.soundEnabled);
  const setSound = useSettingsStore(s => s.setSoundEnabled);

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
  const track = findTrack(active.lofiTrack);

  function handleExpire() {
    audioBus.stop('engine');
    audioBus.play('captain_landing');
    // Landing chime layered after captain's announcement
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
    <div
      className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center gap-6 transition-[background] duration-700"
      style={{ background: backgroundFor(active.flight.seat) }}
    >
      <Cloud delay={0} top="30%" scale={1} />
      <Cloud delay={8} top="50%" scale={0.7} />
      <Cloud delay={15} top="70%" scale={0.9} />
      <div className="relative z-10 flex flex-col items-center gap-6">
        <Countdown startedAt={active.flight.startedAt} plannedSeconds={active.flight.plannedSeconds} onExpire={handleExpire} />
        <div className="text-amber-50 text-sm tracking-widest font-mono opacity-70">
          {cat?.label} · {active.flight.seat} · {(active.flight.plannedSeconds / 60)} MIN
        </div>
        {track && (
          <div className="text-amber-50/60 text-xs tracking-widest font-mono">
            ♪ Now playing: {track.label}
          </div>
        )}
      </div>
      <button
        onClick={() => setSound(!sound)}
        aria-label={sound ? 'Mute sound' : 'Unmute sound'}
        className="absolute top-4 right-16 text-amber-50/60 text-lg z-10">
        {sound ? '🔊' : '🔇'}
      </button>
      <button onClick={handleAbort} className="absolute top-4 right-4 text-amber-50/40 text-xs z-10">
        Abort
      </button>
    </div>
  );
}
