import { useFlightStore } from '../../store/flightStore';
import type { Flight } from '../../types';
import { formatMMSS } from '../../lib/timer';

export default function Landed({ flight }: { flight: Flight }) {
  const { startBooking, dismissLanded } = useFlightStore();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-slate-900 text-amber-50">
      <div className="text-6xl">🛬</div>
      <h2 className="text-3xl font-bold">Landed</h2>
      <div className="font-mono text-center space-y-1 text-sm">
        <div>{formatMMSS(flight.actualSeconds)} focused</div>
        <div className="opacity-60">Seat {flight.seat}</div>
      </div>
      <div className="flex gap-3">
        <button onClick={() => { dismissLanded(); startBooking(); }} className="bg-orange-500 px-6 py-3 rounded-lg">Book another</button>
        <button onClick={dismissLanded} className="px-6 py-3 border border-amber-50/30 rounded-lg">
          Home
        </button>
      </div>
    </div>
  );
}
