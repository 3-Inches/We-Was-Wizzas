import { useEffect, useState, lazy, Suspense } from 'react';
import { NavLink, Route, Routes, useLocation, Link } from 'react-router-dom';
import { useStore } from '../store/store';
import { usePlayerCharacters, usePlayerCovenants } from '../store/hooks';
import HomePage from './pages/HomePage';
import SagaPage from './pages/SagaPage';
import ImportPage from './pages/ImportPage';

const CharacterWizard = lazy(() => import('./character/CharacterWizard'));
const CharacterSheet = lazy(() => import('./character/CharacterSheet'));
const GuidedBuildPage = lazy(() => import('./character/guided/GuidedBuildPage'));
const CovenantPage = lazy(() => import('./covenant/CovenantPage'));
const SpellsPage = lazy(() => import('./pages/SpellsPage'));
const EnchantPage = lazy(() => import('./pages/EnchantPage'));
const DicePage = lazy(() => import('./pages/DicePage'));
const HouseRulesPage = lazy(() => import('./pages/HouseRulesPage'));
const ReferencePage = lazy(() => import('./pages/ReferencePage'));
const BookReader = lazy(() => import('./pages/BookReader'));
const HelpPage = lazy(() => import('./pages/HelpPage'));
const MechanicsPage = lazy(() => import('./pages/MechanicsPage'));
const SeasonsPage = lazy(() => import('./pages/SeasonsPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const MarketPage = lazy(() => import('./pages/MarketPage'));
const TribunalPage = lazy(() => import('./pages/TribunalPage'));
const QuickBuildPage = lazy(() => import('./pages/QuickBuildPage'));
const TourPanel = lazy(() => import('./tour/TourPanel'));

function applyTheme(theme: string, stream: boolean) {
  const root = document.documentElement;
  if (theme === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
  root.setAttribute('data-stream', String(stream));
}

export default function App() {
  const loaded = useStore((s) => s.loaded);
  const touring = useStore((s) => !!s.ui.tour);
  const load = useStore((s) => s.load);
  const ui = useStore((s) => s.ui);
  const [navOpen, setNavOpen] = useState(false);
  const loc = useLocation();

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => applyTheme(ui.theme, ui.streamMode), [ui]);
  useEffect(() => setNavOpen(false), [loc.pathname, loc.search]);
  // Ctrl+Z / Ctrl+Shift+Z (or Ctrl+Y) undo and redo the last change, except while typing in a field
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      const k = e.key.toLowerCase();
      const st = useStore.getState();
      const label = k === 'z' && !e.shiftKey ? st.undo() : (k === 'z' && e.shiftKey) || k === 'y' ? st.redo() : undefined;
      if (k === 'z' || k === 'y') e.preventDefault();
      if (label) st.setNotice(`${k === 'z' && !e.shiftKey ? 'Undone' : 'Redone'}: ${label}.`);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setNavOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navOpen]);

  if (!loaded) return <div className="main">Opening the covenant library…</div>;

  return (
    <div className="app">
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
      {navOpen && <div className="nav-backdrop no-print" onClick={() => setNavOpen(false)} aria-hidden="true" />}
      <div style={{ minWidth: 0 }}>
        <div className="mobile-bar no-print">
          <button className="ghost" onClick={() => setNavOpen((o) => !o)} aria-label="Menu" aria-expanded={navOpen}>
            ☰
          </button>
          <b style={{ fontFamily: 'var(--font-head)', flex: 1 }}>Ars Magica Toolkit</b>
          <UndoRedo />
        </div>
        <Notice />
        {/* room below the page while a tutorial runs, so anything can be scrolled clear of its panel */}
        <main className={`main${touring ? ' touring' : ''}`}>
          <Suspense fallback={<div className="muted">Loading…</div>}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/import" element={<ImportPage />} />
              <Route path="/saga/:sagaId" element={<SagaPage />} />
              <Route path="/saga/:sagaId/character/:charId/create" element={<CharacterWizard />} />
              <Route path="/saga/:sagaId/character/:charId/guided" element={<GuidedBuildPage />} />
              <Route path="/saga/:sagaId/character/:charId" element={<CharacterSheet />} />
              <Route path="/saga/:sagaId/covenant/:covId" element={<CovenantPage />} />
              <Route path="/saga/:sagaId/spells" element={<SpellsPage />} />
              <Route path="/saga/:sagaId/enchant" element={<EnchantPage />} />
              <Route path="/saga/:sagaId/rules" element={<HouseRulesPage />} />
              <Route path="/saga/:sagaId/seasons" element={<SeasonsPage />} />
              <Route path="/saga/:sagaId/table" element={<DashboardPage />} />
              <Route path="/saga/:sagaId/market" element={<MarketPage />} />
              <Route path="/saga/:sagaId/tribunal" element={<TribunalPage />} />
              <Route path="/saga/:sagaId/build" element={<QuickBuildPage />} />
              <Route path="/dice" element={<DicePage />} />
              <Route path="/reference" element={<ReferencePage />} />
              <Route path="/reference/book/:bookId" element={<BookReader />} />
              <Route path="/help" element={<HelpPage />} />
              <Route path="/mechanics" element={<MechanicsPage />} />
              <Route path="/mechanics/:areaId" element={<MechanicsPage />} />
              <Route path="/mechanics/:areaId/:groupId" element={<MechanicsPage />} />
              <Route path="*" element={<div>Page not found. <Link to="/">Home</Link></div>} />
            </Routes>
          </Suspense>
        </main>
        {touring && (
          <Suspense fallback={null}>
            <TourPanel />
          </Suspense>
        )}
      </div>
    </div>
  );
}

/** Tells the user when the app changed something for them (e.g. xp rebalanced for an Affinity). */
/** Undo and redo the last changes, whatever page made them. */
function UndoRedo() {
  const past = useStore((s) => s.history.past);
  const future = useStore((s) => s.history.future);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const setNotice = useStore((s) => s.setNotice);
  const last = past[past.length - 1];
  const next = future[future.length - 1];
  return (
    <span className="row tight undo-redo no-print" data-tour="undo">
      <button
        className="small ghost"
        disabled={!last}
        title={last ? `Undo ${last.label} (Ctrl+Z)` : 'Nothing to undo'}
        onClick={() => {
          const l = undo();
          if (l) setNotice(`Undone: ${l}.`);
        }}
      >
        ↶ Undo
      </button>
      <button
        className="small ghost"
        disabled={!next}
        title={next ? `Redo ${next.label} (Ctrl+Shift+Z)` : 'Nothing to redo'}
        onClick={() => {
          const l = redo();
          if (l) setNotice(`Redone: ${l}.`);
        }}
      >
        ↷ Redo
      </button>
    </span>
  );
}

function Notice() {
  const notice = useStore((s) => s.notice);
  const setNotice = useStore((s) => s.setNotice);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(undefined), notice.undo ? 30000 : 8000);
    return () => clearTimeout(t);
  }, [notice, setNotice]);
  if (!notice) return null;
  return (
    <div className="notice no-print" role="status">
      <span>{notice.text}</span>
      {notice.undo && (
        <button
          className="small"
          onClick={() => {
            notice.undo!();
            setNotice('Undone.');
          }}
        >
          Undo
        </button>
      )}
      <button className="small ghost" onClick={() => setNotice(undefined)} aria-label="Dismiss">
        ✕
      </button>
    </div>
  );
}

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const activeSagaId = useStore((s) => s.activeSagaId);
  const saga = useStore((s) => (activeSagaId ? s.sagas[activeSagaId] : undefined));
  // the Tribunal's living covenants and their people have their own page
  const chars = usePlayerCharacters(saga?.id);
  const covs = usePlayerCovenants(saga?.id);
  const openNews = (saga?.tribunalNews ?? []).filter((n) => n.kind === 'approach' && !n.done).length;
  const ui = useStore((s) => s.ui);
  const setTheme = useStore((s) => s.setTheme);
  const setStream = useStore((s) => s.setStreamMode);
  const setHints = useStore((s) => s.setHints);
  const icon: Record<string, string> = { magus: '✶', companion: '◆', mythic: '✧', grog: '◦' };
  return (
    // on a phone the menu closes on any link, the page already open included
    <aside className={`sidebar no-print ${open ? 'open' : ''}`} onClick={(e) => (e.target as HTMLElement).closest('a') && onClose()}>
      <button className="ghost nav-close" onClick={onClose} aria-label="Close the menu">
        ✕
      </button>
      <Link to="/" className="brand">
        <span className="brand-mark">A</span>
        <span className="brand-name">
          Ars Magica
          <small>Saga Toolkit · Definitive Edition</small>
        </span>
      </Link>
      <UndoRedo />
      <nav className="nav" data-tour="nav">
        <NavLink to="/" end>
          ⌂ Sagas
        </NavLink>
        {saga && (
          <>
            <div className="nav-group">{saga.name}</div>
            <NavLink to={`/saga/${saga.id}/table`} data-tour="nav-table">
              ★ Game table
            </NavLink>
            <NavLink to={`/saga/${saga.id}`} end>
              ▤ Saga overview
            </NavLink>
            <NavLink to={`/saga/${saga.id}/seasons`}>
              ⏳ Seasons · {saga.currentSeason} {saga.currentYear}
            </NavLink>
            <NavLink to={`/saga/${saga.id}/market`}>⚖ Market & treasury</NavLink>
            <NavLink to={`/saga/${saga.id}/tribunal`} data-tour="nav-tribunal">
              ⚜ The Tribunal {openNews > 0 && <span className="badge warn" title="Approaches from the Tribunal's covenants waiting for an answer">{openNews}</span>}
            </NavLink>
            {covs.map((c) => (
              <NavLink key={c.id} to={`/saga/${saga.id}/covenant/${c.id}`}>
                ⌂ {c.name || 'Unnamed covenant'}
              </NavLink>
            ))}
            {chars
              .filter((c) => !c.npc)
              .map((c) => (
                <NavLink key={c.id} to={`/saga/${saga.id}/character/${c.id}${c.creation.finalized ? '' : '/create'}`}>
                  {icon[c.type]} {c.name || '(unnamed)'} {!c.creation.finalized && <span className="badge">draft</span>}
                </NavLink>
              ))}
            {/* the storyguide's characters, folded away from the players' */}
            {chars.some((c) => c.npc) && (
              <details className="nav-npcs">
                <summary>NPCs ({chars.filter((c) => c.npc).length})</summary>
                {chars
                  .filter((c) => c.npc)
                  .map((c) => (
                    <NavLink key={c.id} to={`/saga/${saga.id}/character/${c.id}${c.creation.finalized ? '' : '/create'}`}>
                      {icon[c.type]} {c.name || '(unnamed)'}
                    </NavLink>
                  ))}
              </details>
            )}
            <div className="nav-group">Tools</div>
            <NavLink to={`/saga/${saga.id}/build`} data-tour="nav-build">
              ✦ Quick build
            </NavLink>
            <NavLink to={`/saga/${saga.id}/spells`}>✎ Spells & design</NavLink>
            <NavLink to={`/saga/${saga.id}/enchant`}>⚒ Enchantments</NavLink>
            <NavLink to={`/saga/${saga.id}/rules`}>☰ House rules & books</NavLink>
          </>
        )}
        <div className="nav-group">Reference</div>
        <NavLink to="/mechanics">⚙ Game mechanics</NavLink>
        <NavLink to="/reference" end data-tour="nav-reference">❦ Rules reference</NavLink>
        <NavLink to="/reference/book/DE">📖 Definitive Edition</NavLink>
        <NavLink to="/dice">⚄ Dice</NavLink>
        <NavLink to="/help">? Guide</NavLink>
      </nav>
      <div className="nav-group">Display</div>
      <div className="stack small" data-tour="display">
        <select value={ui.theme} onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'auto')} aria-label="Theme">
          <option value="auto">Theme: follow system</option>
          <option value="light">Theme: parchment</option>
          <option value="dark">Theme: candlelight (dark)</option>
        </select>
        <label className="inline" title="Larger text for screen sharing on Discord">
          <input type="checkbox" checked={ui.streamMode} onChange={(e) => setStream(e.target.checked)} /> Stream mode (large text)
        </label>
        <label className="inline" title="Short tips at the places new players get stuck; tutorials are on the Guide page">
          <input type="checkbox" checked={ui.hints} onChange={(e) => setHints(e.target.checked)} /> Hints for new players
        </label>
      </div>
      <p className="small muted sidebar-credit">
        Based on the material for Ars Magica, ©1993–2024, licensed by Trident, Inc. d/b/a Atlas Games®, under{' '}
        <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">
          CC BY-SA 4.0
        </a>
        . Unofficial fan tool. <Link to="/help">Credits</Link>
      </p>
    </aside>
  );
}
