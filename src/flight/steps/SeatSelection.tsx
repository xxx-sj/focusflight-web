import { useMemo } from 'react';
import { useFlightStore } from '../../store/flightStore';
import { loadHistory } from '../../lib/storage';
import { backgroundFor } from '../../lib/seatTheme';
import SeatMap from '../../components/SeatMap';

export default function SeatSelection() {
  const { active, setSeat, advance, abort } = useFlightStore();
  const recentlyUsed = useMemo(() => new Set(loadHistory().slice(0, 20).map(f => f.seat)), []);
  const seat = active?.flight.seat;

  return (
    <div
      className="min-h-screen transition-[background] duration-500 ease-out"
      style={{ background: backgroundFor(seat) }}
    >
      <div className="max-w-xl mx-auto p-8 space-y-6">
        <h2 className="text-2xl font-bold text-white drop-shadow-md">Choose your seat</h2>
        <p className="text-white/80 text-sm drop-shadow">자리마다 창밖 풍경이 다릅니다 — 마음에 드는 자리를 골라보세요</p>
        <SeatMap
          selected={seat ?? null}
          recentlyUsed={recentlyUsed}
          onSelect={setSeat}
        />
        {seat && (
          <div className="text-center text-white/90 font-mono text-sm drop-shadow">
            Seat {seat}
          </div>
        )}
        <div className="flex gap-3 justify-end">
          <button onClick={abort} className="px-4 py-2 text-white/70 hover:text-white">Cancel</button>
          <button onClick={advance} disabled={!seat}
            className="bg-white text-slate-900 px-6 py-2 rounded-lg disabled:opacity-40 font-semibold shadow-md">
            Next: Boarding pass →
          </button>
        </div>
      </div>
    </div>
  );
}
