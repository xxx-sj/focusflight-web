import { motion } from 'framer-motion';
import { useFlightStore } from '../../store/flightStore';
import { useSettingsStore } from '../../store/settingsStore';
import BoardingPassCard from '../../components/BoardingPassCard';

export default function BoardingPass() {
  const { active, advance, abort } = useFlightStore();
  const { settings } = useSettingsStore();
  if (!active) return null;
  const cat = settings.categories.find(c => c.id === active.flight.category);
  if (!cat || !active.flight.seat || !active.flight.plannedSeconds) return null;

  return (
    <div className="max-w-xl mx-auto p-8 space-y-6">
      <h2 className="text-2xl font-bold text-center">Your boarding pass</h2>
      <motion.div
        initial={{ y: -100, opacity: 0, rotate: -3 }}
        animate={{ y: 0, opacity: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 100, damping: 12 }}
      >
        <BoardingPassCard
          category={cat}
          durationMinutes={active.flight.plannedSeconds / 60}
          seat={active.flight.seat}
        />
      </motion.div>
      <div className="flex gap-3 justify-center">
        <button onClick={abort} className="px-4 py-2 text-slate-500">Cancel</button>
        <button onClick={advance} className="bg-orange-500 text-white px-6 py-2 rounded-lg">
          Proceed to check-in →
        </button>
      </div>
    </div>
  );
}
