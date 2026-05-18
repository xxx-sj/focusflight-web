import { useEffect, useState } from 'react';
import { remainingSeconds, formatMMSS } from '../lib/timer';

type Props = { startedAt: number; plannedSeconds: number; onExpire: () => void };

export default function Countdown({ startedAt, plannedSeconds, onExpire }: Props) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick(t => t + 1), 1000);
    const onVis = () => setTick(t => t + 1);
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVis); };
  }, []);

  const rem = remainingSeconds(startedAt, plannedSeconds);
  useEffect(() => { if (rem === 0) onExpire(); }, [rem, onExpire]);

  return (
    <div className="text-8xl font-mono font-bold text-amber-50 tracking-widest">
      {formatMMSS(rem)}
    </div>
  );
}
