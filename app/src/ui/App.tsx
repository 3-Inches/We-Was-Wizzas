import { useEffect, useState, lazy, Suspense } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation, useParams, useSearchParams, Link } from 'react-router-dom';
import { useStore } from '../store/store';
import HomePage from './pages/HomePage';
import SagaPage from './pages/SagaPage';
import ImportPage from './pages/ImportPage';
import { PageErrorBoundary } from './ErrorBoundary';
import { R, sagaTabForRulesTab } from './routes';

const CharacterWizard = lazy(() => import('./character/CharacterWizard'));
const CharacterSheet = lazy(() => import('./character/CharacterSheet'));
const GuidedBuildPage = lazy(() => import('./character/guided/GuidedBuildPage'));
const CovenantPage = lazy(() => import('./covenant/CovenantPage'));
const SpellsPage = lazy(() => import('./pages/SpellsPage'));
const EnchantPage = lazy(() => import('./pages/EnchantPage'));
const DicePage = lazy(() => import('./pages/DicePage'));
const ReferencePage = lazy(() => import('./pages/ReferencePage'));
const BookReader = lazy(() => import('./pages/BookReader'));
const HelpPage = lazy(() => import('./pages/HelpPage'));
const MechanicsPage = lazy(() => import('./pages/MechanicsPage'));
const GameTablePage = lazy(() => import('./pages/GameTablePage'));
const PeoplePage = lazy(() => import('./pages/PeoplePage'));
const CovenantsPage = lazy(() => import('./pages/CovenantsPage'));
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
  // a new page opens at its top, not where the last one was scrolled to
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [loc.pathname]);
  // a tutorial step about the menu opens it on a phone, and closes it after
  useEffect(() => {
    const onTour = (e: Event) => setNavOpen(!!(e as CustomEvent<boolean>).detail);
    window.addEventListener('tour-nav', onTour);
    return () => window.removeEventListener('tour-nav', onTour);
  }, []);
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
          <PageErrorBoundary resetKey={loc.pathname + loc.search}>
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
                <Route path="/saga/:sagaId/table" element={<GameTablePage />} />
                <Route path="/saga/:sagaId/people" element={<PeoplePage />} />
                <Route path="/saga/:sagaId/covenants" element={<CovenantsPage />} />
                {/* pages that moved: their old addresses still lead there */}
                <Route path="/saga/:sagaId/rules" element={<Moved to={(id, q) => R.saga(id, sagaTabForRulesTab(q.get('tab')))} />} />
                <Route path="/saga/:sagaId/seasons" element={<Moved to={(id) => R.seasons(id)} />} />
                <Route path="/saga/:sagaId/market" element={<Moved to={(id) => R.market(id)} />} />
                <Route path="/saga/:sagaId/tribunal" element={<TribunalPage />} />
                <Route path="/saga/:sagaId/build" element={<QuickBuildPage />} />
                <Route path="/dice" element={<DiceMoved />} />
                <Route path="/reference" element={<ReferencePage />} />
                <Route path="/reference/book/:bookId" element={<BookReader />} />
                <Route path="/help" element={<HelpPage />} />
                <Route path="/mechanics" element={<MechanicsPage />} />
                <Route path="/mechanics/:areaId" element={<MechanicsPage />} />
                <Route path="/mechanics/:areaId/:groupId" element={<MechanicsPage />} />
                <Route path="*" element={<div>Page not found. <Link to="/">Home</Link></div>} />
              </Routes>
            </Suspense>
          </PageErrorBoundary>
        </main>
        {touring && (
          <PageErrorBoundary resetKey={loc.pathname + loc.search} quiet>
            <Suspense fallback={null}>
              <TourPanel />
            </Suspense>
          </PageErrorBoundary>
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

/** A page that moved: sends its old address on to where it is now. */
function Moved({ to }: { to: (sagaId: string, q: URLSearchParams) => string }) {
  const { sagaId } = useParams();
  const [q] = useSearchParams();
  return sagaId ? <Navigate replace to={to(sagaId, q)} /> : <Navigate replace to="/" />;
}

/** The Dice are a page of the Game Table; with no saga open they stand alone. */
function DiceMoved() {
  const active = useStore((s) => s.activeSagaId);
  const saga = useStore((s) => (active ? s.sagas[active] : undefined));
  return saga ? <Navigate replace to={R.dice(saga.id)} /> : <DicePage standalone />;
}

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const activeSagaId = useStore((s) => s.activeSagaId);
  const saga = useStore((s) => (activeSagaId ? s.sagas[activeSagaId] : undefined));
  const loc = useLocation();
  // a covenant's page is under Covenants, a character's sheet under People
  const under = (prefix: string) => (saga ? loc.pathname.startsWith(`/saga/${saga.id}/${prefix}`) : false);
  const openNews = (saga?.tribunalNews ?? []).filter((n) => n.kind === 'approach' && !n.done).length;
  const ui = useStore((s) => s.ui);
  const setTheme = useStore((s) => s.setTheme);
  const setStream = useStore((s) => s.setStreamMode);
  const setHints = useStore((s) => s.setHints);
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
            {/* the same entries always: the saga's pages, then the tools; what is in them is on their pages */}
            <div className="nav-group">{saga.name}</div>
            <NavLink to={R.saga(saga.id)} end>
              ▤ Saga Overview
            </NavLink>
            <NavLink to={R.table(saga.id)} data-tour="nav-table">
              ★ Game Table <span className="small muted">· {saga.currentSeason} {saga.currentYear}</span>
            </NavLink>
            <NavLink to={R.covenants(saga.id)} className={({ isActive }) => (isActive || under('covenant/') ? 'active' : '')} data-tour="nav-covenants">
              ♜ Covenants
            </NavLink>
            <NavLink to={R.people(saga.id)} className={({ isActive }) => (isActive || under('character/') ? 'active' : '')} data-tour="nav-people">
              ☺ People
            </NavLink>
            <NavLink to={R.tribunal(saga.id)} data-tour="nav-tribunal">
              ⚜ The Tribunal {openNews > 0 && <span className="badge warn" title="Approaches from the Tribunal's covenants waiting for an answer">{openNews}</span>}
            </NavLink>
            <div className="nav-group">Tools</div>
            <NavLink to={`/saga/${saga.id}/build`} data-tour="nav-build">
              ✦ Quick Build
            </NavLink>
            <NavLink to={`/saga/${saga.id}/spells`}>✎ Spells & Design</NavLink>
            <NavLink to={`/saga/${saga.id}/enchant`}>⚒ Enchantments</NavLink>
          </>
        )}
        <div className="nav-group">Reference</div>
        <NavLink to="/help" data-tour="nav-guide">? Guide</NavLink>
        <NavLink to="/mechanics">⚙ Game Mechanics</NavLink>
        <NavLink to="/reference" end data-tour="nav-reference">❦ Rules Reference</NavLink>
        <NavLink to="/reference/book/DE">📖 Definitive Edition</NavLink>
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
