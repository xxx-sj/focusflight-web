import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Home from './routes/Home';
import Stats from './routes/Stats';
import Settings from './routes/Settings';

export default function App() {
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
