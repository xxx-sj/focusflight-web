import { motion, useMotionValue, useTransform } from 'framer-motion';
import { useFlightStore } from '../../store/flightStore';
import { useSettingsStore } from '../../store/settingsStore';
import BoardingPassCard from '../../components/BoardingPassCard';
import { useEffect, useState } from 'react';
import { audioBus } from '../../lib/audio';

const TEAR_THRESHOLD = 180;

export default function CheckIn() {
  const { active, startFlight, abort } = useFlightStore();
  const { settings } = useSettingsStore();
  const x = useMotionValue(0);
  const opacity = useTransform(x, [0, TEAR_THRESHOLD], [1, 0.2]);
  const [torn, setTorn] = useState(false);

  function doTear() {
    if (torn) return;
    setTorn(true);
    audioBus.resume();
    setTimeout(() => {
      audioBus.play('takeoff');
      // Engine ambient fades in after the takeoff roar peaks
      setTimeout(() => audioBus.play('engine'), 1500);
      // Captain announcement on top of engine
      setTimeout(() => audioBus.play('captain_takeoff'), 3500);
      // startFlight transitions to inflight; <MusicLayer> auto-plays the
      // selected lofi/YouTube track at that point via React-managed elements.
      startFlight();
    }, 350);
  }

  useEffect(() => {
    let timer: number | null = null;
    function onDown(e: KeyboardEvent) {
      if (e.code === 'Space' && !timer) {
        timer = window.setTimeout(doTear, 500);
      }
    }
    function onUp(e: KeyboardEvent) {
      if (e.code === 'Space' && timer) { clearTimeout(timer); timer = null; }
    }
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!active) return null;
  const cat = settings.categories.find(c => c.id === active.flight.category);
  if (!cat || !active.flight.seat || !active.flight.plannedSeconds) return null;

  function handleDragEnd() {
    if (x.get() >= TEAR_THRESHOLD) doTear();
    else x.set(0);
  }

  return (
    <div className="max-w-xl mx-auto p-8 space-y-6">
      <h2 className="text-2xl font-bold text-center">Tear stub to board</h2>
      <div className="relative">
        <BoardingPassCard category={cat} durationMinutes={active.flight.plannedSeconds / 60} seat={active.flight.seat} />
        <motion.div
          role="button"
          tabIndex={0}
          aria-label="Tear boarding pass to start your flight"
          drag="x"
          dragConstraints={{ left: 0, right: TEAR_THRESHOLD + 20 }}
          dragElastic={0.1}
          style={{ x, opacity }}
          onDragEnd={handleDragEnd}
          className="absolute top-0 right-0 bottom-0 w-[120px] bg-orange-400 rounded-r-xl cursor-grab active:cursor-grabbing">
          <div className="flex flex-col h-full items-center justify-center text-white font-mono text-[10px] tracking-widest">
            ≫ TEAR ≫
          </div>
        </motion.div>
      </div>
      <p className="text-center text-xs text-slate-500">Drag the orange stub right — or hold Space</p>
      <div className="flex gap-3 justify-center">
        <button onClick={abort} className="px-4 py-2 text-slate-500">Cancel</button>
      </div>
    </div>
  );
}
