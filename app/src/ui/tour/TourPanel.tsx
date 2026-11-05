// The panel of the tutorial under way: the step's text, Back and Next (which go to the step's page),
// and a pulsing outline on the control the step is about. It never covers the page: the player
// keeps clicking through the real app while it explains.

import { useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStore, type TourState } from '../../store/store';
import type { Character } from '../../engine/types';
import { Markdown } from '../kit';
import { visibleSteps } from '../character/wizardSteps';
import { COURSE, DETOUR_OFFERS, TOUR_BY_ID, nextTour, startTour, tourNeeds, type Tour, type TourCtx, type TourStep } from './tours';
import { ACTIONS, PRACTICE_NOTE, isPracticeCovenant, makePractice } from './actions';

/** Open or close the menu, which a phone keeps behind ☰ (App listens). */
function sidebarOpen(open: boolean) {
  window.dispatchEvent(new CustomEvent('tour-nav', { detail: open }));
}

/** In the menu while a phone keeps it out of sight (by its class: it may be sliding shut). */
const inClosedSidebar = (el: HTMLElement) => {
  const sb = el.closest<HTMLElement>('.sidebar');
  return !!sb && !sb.classList.contains('open') && getComputedStyle(sb).position === 'fixed';
};

/**
 * Bring an element into the room above the panel, its top near the top of the screen as a page or
 * card is read, unless it is already in view there. In the menu, just into view.
 */
function showAbovePanel(el: HTMLElement) {
  // in the menu: to the top of it, clear of the panel over its foot on a phone
  if (el.closest('.sidebar')) {
    el.scrollIntoView({ block: 'start' });
    return;
  }
  const r = el.getBoundingClientRect();
  const top = (document.querySelector('.mobile-bar')?.getBoundingClientRect().bottom ?? 0) + 12;
  const room = (document.querySelector('.tour-panel')?.getBoundingClientRect().top ?? window.innerHeight) - 12;
  if (r.top >= top && r.bottom <= room) return;
  window.scrollTo({ top: Math.max(0, window.scrollY + r.top - top), behavior: 'smooth' });
}

/** The element a step points at: the first with one of these data-tour names that can be seen, else one in the menu a phone keeps closed. */
function findTarget(names: string[]): HTMLElement | null {
  let hidden: HTMLElement | null = null;
  for (const n of names)
    for (const el of document.querySelectorAll<HTMLElement>(`[data-tour="${n}"]`)) {
      if (!el.getClientRects().length) continue;
      if (!inClosedSidebar(el)) return el;
      hidden ??= el;
    }
  return hidden;
}

/** A craftsman's or merchant's livelihood to show. */
const hasTrade = (c: Character) => !!c.workshop || c.abilities.some((a) => a.abilityId === 'craft-type' || a.abilityId === 'profession-type');

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
          // a tutorial about a livelihood follows only someone who has one (else it offers a practice craftsman)
          (tour.prefersTrade ? newest(finished.filter(hasTrade)) : newest(finished.filter((c) => c.type === tour.prefers)) ?? newest(finished) ?? newest(inSaga)));
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

  // point at the step's control once it is on the page (pages load lazily, so look for a moment);
  // in the menu a phone keeps closed, open it. A step that asks for a button goes on once it is pressed.
  const minimized = !!t?.minimized;
  useEffect(() => {
    // looked for on the step's own page: the menu is on every page, and going there closes it
    if (!step?.target || minimized || !onPage) return;
    const names = Array.isArray(step.target) ? step.target : [step.target];
    let el: HTMLElement | null = null;
    let opened = false;
    let tries = 0;
    const onPress = (e: Event) => {
      const b = (e.target as HTMLElement).closest('button');
      if (!b || !el?.contains(b) || (step.advance?.press && !step.advance.press.test(b.textContent?.trim() ?? ''))) return;
      // after the press has done its work (a page opened, a character made)
      window.setTimeout(() => {
        const cur = useStore.getState().ui.tour;
        if (cur && t && cur.id === t.id && cur.startedAt === t.startedAt && cur.step === i) useStore.getState().setTour({ ...cur, step: i + 1 });
      }, 250);
    };
    // a folded card is opened with its own toggle, as the reader would open it
    const unfold = (card: Element) => card.querySelector<HTMLButtonElement>(':scope > .card-head > .fold-toggle')?.click();
    const timer = window.setInterval(() => {
      el = findTarget(names);
      if (el?.matches('.card.folded')) unfold(el);
      // not found: it may be inside a folded card, so open the page's folded cards
      if (!el && tries === 4) document.querySelectorAll('main .card.folded').forEach(unfold);
      if (el || ++tries > 25) {
        window.clearInterval(timer);
        if (el) {
          if (inClosedSidebar(el)) {
            sidebarOpen(true);
            opened = true;
          }
          el.setAttribute('data-tour-on', '');
          window.setTimeout(() => el && showAbovePanel(el), opened ? 250 : 0);
          // and again once the page has settled (a card above it folding, a lazy part loading)
          window.setTimeout(() => el && showAbovePanel(el), 900);
          if (step.advance) el.addEventListener('click', onPress, true);
        }
      }
    }, 120);
    return () => {
      window.clearInterval(timer);
      el?.removeAttribute('data-tour-on');
      el?.removeEventListener('click', onPress, true);
      if (opened) sidebarOpen(false);
    };
  }, [step, here, minimized, onPage, t, i]);

  // a step with nothing to point at starts at the top of its page
  useEffect(() => {
    if (!step || step.target || !onPage) return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step, onPage]);

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
  const next = nextTour(t.id);
  const goNext = () => next && startTour(next.id, { course: t.course, sagaId: ctx.sagaId });
  const toGuide = () => {
    end();
    nav('/help');
    window.setTimeout(() => document.getElementById('tutorials')?.scrollIntoView({ block: 'start' }), 300);
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
        ) : t.course && next ? (
          <button className="small primary" onClick={goNext} title={`The next tutorial: ${next.title}`}>
            Next tutorial ›
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
      {(i === 0 || (!dest && !!step.needs)) && !t.returnTo && <WorkingOn tour={tour} ctx={ctx} />}
      {last && !parent && (
        <p className="small row tight" style={{ marginTop: 6 }}>
          <span className="muted">{t.course ? `Tutorial ${COURSE.indexOf(t.id) + 1} of ${COURSE.length} done.` : 'That is the whole tutorial.'}</span>
          {next && (
            <button className="small" onClick={goNext}>
              Next: {next.title} ›
            </button>
          )}
          <button className="small ghost" onClick={toGuide}>
            Back to the Guide
          </button>
        </p>
      )}
      {t.course && i === 0 && next && (
        <p className="small muted" style={{ margin: '4px 0 0' }}>
          Taking every tutorial in turn ({COURSE.indexOf(t.id) + 1} of {COURSE.length}).{' '}
          <button className="small ghost" onClick={goNext} title={`Go on to ${next.title}`}>
            Skip this one ›
          </button>
        </p>
      )}
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
  character: 'Choose the character to work on above, or make a practice one there.',
  covenant: 'Choose the covenant above, or found one: the Covenants page has the button.',
};

/**
 * What the tutorial works on: the saga's characters and covenants that suit it (the players', not
 * the Tribunal's), or a practice one made for it on the spot, so a tutorial never has to wait for
 * the player to go and make something first.
 */
function WorkingOn({ tour, ctx }: { tour: Tour; ctx: TourCtx }) {
  const t = useStore((s) => s.ui.tour);
  const setTour = useStore((s) => s.setTour);
  const characters = useStore((s) => s.characters);
  const covenants = useStore((s) => s.covenants);
  const nav = useNavigate();
  const needs = tourNeeds(tour);
  if (!t || (!needs.character && !needs.covenant)) return null;
  const living = Object.values(covenants).filter((c) => c.sagaId === ctx.sagaId && c.living);
  const npcs = new Set(living.flatMap((c) => c.memberIds));
  const livingIds = new Set(living.map((c) => c.id));
  const chars = Object.values(characters)
    .filter((c) => c.sagaId === ctx.sagaId && !npcs.has(c.id) && !(c.covenantId && livingIds.has(c.covenantId)) && !c.wounds.dead)
    .filter((c) => (!tour.charType || c.type === tour.charType) && (tour.wantsDraft ? !c.creation.finalized : c.creation.finalized) && (!tour.prefersTrade || hasTrade(c)))
    .sort((a, b) => a.name.localeCompare(b.name));
  const covs = Object.values(covenants).filter((c) => c.sagaId === ctx.sagaId && !c.living);
  // go on to the step's page with what was chosen
  const use = (x: TourCtx) => {
    setTour({ ...t, ...x });
    const to = tour.steps[Math.min(t.step, tour.steps.length - 1)].at?.({ ...ctx, ...x });
    if (to) nav(to);
  };
  const practice = (what: { character?: boolean; covenant?: boolean }) => {
    const r = makePractice(tour, ctx, what);
    useStore.getState().setNotice(r.notice);
    use({ sagaId: r.sagaId, charId: r.charId ?? ctx.charId, covId: r.covId ?? ctx.covId });
  };
  const known = chars.some((c) => c.id === ctx.charId);
  return (
    <div className="row tight small" style={{ marginTop: 6 }}>
      {needs.character && (
        <label className="inline">
          Working on{' '}
          <select value={known ? ctx.charId : ''} onChange={(e) => (e.target.value === '__practice' ? practice({ character: true }) : e.target.value && use({ charId: e.target.value }))} aria-label="The character this tutorial works on">
            {!known && <option value="">— {chars.length ? 'choose a character' : 'none that suits yet'} —</option>}
            {chars.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name || 'Unnamed'}
                {c.creation.finalized ? '' : ' (in creation)'}
              </option>
            ))}
            {tour.practice && !chars.some((c) => (c.notes ?? '').includes(`${PRACTICE_NOTE} (${tour.title})`)) && <option value="__practice">＋ Make {tour.practice.label}</option>}
          </select>
        </label>
      )}
      {needs.covenant && (
        <label className="inline">
          {needs.character ? 'at' : 'Working on'}{' '}
          <select value={covs.some((c) => c.id === ctx.covId) ? ctx.covId : ''} onChange={(e) => (e.target.value === '__practice' ? practice({ covenant: true }) : e.target.value && use({ covId: e.target.value }))} aria-label="The covenant this tutorial works on">
            {!covs.some((c) => c.id === ctx.covId) && <option value="">— {covs.length ? 'choose a covenant' : 'no covenant yet'} —</option>}
            {covs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name || 'Unnamed covenant'}
              </option>
            ))}
            {!covs.some(isPracticeCovenant) && <option value="__practice">＋ Make a practice covenant</option>}
          </select>
        </label>
      )}
    </div>
  );
}

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
