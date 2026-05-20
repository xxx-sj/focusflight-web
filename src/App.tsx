import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Home from './routes/Home';
import Stats from './routes/Stats';
import Settings from './routes/Settings';
import { audioBus } from './lib/audio';
import { useSettingsStore } from './store/settingsStore';
import MusicLayer from './flight/MusicLayer';

export default function App() {
  useEffect(() => {
    try { audioBus.init(); } catch { /* ignore */ }
    const s = useSettingsStore.getState().settings;
    audioBus.setVolume(s.soundEnabled ? s.volume : 0);
    audioBus.setMusicVolume(s.soundEnabled ? s.musicVolume : 0);
    return useSettingsStore.subscribe((state) => {
      audioBus.setVolume(state.settings.soundEnabled ? state.settings.volume : 0);
      audioBus.setMusicVolume(state.settings.soundEnabled ? state.settings.musicVolume : 0);
    });
  }, []);

  return (
    <BrowserRouter>
      <MusicLayer />
      <nav className="p-4 bg-slate-900 text-white flex items-center gap-4">
        <Link to="/" className="font-bold tracking-tight mr-2">여행 뽀모도로</Link>
        <span className="text-white/20">|</span>
        <Link to="/">홈</Link>
        <Link to="/stats">통계</Link>
        <Link to="/settings">설정</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </BrowserRouter>
  );
}
