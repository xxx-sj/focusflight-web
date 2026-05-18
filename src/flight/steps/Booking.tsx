import { useState } from 'react';
import { useFlightStore } from '../../store/flightStore';
import { useSettingsStore } from '../../store/settingsStore';
import { LOFI_TRACKS } from '../../lofi';
import { extractYouTubeId, isYouTubeTrack, youtubeIdFromTrack, YT_PREFIX } from '../../lib/youtube';
import { COUNTRIES } from '../../data/countries';

const DURATIONS = [15, 25, 45, 60, 90];

export default function Booking() {
  const { active, setDuration, setCategory, setLofiTrack, setOrigin, setDestination, advance, abort } = useFlightStore();
  const { settings } = useSettingsStore();
  const [custom, setCustom] = useState('');

  const selectedDuration = active?.flight.plannedSeconds ? active.flight.plannedSeconds / 60 : null;
  const selectedCategory = active?.flight.category;
  const selectedTrack = active?.lofiTrack ?? null;
  const origin = active?.origin ?? '';
  const destination = active?.destination ?? '';
  const canProceed = !!selectedDuration && !!selectedCategory && !!origin && !!destination && origin !== destination;

  const initialYtUrl = isYouTubeTrack(selectedTrack)
    ? `https://youtu.be/${youtubeIdFromTrack(selectedTrack)}`
    : '';
  const [ytUrl, setYtUrl] = useState(initialYtUrl);
  const [ytError, setYtError] = useState('');

  function applyYouTube() {
    const id = extractYouTubeId(ytUrl);
    if (!id) {
      setYtError('YouTube URL을 확인해주세요 (예: https://youtu.be/...)');
      return;
    }
    setYtError('');
    setLofiTrack(`${YT_PREFIX}${id}`);
  }

  return (
    <div className="max-w-xl mx-auto p-8 space-y-8">
      <h2 className="text-2xl font-bold">Book your flight</h2>

      <section>
        <h3 className="text-sm uppercase tracking-wider mb-3">Duration</h3>
        <div className="flex flex-wrap gap-2">
          {DURATIONS.map(d => (
            <button key={d} onClick={() => setDuration(d)}
              className={`px-4 py-2 rounded-lg border ${selectedDuration === d ? 'bg-orange-500 text-white border-orange-500' : 'border-slate-300'}`}>
              {d} min
            </button>
          ))}
          <input type="number" min={1} max={300} placeholder="custom"
            value={custom}
            onChange={e => setCustom(e.target.value)}
            onBlur={() => { const n = parseInt(custom); if (n > 0) setDuration(n); }}
            className="px-3 py-2 border border-slate-300 rounded-lg w-24" />
        </div>
      </section>

      <section>
        <h3 className="text-sm uppercase tracking-wider mb-3">Route</h3>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <div className="text-xs text-slate-500 mb-1">From (현재 위치)</div>
            <select value={origin} onChange={(e) => setOrigin(e.target.value || null)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white">
              <option value="">선택</option>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>{c.nameKo} ({c.iata})</option>
              ))}
            </select>
          </label>
          <label className="block">
            <div className="text-xs text-slate-500 mb-1">To (목적지)</div>
            <select value={destination} onChange={(e) => setDestination(e.target.value || null)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white">
              <option value="">선택</option>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code} disabled={c.code === origin}>{c.nameKo} ({c.iata})</option>
              ))}
            </select>
          </label>
        </div>
        {origin && destination && origin === destination && (
          <p className="text-xs text-red-500 mt-2">출발지와 목적지가 같습니다.</p>
        )}
      </section>

      <section>
        <h3 className="text-sm uppercase tracking-wider mb-3">Category</h3>
        <div className="flex flex-wrap gap-2">
          {settings.categories.map(c => (
            <button key={c.id} onClick={() => setCategory(c.id)}
              className={`px-4 py-2 rounded-lg border ${selectedCategory === c.id ? 'text-white border-transparent' : 'border-slate-300'}`}
              style={selectedCategory === c.id ? { backgroundColor: c.color } : {}}>
              {c.label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-sm uppercase tracking-wider mb-3">In-flight music (optional)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button onClick={() => setLofiTrack(null)}
            className={`px-4 py-3 rounded-lg border text-left ${selectedTrack === null ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-300'}`}>
            <div className="font-semibold text-sm">🔇 None</div>
            <div className="text-xs opacity-70 mt-0.5">엔진 소리만</div>
          </button>
          {LOFI_TRACKS.map(t => (
            <button key={t.id} onClick={() => setLofiTrack(t.id)}
              className={`px-4 py-3 rounded-lg border text-left ${selectedTrack === t.id ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-300'}`}>
              <div className="font-semibold text-sm">{t.label}</div>
              <div className="text-xs opacity-70 mt-0.5">{t.description}</div>
            </button>
          ))}
        </div>

        <div className="mt-3 p-3 border border-slate-200 rounded-lg bg-slate-50">
          <div className="text-xs font-bold mb-2 flex items-center gap-1">📺 YouTube URL</div>
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="https://youtu.be/... 또는 https://youtube.com/watch?v=..."
              value={ytUrl}
              onChange={(e) => { setYtUrl(e.target.value); setYtError(''); }}
              className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm bg-white"
            />
            <button onClick={applyYouTube} className="bg-orange-500 text-white px-4 rounded text-sm">
              Set
            </button>
          </div>
          {ytError && <div className="text-xs text-red-500 mt-1">{ytError}</div>}
          {isYouTubeTrack(selectedTrack) && !ytError && (
            <div className="text-xs text-emerald-600 mt-2">✓ YouTube 선택됨: {youtubeIdFromTrack(selectedTrack)}</div>
          )}
          <p className="text-[11px] text-slate-500 mt-2">YouTube는 비행 중 자동재생됩니다. 볼륨 조절은 브라우저 탭 볼륨 사용.</p>
        </div>

        <p className="text-xs text-slate-400 mt-2">선택한 트랙은 비행 시작(stub tear) 시점부터 재생됩니다.</p>
      </section>

      <div className="flex gap-3 justify-end">
        <button onClick={abort} className="px-4 py-2 text-slate-500">Cancel</button>
        <button onClick={advance} disabled={!canProceed}
          className="bg-orange-500 text-white px-6 py-2 rounded-lg disabled:opacity-40">
          Next: Boarding pass →
        </button>
      </div>
    </div>
  );
}
