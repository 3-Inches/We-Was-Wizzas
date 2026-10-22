// The panel of the tutorial under way: the step's text, Back and Next (which go to the step's page),
// and a pulsing outline on the control the step is about. It never covers the page: the player
// keeps clicking through the real app while it explains.

import { useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStore, type TourState } from '../../store/store';
import { Markdown } from '../kit';
import { visibleSteps } from '../character/wizardSteps';
import { TOUR_BY_ID, type Tour, type TourCtx, type TourStep } from './tours';

/** Scroll an element into the room above the panel: centred there, or from its top if too tall. */
function showAbovePanel(el: HTMLElement) {
  if (el.closest('.sidebar')) return el.scrollIntoView({ block: 'nearest' });
  const r = el.getBoundingClientRect();
  const room = (document.querySelector('.tour-panel')?.getBoundingClientRect().top ?? window.innerHeight) - 16;
  const offset = r.height < room ? (room - r.height) / 2 : 16;
  window.scrollTo({ top: window.scrollY + r.top - offset, behavior: 'smooth' });
}

/** The first visible element with one of these data-tour names. */
function findTarget(names: string[]): HTMLElement | null {
  for (const n of names)
    for (const el of document.querySelectorAll<HTMLElement>(`[data-tour="${n}"]`)) if (el.getClientRects().length) return el;
  return null;
}

/** The saga, character and covenant the tour works on: what it has found so far, else what is open. */
function useTourCtx(tour: Tour | undefined, t: TourState | undefined, path: string): TourCtx {
  const characters = useStore((s) => s.characters);
  const covenants = useStore((s) => s.covenants);
  const sagas = useStore((s) => s.sagas);
  return useMemo(() => {
    if (!tour || !t) return {};
    const m = path.match(/^\/saga\/([^/]+)(?:\/(character|covenant)\/([^/?]+))?/);
    const sagaId = t.sagaId && sagas[t.sagaId] ? t.sagaId : m && sagas[m[1]] ? m[1] : undefined;
    const fits = (id?: string) => {
      const c = id ? characters[id] : undefined;
      return !!c && c.sagaId === sagaId && (!tour.charType || c.type === tour.charType);
    };
    const newest = <T extends { createdAt: string }>(xs: T[]) => [...xs].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    const inSaga = Object.values(characters).filter((c) => c.sagaId === sagaId && (!tour.charType || c.type === tour.charType));
    // a tour that makes a character follows the one made since it began; the others use the newest
    // finished character (or any) when none is open
    const made = newest(inSaga.filter((c) => c.createdAt >= t.startedAt));
    const finished = inSaga.filter((c) => c.creation.finalized);
    const fallback = tour.makesCharacter ? made : made ?? newest(finished.filter((c) => c.type === tour.prefers)) ?? newest(finished) ?? newest(inSaga);
    const charId = fits(t.charId) ? t.charId : m?.[2] === 'character' && fits(m[3]) ? m[3] : fallback?.id;
    const covs = Object.values(covenants).filter((c) => c.sagaId === sagaId);
    const covId = t.covId && covenants[t.covId]?.sagaId === sagaId ? t.covId : m?.[2] === 'covenant' && covenants[m[3]] ? m[3] : newest(covs)?.id;
    return { sagaId, charId, covId };
  }, [tour, t, path, characters, covenants, sagas]);
}

export default function TourPanel() {
  const t = useStore((s) => s.ui.tour);
  const setTour = useStore((s) => s.setTour);
  const createSaga = useStore((s) => s.createSaga);
  const sagaName = useStore((s) => (s.ui.tour?.sagaId ? s.sagas[s.ui.tour.sagaId]?.name : undefined));
  const loc = useLocation();
  const nav = useNavigate();
  const tour = t ? TOUR_BY_ID.get(t.id) : undefined;
  const here = loc.pathname + loc.search;
  const ctx = useTourCtx(tour, t, here);
  const i = t && tour ? Math.min(t.step, tour.steps.length - 1) : 0;
  const step = tour?.steps[i];
  const dest = step?.at?.(ctx);
  const onPage = !dest || isAt(here, dest);

  // remember what the tour has found, so it stays with that saga, character and covenant (and
  // drop a saved tour that no longer exists)
  useEffect(() => {
    if (!t) return;
    if (!tour) return setTour(undefined);
    if (ctx.sagaId !== t.sagaId || ctx.charId !== t.charId || ctx.covId !== t.covId) setTour({ ...t, sagaId: ctx.sagaId, charId: ctx.charId, covId: ctx.covId });
  }, [t, tour, ctx, setTour]);

  // go to the step's page on arriving at the step (once: the player may wander off and come back)
  const arrived = useRef('');
  useEffect(() => {
    if (!t) return;
    const key = `${t.id}:${t.startedAt}:${i}`;
    if (arrived.current === key || !dest) return;
    arrived.current = key;
    if (!onPage) nav(dest);
  }, [t, i, dest, onPage, nav]);

  // open the wizard step this tour step is about, once on arriving
  const opened = useRef('');
  useEffect(() => {
    if (!t || !step?.wizard || !ctx.charId || !onPage) return;
    const key = `${t.id}:${i}:${ctx.charId}`;
    if (opened.current === key) return;
    opened.current = key;
    const c = useStore.getState().characters[ctx.charId];
    const idx = c ? visibleSteps(c.type).findIndex((s) => s.id === step.wizard) : -1;
    if (c && idx >= 0 && c.creation.step !== idx) useStore.getState().updateCharacter(c.id, (x) => void (x.creation.step = idx));
  }, [t, i, step, ctx.charId, onPage]);

  // point at the step's control once it is on the page (pages load lazily, so look for a moment)
  const minimized = !!t?.minimized;
  useEffect(() => {
    if (!step?.target || minimized) return;
    const names = Array.isArray(step.target) ? step.target : [step.target];
    let el: HTMLElement | null = null;
    let tries = 0;
    const timer = window.setInterval(() => {
      el = findTarget(names);
      if (el || ++tries > 25) {
        window.clearInterval(timer);
        if (el) {
          el.setAttribute('data-tour-on', '');
          showAbovePanel(el);
        }
      }
    }, 120);
    return () => {
      window.clearInterval(timer);
      el?.removeAttribute('data-tour-on');
    };
  }, [step, here, minimized]);

  if (!t || !tour || !step) return null;
  const last = i === tour.steps.length - 1;
  const goTo = (n: number) => setTour({ ...t, step: n, minimized: false });
  const end = () => setTour(undefined);
  const practice = () => {
    const s = createSaga('Practice saga');
    setTour({ ...t, sagaId: s.id, charId: undefined, covId: undefined });
    const to = step.at?.({ sagaId: s.id });
    nav(to ?? `/saga/${s.id}`);
  };

  if (minimized)
    return (
      <button className="tour-pill no-print" onClick={() => setTour({ ...t, minimized: false })} aria-label="Show the tutorial">
        {tour.title} · {i + 1}/{tour.steps.length} ▴
      </button>
    );

  const missing = !dest && step.needs;
  return (
    <aside className="tour-panel no-print" aria-label={`Tutorial: ${tour.title}`} aria-live="polite">
      <div className="tour-head">
        <span className="small muted" style={{ flex: 1 }}>
          {tour.title} · {i + 1} of {tour.steps.length}
        </span>
        <button className="small ghost" onClick={() => setTour({ ...t, minimized: true })} title="Shrink the tutorial" aria-label="Shrink the tutorial">
          ▾
        </button>
        <button className="small ghost" onClick={end} title="End the tutorial" aria-label="End the tutorial">
          ✕
        </button>
      </div>
      <h4>{step.title}</h4>
      <Markdown text={step.body} />
      {tour.inSaga && i === 0 && (
        <p className="small muted">
          {ctx.sagaId ? (
            <>
              Working in <b>{sagaName}</b>; what you make stays there.{' '}
              <button className="small ghost" onClick={practice}>
                Use a practice saga instead
              </button>
            </>
          ) : (
            <>
              This tutorial works in a saga.{' '}
              <button className="small" onClick={practice}>
                Make a practice saga
              </button>{' '}
              or open one of yours.
            </>
          )}
        </p>
      )}
      {missing && i > 0 && <p className="small warn-text">{MISSING[step.needs!]}</p>}
      {dest && !onPage && (
        <button className="small" onClick={() => nav(dest)}>
          Take me there
        </button>
      )}
      <div className="row between" style={{ marginTop: 8 }}>
        <button className="small" onClick={() => goTo(i - 1)} disabled={i === 0}>
          ‹ Back
        </button>
        {last ? (
          <button className="small primary" onClick={end}>
            Finish
          </button>
        ) : (
          <button className="small primary" onClick={() => goTo(i + 1)}>
            Next ›
          </button>
        )}
      </div>
    </aside>
  );
}

const MISSING: Record<NonNullable<TourStep['needs']>, string> = {
  saga: 'Open a saga first (or make a practice saga on the first step).',
  character: 'Make the character first: go Back to the step that creates one.',
  covenant: 'Found the covenant first: the saga page has the button.',
};

/** Whether the app is at a step's page: the same path, and the same tab if the step names one. */
function isAt(here: string, dest: string): boolean {
  const [hp, hq = ''] = here.split('?');
  const [dp, dq] = dest.split('?');
  if (hp !== dp) return false;
  if (!dq) return true;
  const want = new URLSearchParams(dq);
  const have = new URLSearchParams(hq);
  return [...want.entries()].every(([k, v]) => have.get(k) === v || (k === 'tab' && !have.get(k) && (v === 'overview' || v === 'saga')));
}
