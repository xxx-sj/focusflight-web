import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Home from './routes/Home';
import Stats from './routes/Stats';
import Settings from './routes/Settings';
import { audioBus } from './lib/audio';
import { useSettingsStore } from './store/settingsStore';

export default function App() {
  useEffect(() => {
    try { audioBus.init(); } catch { /* ignore */ }
    const s = useSettingsStore.getState().settings;
    audioBus.setVolume(s.soundEnabled ? s.volume : 0);
    audioBus.setMusicVolume(s.soundEnabled ? s.musicVolume : 0);
    console.info('[audioBus] init settings — soundEnabled:', s.soundEnabled,
      'effectsVolume:', s.volume, 'musicVolume:', s.musicVolume);
    return useSettingsStore.subscribe((state) => {
      audioBus.setVolume(state.settings.soundEnabled ? state.settings.volume : 0);
      audioBus.setMusicVolume(state.settings.soundEnabled ? state.settings.musicVolume : 0);
    });
  }, []);

  return (
    <BrowserRouter>
      <nav className="p-4 bg-slate-900 text-white flex gap-4">
        <Link to="/">Home</Link>
        <Link to="/stats">Stats</Link>
        <Link to="/settings">Settings</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </BrowserRouter>
  );
}
