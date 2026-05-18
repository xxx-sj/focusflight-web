import { useMemo, useState } from 'react';
import { loadHistory } from '../lib/storage';
import { weeklyFocusSeconds, streakDays, averageFlightSeconds, weeklyByDay, categoryBreakdown } from '../lib/stats';
import { useSettingsStore } from '../store/settingsStore';
import { formatMMSS } from '../lib/timer';
import KpiCard from '../components/KpiCard';
import WeeklyBar from '../components/charts/WeeklyBar';
import CategoryDonut from '../components/charts/CategoryDonut';

type Period = 'week' | 'month' | 'all';

function sinceFor(p: Period): number {
  if (p === 'all') return 0;
  const now = Date.now();
  return p === 'week' ? now - 7 * 86_400_000 : now - 30 * 86_400_000;
}

export default function Stats() {
  const { settings } = useSettingsStore();
  const [period, setPeriod] = useState<Period>('week');
  const history = useMemo(() => loadHistory(), []);
  const weekSec = useMemo(() => weeklyFocusSeconds(history), [history]);
  const streak = useMemo(() => streakDays(history), [history]);
  const avgSec = useMemo(() => averageFlightSeconds(history), [history]);
  const weekly = useMemo(() => weeklyByDay(history), [history]);
  const breakdown = useMemo(() => categoryBreakdown(history, sinceFor(period)), [history, period]);

  if (history.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500">
        <p>아직 비행 기록이 없습니다 — 첫 비행을 예약해보세요.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Stats</h1>
        <div className="flex gap-1 text-xs">
          {(['week', 'month', 'all'] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded ${period === p ? 'bg-slate-900 text-white' : 'bg-slate-100'}`}>
              {p === 'week' ? '주' : p === 'month' ? '월' : '전체'}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard label="This week" value={`${Math.round(weekSec / 60)}m`} />
        <KpiCard label="Streak" value={`${streak} days`} />
        <KpiCard label="Average flight" value={formatMMSS(avgSec)} hint="최근 1000개 비행 기준" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <h3 className="text-sm font-bold mb-2">Last 7 days</h3>
          <WeeklyBar data={weekly} categories={settings.categories} />
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <h3 className="text-sm font-bold mb-2">Categories ({period})</h3>
          <CategoryDonut breakdown={breakdown} categories={settings.categories} />
        </div>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-widest">
            <tr><th className="p-3 text-left">Date</th><th>Category</th><th>Duration</th><th>Seat</th><th>Status</th></tr>
          </thead>
          <tbody>
            {history.slice(0, 20).map(f => (
              <tr key={f.id} className="border-t border-slate-100">
                <td className="p-3">{new Date(f.startedAt).toLocaleString()}</td>
                <td>{settings.categories.find(c => c.id === f.category)?.label ?? f.category}</td>
                <td>{formatMMSS(f.actualSeconds)} / {formatMMSS(f.plannedSeconds)}</td>
                <td className="font-mono">{f.seat}</td>
                <td className={f.status === 'completed' ? 'text-emerald-600' : 'text-slate-400'}>{f.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
