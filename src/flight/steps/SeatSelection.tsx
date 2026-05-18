import { useMemo } from 'react';
import { useFlightStore } from '../../store/flightStore';
import { loadHistory } from '../../lib/storage';
import SeatMap from '../../components/SeatMap';

export default function SeatSelection() {
  const { active, setSeat, advance, abort } = useFlightStore();
  const recentlyUsed = useMemo(() => new Set(loadHistory().slice(0, 20).map(f => f.seat)), []);

  return (
    <div className="max-w-xl mx-auto p-8 space-y-6">
      <h2 className="text-2xl font-bold">Choose your seat</h2>
      <SeatMap
        selected={active?.flight.seat ?? null}
        recentlyUsed={recentlyUsed}
        onSelect={setSeat}
      />
      <div className="flex gap-3 justify-end">
        <button onClick={abort} className="px-4 py-2 text-slate-500">Cancel</button>
        <button onClick={advance} disabled={!active?.flight.seat}
          className="bg-orange-500 text-white px-6 py-2 rounded-lg disabled:opacity-40">
          Next: Boarding pass →
        </button>
      </div>
    </div>
  );
}
