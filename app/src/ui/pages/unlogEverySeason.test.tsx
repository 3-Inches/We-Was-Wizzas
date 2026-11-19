// @vitest-environment jsdom
// Unlog takes back a season whole (roadmap Batch A, 5.12 and the check after it; audit 3, B1). A season
// done from a card is logged by the card's own code, so this presses the cards' buttons as a player
// would: a character's season in full is drawn on Game Table › Seasons, each button that logs a season
// is pressed (and each choice of the season cards' selects tried first), and the season is unlogged as
// the Unlog button does it. The character, the others and the covenants must be as they were. It finds
// the buttons itself, so a new card is checked without a change here. The clock's own seasons are
// checked in src/engine/unlogEverySeason.test.ts.
import { describe, expect, it, vi } from 'vitest';
vi.mock('idb-keyval', () => ({ get: async () => undefined, set: async () => undefined, del: async () => undefined }));
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { deriveCharacter } from '../../engine/character/derive';
import { ensureAbility } from '../../engine/character/factory';
import { characterContext } from '../../engine/context';
import { holyWorksOpen } from '../../engine/holy';
import { differences, sagaFixtures } from '../../engine/testing/unlogCheck';
import type { SagaState } from '../../engine/time';
import type { Character } from '../../engine/types';
import { canUnlog, unlogSeason } from '../../engine/unlog';
import { isTrade, newWorkshop } from '../../engine/workshop';
import { gameDataFor, useSagaCharacters } from '../../store/hooks';
import { useStore } from '../../store/store';
import { useCharEditor } from '../character/useChar';
import { seasonCards } from './seasonCards';
import { SeasonInFull } from './SeasonInFull';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function Season({ sagaId, charId }: { sagaId: string; charId: string }) {
  const ed = useCharEditor({ sagaId, charId });
  const chars = useSagaCharacters(sagaId);
  return <SeasonInFull ed={ed} chars={chars} />;
}

/** Buttons that only fold, show, step a number or explain: never a season's work. */
const NOT_WORK = /^(▾ Fold|▸ Show|More|Less|Read the rules|How |−|\+|✕|\d+$)/;
/** The cards whose selects choose the season's work: a character's own work, and Plan a season. */
const WORK_CARDS = /^(witch-kitchen|hedge-|gruagach-season|vitki-season|holy-|mason-season|workshop-season|lab-projects|original-research|longevity|apprentice|plan-season)/;

/** What the troupe would keep: the saga's characters and covenants, and the saga. */
const records = () => {
  const s = useStore.getState();
  return structuredClone({ saga: Object.values(s.sagas)[0], characters: Object.values(s.characters), covenants: Object.values(s.covenants) });
};

/**
 * The practice sagas, each with what its characters may begin elsewhere set up, so their season's work
 * shows: an apprentice for a magus, a workshop for one with a trade, a holy work begun, a mason.
 */
function prepared(): [string, SagaState][] {
  return sagaFixtures().map(([name, f]) => {
    const st: SagaState = structuredClone(f);
    const data = gameDataFor(st.saga);
    const alive = st.characters.filter((c) => c.creation.finalized && !c.wounds.dead);
    const magus = alive.find((c) => c.type === 'magus' && !c.apprentice);
    if (magus) magus.apprentice = { name: 'Ansel', gender: 'Male', since: st.saga.currentYear - 2, age: 10, seasons: 4 };
    const crafter = alive.find((c) => !c.workshop && c.abilities.some((a) => isTrade(a.abilityId)));
    if (crafter) crafter.workshop = newWorkshop(crafter.abilities.find((a) => isTrade(a.abilityId))!.uid, false);
    for (const c of alive) {
      const open = holyWorksOpen(deriveCharacter(c, data, st.saga.houseRules));
      if (open.length && !c.holy?.works?.length) c.holy = { ...(c.holy ?? {}), works: [{ uid: `w-${c.id}`, kind: open[0], name: 'A work', progress: 0, seasons: 0, target: open[0] === 'shinnui' ? 1 : 10 }] };
    }
    const mason = alive.find((c) => c.type === 'grog' && c.covenantId);
    if (mason) ensureAbility(mason, 'craft-type', { laterLife: 75 }, 'Mason');
    return [name, st];
  });
}

/** One character for each kind and set of their own season cards, across the sagas: a second like them adds nothing. */
function characters(st: SagaState, seen: Set<string>): Character[] {
  const data = gameDataFor(st.saga);
  return st.characters.filter((c) => {
    if (!c.creation.finalized || c.wounds.dead) return false;
    const d = deriveCharacter(c, data, st.saga.houseRules);
    const own = seasonCards(c, d, st.saga, characterContext(c, st.covenants, data).covenant).shown.filter((s) => s.group === 'own').map((s) => s.card);
    // the hedge traditions share a card, drawn as each tradition's own: each practice saga has its tradition
    const key = `${c.type} ${own.join(',')}${own.includes('hedge') ? ` ${st.saga.id}` : ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

interface Pressed {
  /** what was pressed, for the message */
  what: string;
  /** where a season, unlogged, did not leave things as they were */
  problems: string[];
  /** the seasons logged (their summaries), or none */
  seasons: string[];
}

/** The saga as it was, back in the store. */
function load(st: SagaState) {
  useStore.setState({
    sagas: { [st.saga.id]: structuredClone(st.saga) },
    characters: Object.fromEntries(st.characters.map((x) => [x.id, structuredClone(x)])),
    covenants: Object.fromEntries(st.covenants.map((x) => [x.id, structuredClone(x)])),
  });
}

/** Set a select as a player would. */
function choose(el: HTMLElement, i: number, value: string) {
  const sel = el.querySelectorAll('select')[i] as HTMLSelectElement | undefined;
  if (!sel) return;
  Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!.call(sel, value);
  sel.dispatchEvent(new Event('change', { bubbles: true }));
}

/** Fill each empty text field of the season-work cards as a player would (a curse's target, a charm's name), so its button can be pressed. */
function fill(el: Element) {
  el.querySelectorAll('input:not([type]), input[type="text"]').forEach((i) => {
    const input = i as HTMLInputElement;
    // not Plan a season's, which names the season logged
    const tour = input.closest('section')?.getAttribute('data-tour') ?? '';
    if (input.value || !WORK_CARDS.test(tour) || tour === 'plan-season') return;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, 'Wulfstan');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

/** Press a button: if it logged a season, unlog it as the Unlog button does, and say what is not as it was. */
async function pressed(b: HTMLButtonElement, what: string): Promise<Pressed> {
  const before = records();
  await act(async () => b.click());
  const after = records();
  const logged = after.characters.flatMap((x) => x.seasonLog.filter((e) => !before.characters.find((y) => y.id === x.id)?.seasonLog.some((y) => y.uid === e.uid)).map((e) => ({ x, e })));
  if (!logged.length) return { what, problems: [], seasons: [] };
  const seasons = logged.map(({ e }) => e.summary);
  // a season whose work made something stays logged, and says why: nothing to compare
  if (logged.some(({ e }) => !canUnlog(e).ok)) return { what, problems: logged.every(({ e }) => canUnlog(e).ok || canUnlog(e).why) ? [] : ['cannot be unlogged, and says not why'], seasons };
  for (const { x, e } of logged.reverse()) {
    const r = unlogSeason(x, e.uid, after.covenants);
    if (!r.ok) return { what, problems: [`Unlog refused: ${r.why}`], seasons };
  }
  return { what, problems: differences(before, after), seasons };
}

/**
 * Draw `c`'s season in full once, and press each button that might be work, the saga put back as it was
 * before each; then each choice of each select in the season-work cards, with each button of that card.
 * Buttons that fold or step a number are not pressed, so the cards' own state stays as drawn.
 */
async function pressAll(st: SagaState, c: Character): Promise<Pressed[]> {
  const out: Pressed[] = [];
  localStorage.clear();
  load(st);
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root: Root = createRoot(el);
  const button = (i: number, within?: Element | null) => (within ?? el).querySelectorAll('button')[i] as HTMLButtonElement | undefined;
  const work = (b?: HTMLButtonElement) => !!b && !b.disabled && !NOT_WORK.test(b.textContent?.trim() ?? '');
  try {
    await act(async () => root.render(<MemoryRouter><Season sagaId={st.saga.id} charId={c.id} /></MemoryRouter>));
    // the saga is put back only after a press: a button not pressed changed nothing
    let dirty = false;
    const n = el.querySelectorAll('button').length;
    for (let i = 0; i < n; i++) {
      if (dirty) await act(async () => load(st));
      if (dirty || i === 0) await act(async () => fill(el));
      dirty = false;
      const b = button(i);
      if (!work(b)) continue;
      out.push(await pressed(b!, `[${b!.textContent?.trim()}]`));
      dirty = true;
    }
    // the first select of each season-work card chooses the kind of work (the kitchen's, Plan a season's activity):
    // each choice, then each button of the card that the choice changes, enables or brings
    const selects: { i: number; options: string[]; drawn: string[] }[] = [];
    const label = (b?: HTMLButtonElement) => (work(b) ? b!.textContent!.trim() : '');
    const cards = new Set<Element>();
    el.querySelectorAll('select').forEach((s, i) => {
      const card = s.closest('section');
      if (!card || cards.has(card) || !WORK_CARDS.test(card.getAttribute('data-tour') ?? '')) return;
      cards.add(card);
      selects.push({ i, options: [...s.options].map((o) => o.value), drawn: [...card.querySelectorAll('button')].map((b) => label(b as HTMLButtonElement)) });
    });
    for (const s of selects)
      for (const value of s.options) {
        const card = () => el.querySelectorAll('select')[s.i]?.closest('section');
        dirty = true;
        for (let j = 0; j < (card()?.querySelectorAll('button').length ?? 0); j++) {
          if (dirty) {
            await act(async () => load(st));
            await act(async () => choose(el, s.i, value));
            await act(async () => fill(el));
          }
          dirty = false;
          const b = button(j, card());
          if (!work(b) || label(b) === s.drawn[j]) continue;
          out.push(await pressed(b!, `${value} [${b!.textContent?.trim()}]`));
          dirty = true;
        }
      }
  } finally {
    await act(async () => root.unmount());
    el.remove();
  }
  return out;
}

describe('a season done from a card, unlogged, leaves everyone as they were', () => {
  it('on one character of each kind in each practice saga, pressing every button of their season in full', async () => {
    window.confirm = () => true;
    window.alert = () => undefined;
    Element.prototype.scrollIntoView = () => undefined;
    const out: Pressed[] = [];
    const seen = new Set<string>();
    for (const [name, st] of prepared()) for (const c of characters(st, seen)) {
      for (const r of await pressAll(st, c)) out.push({ ...r, what: `${name}: ${c.name} (${c.type}): ${r.what}` });
    }
    const problems = out.flatMap((r) => r.problems.map((p) => `${r.what}: ${p}`));
    expect(problems).toEqual([]);
    // the kinds of season it reached, by how each is logged, so a change that stops reaching one is noticed
    const reached = new Set(out.filter((r) => r.seasons.length).map((r) => r.seasons[0].replace(/[:(].*/, '').trim()));
    for (const k of ['Lab', 'Taught Ansel, the apprentice', 'Read a summa', 'Practice', 'Exposure', 'Studied Creo vis', 'Worship', 'Wrote', 'Devotion', 'Building', 'Holy work', 'Elemental refining', 'Gruagach', 'Learned magic', 'Vitki', "Witch's kitchen"])
      expect([...reached], k).toContain(k);
    expect([...reached].some((k) => /^Worked as/.test(k)), 'a season in the workshop').toBe(true);
    // and the seasons whose rolls wait for the season's end, or that change a tradition's own record
    const whole = new Set(out.flatMap((r) => r.seasons));
    for (const k of ["Witch's kitchen: a curse woven", 'Gruagach: inventing', 'Vitki: learning rune scripts', 'Devotion: the search for the Book of Solomon'])
      expect([...whole].some((x) => x.startsWith(k)), k).toBe(true);
  }, 120000);
});
