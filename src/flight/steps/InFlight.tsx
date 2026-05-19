import { useEffect, useState } from 'react';
import { distance as turfDistance } from '@turf/distance';
import { point } from '@turf/helpers';
import { useFlightStore } from '../../store/flightStore';
import { useSettingsStore } from '../../store/settingsStore';
import Countdown from '../../components/Countdown';
import FlightMap, { type ViewMode } from '../../components/FlightMap';
import { requestWakeLock, releaseWakeLock } from '../../lib/wakelock';
import { audioBus } from '../../lib/audio';
import { notify } from '../../lib/notifications';
import { findTrack } from '../../lofi';
import { findCountry } from '../../data/countries';
import { elapsedSeconds, formatMMSS } from '../../lib/timer';
import { extractYouTubeId, isYouTubeTrack, youtubeIdFromTrack, YT_PREFIX } from '../../lib/youtube';
import TodoPanel from '../TodoPanel';
import { useTodoStore } from '../../store/todoStore';

export default function InFlight() {
  const { active, land, abort, setLofiTrack } = useFlightStore();
  const { settings } = useSettingsStore();
  const sound = useSettingsStore((s) => s.settings.soundEnabled);
  const volume = useSettingsStore((s) => s.settings.volume);
  const musicVolume = useSettingsStore((s) => s.settings.musicVolume);
  const showVideo = useSettingsStore((s) => s.settings.showMusicVideo);
  const setSound = useSettingsStore((s) => s.setSoundEnabled);
  const setVolume = useSettingsStore((s) => s.setVolume);
  const setMusicVolume = useSettingsStore((s) => s.setMusicVolume);
  const setShowMusicVideo = useSettingsStore((s) => s.setShowMusicVideo);
  const [, setTick] = useState(0);
  const [showSoundPanel, setShowSoundPanel] = useState(false);
  const [showYtPanel, setShowYtPanel] = useState(false);
  const [showTodos, setShowTodos] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const todoCount = useTodoStore((s) => s.todos.filter((t) => !t.done).length);
  const [ytInput, setYtInput] = useState('');
  const [ytErr, setYtErr] = useState('');

  function applyYouTubeFromPanel() {
    const id = extractYouTubeId(ytInput);
    if (!id) {
      setYtErr('URL을 확인해주세요');
      return;
    }
    setYtErr('');
    setLofiTrack(`${YT_PREFIX}${id}`);
    setYtInput('');
  }

  function closeAllPanels() {
    setShowSoundPanel(false);
    setShowYtPanel(false);
  }

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
      notify('비행 도착', '집중 세션이 완료되었어요.');
    }
    land();
  }

  function handleAbort() {
    if (confirm('비행을 중단할까요?')) {
      audioBus.stop('engine');
      abort();
    }
  }

  // Total + remaining distance (great-circle km).
  const totalKm = origin && destination
    ? turfDistance(point([origin.lng, origin.lat]), point([destination.lng, destination.lat]), { units: 'kilometers' })
    : 0;
  const remainingKm = Math.max(0, totalKm * (1 - progress));
  const remainingSec = Math.max(0, active.flight.plannedSeconds - elapsed);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black text-white">
      {/* Interactive map background filling the viewport */}
      <div className="absolute inset-0">
        <FlightMap
          origin={origin}
          destination={destination}
          progress={progress}
          mode={viewMode}
          className="w-full h-full"
        />
      </div>

      {/* Top-center HUD: time + distance */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1 pointer-events-none">
        <div className="flex items-center gap-6 bg-black/50 backdrop-blur px-5 py-2 rounded-full border border-white/15">
          <div className="flex flex-col items-center">
            <div className="text-[10px] text-white/50 uppercase tracking-widest">남은 시간</div>
            <div className="text-2xl font-mono font-bold leading-none">{formatMMSS(remainingSec)}</div>
          </div>
          <div className="w-px h-9 bg-white/15" />
          <div className="flex flex-col items-center">
            <div className="text-[10px] text-white/50 uppercase tracking-widest">남은 거리</div>
            <div className="text-2xl font-mono font-bold leading-none">
              {remainingKm < 10 ? remainingKm.toFixed(1) : Math.round(remainingKm).toLocaleString()}<span className="text-sm ml-0.5">km</span>
            </div>
          </div>
        </div>
        <div className="text-white/60 text-xs tracking-widest font-mono mt-1">
          {cat?.label} · {hasUserRoute && origin && destination ? `${origin.iata} → ${destination.iata}` : `좌석 ${active.flight.seat}`}
        </div>
      </div>

      {/* View-mode toggle (top-right) */}
      <button
        onClick={() => setViewMode((m) => (m === 'overview' ? 'follow' : 'overview'))}
        className="absolute top-6 right-6 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur border border-white/20 text-white text-xs hover:bg-white/15"
      >
        {viewMode === 'overview' ? '🛰️ 전체 항로' : '✈️ 3인칭'}
      </button>

      {/* Countdown still rendered (hidden) so its onExpire effect fires at 0 */}
      <div className="hidden">
        <Countdown
          startedAt={active.flight.startedAt}
          plannedSeconds={active.flight.plannedSeconds}
          onExpire={handleExpire}
        />
      </div>

      {/* Now-playing track label below the HUD */}
      {track && (
        <div className="absolute top-[120px] left-1/2 -translate-x-1/2 z-10 text-white/50 text-xs tracking-widest font-mono pointer-events-none">
          ♪ 재생 중: {track.label}
        </div>
      )}

      {/* Backdrop — closes any open popup when user clicks the map area */}
      {(showSoundPanel || showYtPanel) && (
        <div
          className="absolute inset-0 z-[5]"
          onClick={closeAllPanels}
          aria-hidden
        />
      )}

      {/* Bottom control bar — sound panel + abort, easy to see + reach */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3">
        <div className="relative">
          <button
            onClick={() => { setShowYtPanel(false); setShowSoundPanel((v) => !v); }}
            aria-label="사운드 설정"
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur border border-white/20 text-white text-sm hover:bg-white/15"
          >
            <span className="text-lg leading-none">{sound ? '🔊' : '🔇'}</span>
            <span className="hidden sm:inline">사운드</span>
          </button>
          {showSoundPanel && (
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-72 bg-black/85 backdrop-blur border border-white/20 rounded-xl p-4 space-y-3 text-white text-xs shadow-2xl">
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

        {/* Separate YouTube pill */}
        <div className="relative">
          <button
            onClick={() => { setShowSoundPanel(false); setShowYtPanel((v) => !v); }}
            aria-label="YouTube"
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur border border-white/20 text-white text-sm hover:bg-white/15"
          >
            <span className="text-base leading-none">📺</span>
            <span className="hidden sm:inline">YouTube</span>
          </button>
          {showYtPanel && (
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-80 bg-black/85 backdrop-blur border border-white/20 rounded-xl p-4 space-y-3 text-white text-xs shadow-2xl">
              <div className="text-[11px] opacity-70">YouTube URL 변경</div>
              <div className="flex gap-1.5">
                <input
                  type="url"
                  placeholder="https://youtu.be/..."
                  value={ytInput}
                  onChange={(e) => { setYtInput(e.target.value); setYtErr(''); }}
                  className="flex-1 px-2 py-1.5 text-[11px] bg-white/10 border border-white/20 rounded text-white placeholder:text-white/40"
                />
                <button
                  onClick={applyYouTubeFromPanel}
                  className="px-3 py-1.5 text-[11px] bg-orange-500/80 hover:bg-orange-500 rounded"
                >
                  적용
                </button>
              </div>
              {ytErr && <p className="text-[10px] text-red-300">{ytErr}</p>}
              {isYouTubeTrack(active.lofiTrack) && (
                <p className="text-[10px] text-emerald-300/90">현재: {youtubeIdFromTrack(active.lofiTrack)}</p>
              )}

              {isYouTubeTrack(active.lofiTrack) && (
                <label className="flex items-center gap-2 cursor-pointer pt-2 border-t border-white/15">
                  <input
                    type="checkbox"
                    checked={showVideo}
                    onChange={(e) => setShowMusicVideo(e.target.checked)}
                    className="cursor-pointer"
                  />
                  <span>🎬 영상 표시 (드래그로 위치 이동 가능)</span>
                </label>
              )}
            </div>
          )}
        </div>
        {/* Todo toggle pill */}
        <button
          onClick={() => { setShowSoundPanel(false); setShowYtPanel(false); setShowTodos((v) => !v); }}
          aria-label="할 일 목록"
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur border border-white/20 text-white text-sm hover:bg-white/15"
        >
          <span className="text-base leading-none">📝</span>
          <span className="hidden sm:inline">할 일{todoCount > 0 && ` (${todoCount})`}</span>
        </button>

        <button
          onClick={handleAbort}
          className="px-4 py-2 rounded-full bg-red-500/20 backdrop-blur border border-red-400/40 text-red-200 text-sm hover:bg-red-500/30"
        >
          중단
        </button>
      </div>

      {/* Draggable Todo panel (default visible at takeoff) */}
      {showTodos && <TodoPanel onClose={() => setShowTodos(false)} />}
    </div>
  );
}
