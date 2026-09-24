import { useEffect, useState, lazy, Suspense } from 'react';
import { NavLink, Route, Routes, useLocation, Link } from 'react-router-dom';
import { useStore } from '../store/store';
import { useSagaCharacters, useSagaCovenants } from '../store/hooks';
import HomePage from './pages/HomePage';
import SagaPage from './pages/SagaPage';
import ImportPage from './pages/ImportPage';

const CharacterWizard = lazy(() => import('./character/CharacterWizard'));
const CharacterSheet = lazy(() => import('./character/CharacterSheet'));
const CovenantPage = lazy(() => import('./covenant/CovenantPage'));
const SpellsPage = lazy(() => import('./pages/SpellsPage'));
const EnchantPage = lazy(() => import('./pages/EnchantPage'));
const DicePage = lazy(() => import('./pages/DicePage'));
const HouseRulesPage = lazy(() => import('./pages/HouseRulesPage'));
const ReferencePage = lazy(() => import('./pages/ReferencePage'));
const BookReader = lazy(() => import('./pages/BookReader'));
const HelpPage = lazy(() => import('./pages/HelpPage'));

function applyTheme(theme: string, stream: boolean) {
  const root = document.documentElement;
  if (theme === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
  root.setAttribute('data-stream', String(stream));
}

export default function App() {
  const loaded = useStore((s) => s.loaded);
  const load = useStore((s) => s.load);
  const ui = useStore((s) => s.ui);
  const [navOpen, setNavOpen] = useState(false);
  const loc = useLocation();

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => applyTheme(ui.theme, ui.streamMode), [ui]);
  useEffect(() => setNavOpen(false), [loc.pathname]);

  if (!loaded) return <div className="main">Opening the covenant library…</div>;

  return (
    <div className="app">
      <Sidebar open={navOpen} />
      <div style={{ minWidth: 0 }}>
        <div className="mobile-bar no-print">
          <button className="ghost" onClick={() => setNavOpen((o) => !o)} aria-label="Menu">
            ☰
          </button>
          <b style={{ fontFamily: 'var(--font-head)' }}>Ars Magica Toolkit</b>
        </div>
        <main className="main">
          <Suspense fallback={<div className="muted">Loading…</div>}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/import" element={<ImportPage />} />
              <Route path="/saga/:sagaId" element={<SagaPage />} />
              <Route path="/saga/:sagaId/character/:charId/create" element={<CharacterWizard />} />
              <Route path="/saga/:sagaId/character/:charId" element={<CharacterSheet />} />
              <Route path="/saga/:sagaId/covenant/:covId" element={<CovenantPage />} />
              <Route path="/saga/:sagaId/spells" element={<SpellsPage />} />
              <Route path="/saga/:sagaId/enchant" element={<EnchantPage />} />
              <Route path="/saga/:sagaId/rules" element={<HouseRulesPage />} />
              <Route path="/dice" element={<DicePage />} />
              <Route path="/reference" element={<ReferencePage />} />
              <Route path="/reference/book/:bookId" element={<BookReader />} />
              <Route path="/help" element={<HelpPage />} />
              <Route path="*" element={<div>Page not found. <Link to="/">Home</Link></div>} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  );
}

function Sidebar({ open }: { open: boolean }) {
  const activeSagaId = useStore((s) => s.activeSagaId);
  const saga = useStore((s) => (activeSagaId ? s.sagas[activeSagaId] : undefined));
  const chars = useSagaCharacters(saga?.id);
  const covs = useSagaCovenants(saga?.id);
  const ui = useStore((s) => s.ui);
  const setTheme = useStore((s) => s.setTheme);
  const setStream = useStore((s) => s.setStreamMode);
  const icon: Record<string, string> = { magus: '✶', companion: '◆', mythic: '✧', grog: '◦' };
  return (
    <aside className={`sidebar no-print ${open ? 'open' : ''}`}>
      <Link to="/" className="brand">
        <span className="brand-mark">A</span>
        <span className="brand-name">
          Ars Magica
          <small>Saga Toolkit · Definitive Edition</small>
        </span>
      </Link>
      <nav className="nav">
        <NavLink to="/" end>
          ⌂ Sagas
        </NavLink>
        {saga && (
          <>
            <div className="nav-group">{saga.name}</div>
            <NavLink to={`/saga/${saga.id}`} end>
              ▤ Saga overview
            </NavLink>
            {covs.map((c) => (
              <NavLink key={c.id} to={`/saga/${saga.id}/covenant/${c.id}`}>
                ⌂ {c.name || 'Unnamed covenant'}
              </NavLink>
            ))}
            {chars.map((c) => (
              <NavLink key={c.id} to={`/saga/${saga.id}/character/${c.id}${c.creation.finalized ? '' : '/create'}`}>
                {icon[c.type]} {c.name || '(unnamed)'} {!c.creation.finalized && <span className="badge">draft</span>}
              </NavLink>
            ))}
            <div className="nav-group">Tools</div>
            <NavLink to={`/saga/${saga.id}/spells`}>✎ Spells & design</NavLink>
            <NavLink to={`/saga/${saga.id}/enchant`}>⚒ Enchantments</NavLink>
            <NavLink to={`/saga/${saga.id}/rules`}>⚖ House rules & books</NavLink>
          </>
        )}
        <div className="nav-group">Reference</div>
        <NavLink to="/reference" end>❦ Rules reference</NavLink>
        <NavLink to="/reference/book/DE">📖 Definitive Edition</NavLink>
        <NavLink to="/dice">⚄ Dice</NavLink>
        <NavLink to="/help">? Guide</NavLink>
      </nav>
      <div className="nav-group">Display</div>
      <div className="stack small">
        <select value={ui.theme} onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'auto')} aria-label="Theme">
          <option value="auto">Theme: follow system</option>
          <option value="light">Theme: parchment</option>
          <option value="dark">Theme: candlelight (dark)</option>
        </select>
        <label className="inline" title="Larger text for screen sharing on Discord">
          <input type="checkbox" checked={ui.streamMode} onChange={(e) => setStream(e.target.checked)} /> Stream mode (large text)
        </label>
      </div>
    </aside>
  );
}
