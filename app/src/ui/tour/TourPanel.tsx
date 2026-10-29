// The panel of the tutorial under way: the step's text, Back and Next (which go to the step's page),
// and a pulsing outline on the control the step is about. It never covers the page: the player
// keeps clicking through the real app while it explains.

import { useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStore, type TourState } from '../../store/store';
import { Markdown } from '../kit';
import { visibleSteps } from '../character/wizardSteps';
import { DETOUR_OFFERS, TOUR_BY_ID, type Tour, type TourCtx, type TourStep } from './tours';
import { ACTIONS } from './actions';

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
    // the players' characters and covenants, not the Tribunal's living ones
    const livingCovs = new Set(Object.values(covenants).filter((c) => c.sagaId === sagaId && c.living).map((c) => c.id));
    const npcs = new Set(Object.values(covenants).filter((c) => livingCovs.has(c.id)).flatMap((c) => c.memberIds));
    const inSaga = Object.values(characters).filter((c) => c.sagaId === sagaId && (!tour.charType || c.type === tour.charType) && !npcs.has(c.id) && !(c.covenantId && livingCovs.has(c.covenantId)));
    // a tour that makes a character follows the one made since it began; the others use the newest
    // finished character (or any) when none is open
    const made = newest(inSaga.filter((c) => c.createdAt >= t.startedAt));
    const finished = inSaga.filter((c) => c.creation.finalized);
    const drafts = inSaga.filter((c) => !c.creation.finalized);
    const fallback = tour.makesCharacter
      ? made
      : tour.wantsDraft
        ? (made ?? newest(drafts))
        : (made ??
          (tour.prefersTrade ? newest(finished.filter((c) => !!c.workshop || c.abilities.some((a) => a.abilityId === 'craft-type' || a.abilityId === 'profession-type'))) : undefined) ??
          newest(finished.filter((c) => c.type === tour.prefers)) ??
          newest(finished) ??
          newest(inSaga));
    const charId = fits(t.charId) ? t.charId : m?.[2] === 'character' && fits(m[3]) ? m[3] : fallback?.id;
    const covs = Object.values(covenants).filter((c) => c.sagaId === sagaId && !c.living);
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
  // step into another tutorial here, and come back to this step's successor when it ends
  const detour = (id: string) =>
    setTour({ id, step: 0, sagaId: ctx.sagaId, charId: ctx.charId, covId: ctx.covId, startedAt: new Date().toISOString(), returnTo: { id: t.id, step: i, startedAt: t.startedAt, charId: ctx.charId, covId: ctx.covId } });
  const parent = t.returnTo ? TOUR_BY_ID.get(t.returnTo.id) : undefined;
  const goBack = () => {
    const r = t.returnTo!;
    // a character built in the meantime goes straight to the parent's review step
    const ch = r.charId ? useStore.getState().characters[r.charId] : undefined;
    const review = parent!.steps.findIndex((x) => x.wizard === 'review');
    const built = ch && review >= 0 && ch.creation.step === visibleSteps(ch.type).findIndex((x) => x.id === 'review');
    setTour({ id: r.id, step: built ? review : Math.min(r.step + 1, parent!.steps.length - 1), sagaId: ctx.sagaId, charId: r.charId ?? ctx.charId, covId: r.covId ?? ctx.covId, startedAt: r.startedAt });
  };
  const run = (id: keyof typeof ACTIONS) => {
    const res = ACTIONS[id](ctx);
    if (!res) return;
    useStore.getState().setNotice(res.notice);
    const to = res.goto ? tour.steps.findIndex((x) => x.title === res.goto) : -1;
    goTo(to >= 0 ? to : Math.min(i + 1, tour.steps.length - 1));
  };
  const offer = !step.detour ? DETOUR_OFFERS.find((o) => o.tour !== t.id && o.match.test(loc.pathname)) : undefined;
  const practice = () => {
    const s = createSaga('Practice saga');
    setTour({ ...t, sagaId: s.id, charId: undefined, covId: undefined });
    const to = step.at?.({ sagaId: s.id });
    nav(to ?? `/saga/${s.id}`);
  };

  if (minimized)
    return (
      <button className="tour-pill no-print" onClick={() => setTour({ ...t, minimized: false })} aria-label="Show the tutorial">
        <span className="tour-name">{tour.title} · </span>
        {i + 1}/{tour.steps.length} ▴
      </button>
    );

  const missing = !dest && step.needs;
  const needsWork = (missing && i > 0) || (dest && !onPage) || step.actions?.length || step.detour || offer;
  return (
    <aside className="tour-panel no-print" aria-label={`Tutorial: ${tour.title}`} aria-live="polite">
      {/* one row for where you are and the buttons, so the panel stays short on a phone */}
      <div className="tour-head">
        <span className="small muted tour-count">
          <span className="tour-name">{tour.title} · </span>
          {i + 1} of {tour.steps.length}
        </span>
        <button className="small" onClick={() => goTo(i - 1)} disabled={i === 0} aria-label="Back" title="Back">
          ‹
        </button>
        {!last ? (
          <button className="small primary" onClick={() => goTo(i + 1)}>
            Next ›
          </button>
        ) : parent ? (
          <button className="small primary" onClick={goBack} title={`Back to ${parent.title}`}>
            Back to it ›
          </button>
        ) : (
          <button className="small primary" onClick={end}>
            Finish
          </button>
        )}
        <button className="small ghost" onClick={() => setTour({ ...t, minimized: true })} title="Shrink the tutorial" aria-label="Shrink the tutorial">
          ▾
        </button>
        <button className="small ghost" onClick={end} title="End the tutorial" aria-label="End the tutorial">
          ✕
        </button>
      </div>
      <h4>{step.title}</h4>
      <Markdown text={step.body} />
      {tour.inSaga && i === 0 && !t.returnTo && (
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
      {parent && last && <p className="small muted">This was a side trip from {parent.title}; the button above goes back to it.</p>}
      {needsWork && (
        <div className="row tight" style={{ marginTop: 6 }}>
          {missing && i > 0 && <span className="small warn-text">{MISSING[step.needs!]}</span>}
          {dest && !onPage && (
            <button className="small" onClick={() => nav(dest)}>
              Take me there
            </button>
          )}
          {step.actions?.map((a) => (
            <button key={a.id} className="small" onClick={() => run(a.id)} disabled={!dest && !!step.needs} title="The toolkit does this step for you; Undo takes it back">
              {a.label}
            </button>
          ))}
          {step.detour && (
            <button className="small ghost" onClick={() => detour(step.detour!.tour)}>
              {step.detour.label} ›
            </button>
          )}
          {offer && (
            <button className="small ghost" onClick={() => detour(offer.tour)}>
              {offer.label} ›
            </button>
          )}
        </div>
      )}
    </aside>
  );
}

const MISSING: Record<NonNullable<TourStep['needs']>, string> = {
  saga: 'Open a saga first (or make a practice saga on the first step).',
  character: 'Open a character first: the saga page’s Create a character makes one.',
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
