// @vitest-environment jsdom
// Plan a season, pressed as a player would (roadmap Batch B, 5.13 and 5.11): a botched study from vis
// teaches nothing, and a book on an Ability the character has not begun begins it.
import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('idb-keyval', () => ({ get: async () => undefined, set: async () => undefined, del: async () => undefined }));
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { addVirtue, ensureAbility, newCharacter } from '../../../engine/character/factory';
import { newCovenant } from '../../../engine/covenant';
import { unlogSeason } from '../../../engine/unlog';
import type { Character, Covenant, LibraryBook } from '../../../engine/types';
import { gameDataFor } from '../../../store/hooks';
import { newSaga, useStore } from '../../../store/store';
import { useCharEditor } from '../useChar';
import { PlanSeasonCard } from './PlanSeasonCard';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function Plan({ sagaId, charId }: { sagaId: string; charId: string }) {
  return <PlanSeasonCard ed={useCharEditor({ sagaId, charId })} />;
}

let root: Root | undefined;
let el: HTMLDivElement | undefined;
afterEach(async () => {
  vi.restoreAllMocks();
  if (root) await act(async () => root!.unmount());
  el?.remove();
  root = undefined;
});

async function draw(c: Character, cov?: Covenant) {
  const saga = newSaga('Test');
  saga.currentYear = 1220;
  saga.currentSeason = 'Spring';
  c.sagaId = saga.id;
  c.creation.finalized = true;
  if (cov) {
    cov.sagaId = saga.id;
    c.covenantId = cov.id;
    cov.memberIds.push(c.id);
  }
  localStorage.clear();
  useStore.setState({ sagas: { [saga.id]: saga }, characters: { [c.id]: c }, covenants: cov ? { [cov.id]: cov } : {} });
  el = document.createElement('div');
  document.body.appendChild(el);
  root = createRoot(el);
  await act(async () => root!.render(<MemoryRouter><Plan sagaId={saga.id} charId={c.id} /></MemoryRouter>));
  return saga;
}

const me = (id: string) => useStore.getState().characters[id];
const selectWith = (text: string) => [...el!.querySelectorAll('select')].find((s) => [...s.options].some((o) => o.textContent?.includes(text))) as HTMLSelectElement;
async function choose(sel: HTMLSelectElement, value: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!.call(sel, value);
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  });
}
const button = (re: RegExp) => [...el!.querySelectorAll('button')].find((b) => re.test(b.textContent ?? '')) as HTMLButtonElement;

describe('a botched study from vis, in Plan a season', () => {
  it('teaches nothing, aura or no, and spends the vis (DE, Stress Rolls, line 570)', async () => {
    const m = newCharacter('magus', 'x');
    m.name = 'Magus';
    m.arts.Cr = { play: 15 }; // Creo 5: one pawn, one botch die
    m.purse = { pounds: 0, vis: [{ art: 'Cr', pawns: 3 }] };
    await draw(m); // no covenant: a Magic aura of 3
    await choose(selectWith('Study raw vis'), 'vis');
    // the stress die shows 0 and the botch die 0: a botch
    vi.spyOn(Math, 'random').mockReturnValue(0);
    await act(async () => button(/Roll stress die/).click());
    expect(el!.textContent).toMatch(/Botch: 1 Warping point\(s\), no xp/);
    // "On a botch, your total for the roll is never any higher than zero": the aura adds nothing
    expect(el!.textContent).toMatch(/\+0xp gained/);
    const log = button(/^Log season/);
    expect(log.textContent).toBe('Log season');
    await act(async () => log.click());
    const after = me(m.id);
    const e = after.seasonLog.at(-1)!;
    expect(e.activity).toBe('study-vis');
    expect(e.sourceQuality).toBe(0);
    expect(Object.values(e.gains).filter((x) => x > 0)).toEqual([]);
    expect(after.arts.Cr).toEqual({ play: 15 });
    expect(after.purse?.vis).toEqual([{ art: 'Cr', pawns: 2 }]);
    expect(e.warpingPoints).toBe(1);
  });

  it('a die entered by hand is its own roll: a toolkit botch is cleared, a botch by hand recorded', async () => {
    const m = newCharacter('magus', 'x');
    m.arts.Cr = { play: 15 };
    m.purse = { pounds: 0, vis: [{ art: 'Cr', pawns: 3 }] };
    await draw(m);
    await choose(selectWith('Study raw vis'), 'vis');
    vi.spyOn(Math, 'random').mockReturnValue(0);
    await act(async () => button(/Roll stress die/).click());
    expect(el!.textContent).toMatch(/no xp/);
    vi.restoreAllMocks();
    // the die read from the table, 7: no botch, the aura counts
    const plus = [...el!.querySelectorAll('[data-tour="plan-season"] button, section button')].find((b) => b.textContent === '+' && b.closest('label, .field, div')?.textContent?.includes('or enter die')) as HTMLButtonElement;
    for (let i = 0; i < 7; i++) await act(async () => plus.click());
    expect(el!.textContent).not.toMatch(/Botch:/);
    expect(el!.textContent).toMatch(/\+10xp gained/);
  });

  it('a die that does not botch still counts the aura', async () => {
    const m = newCharacter('magus', 'x');
    m.arts.Cr = { play: 15 };
    m.purse = { pounds: 0, vis: [{ art: 'Cr', pawns: 3 }] };
    await draw(m);
    await choose(selectWith('Study raw vis'), 'vis');
    vi.spyOn(Math, 'random').mockReturnValue(0.45); // a 4
    await act(async () => button(/Roll stress die/).click());
    expect(el!.textContent).toMatch(/\+7xp gained/); // 4 + aura 3
  });
});

const latinSumma = (language: string): LibraryBook => ({ uid: 'b-latin', title: 'Ars Grammatica', kind: 'summa', subjectType: 'ability', subject: 'dead-language', param: 'Latin', level: 4, quality: 10, language });
const swordSumma: LibraryBook = { uid: 'b-sword', title: 'De Re Militari', kind: 'summa', subjectType: 'ability', subject: 'single-weapon', level: 4, quality: 10, language: 'German' };

function companion(o: { clerk: boolean }) {
  const s = newSaga('x');
  const data = gameDataFor(s);
  const c = newCharacter('companion', s.id);
  c.name = 'Gerda';
  if (o.clerk) addVirtue(c, data, 'clerk');
  ensureAbility(c, 'living-language', { laterLife: 75 }, 'German'); // German 5
  ensureAbility(c, 'artes-liberales', { laterLife: 5 }); // literate
  return c;
}

describe('a book on an Ability the character has not begun, in Plan a season', () => {
  it('is offered to a companion who may learn it, and reading it begins the Ability at 0', async () => {
    const c = companion({ clerk: true });
    const cov = newCovenant('x', 1220);
    // a summa on Latin, written in a language she reads (DE line 16191: she must be fluent in the book's language)
    cov.library = [latinSumma('German'), swordSumma];
    await draw(c, cov);
    const books = selectWith('Ars Grammatica');
    // a Martial Ability needs a Virtue that opens it: not offered (DE, Abilities, line 1149)
    expect([...books.options].map((o) => o.textContent)).toEqual(['— enter manually —', 'Ars Grammatica (summa Latin L4 Q10), new']);
    await choose(books, 'b-latin');
    expect(selectWith('(new, from the book)').value).toBe('new-book:b-latin');
    expect(el!.textContent).not.toMatch(/cannot read/);
    const log = button(/^Log season/);
    expect(log.textContent).toBe('Log season & add 10 xp');
    await act(async () => log.click());
    const after = me(c.id);
    const latin = after.abilities.find((a) => a.abilityId === 'dead-language' && a.param === 'Latin');
    expect(latin, 'Latin begun').toBeDefined();
    const e = after.seasonLog.at(-1)!;
    expect(e.summary).toMatch(/Read a summa: Latin \(\+10 xp\)/);
    expect(e.gains).toEqual({ [`ability:${latin!.uid}`]: 10 });
    // and Unlog takes the Ability away again
    const back = structuredClone(after);
    expect(unlogSeason(back, e.uid, []).ok).toBe(true);
    expect(back.abilities.some((a) => a.abilityId === 'dead-language')).toBe(false);
  });

  it('is not offered to one who may not learn it', async () => {
    const c = companion({ clerk: false });
    const cov = newCovenant('x', 1220);
    cov.library = [latinSumma('German'), swordSumma];
    await draw(c, cov);
    expect(selectWith('Ars Grammatica')).toBeUndefined();
  });

  it('offers a book on a Supernatural Ability only to one with a score of 1 in it (DE line 16203)', async () => {
    const c = companion({ clerk: true });
    const sight = ensureAbility(c, 'second-sight', {});
    const cov = newCovenant('x', 1220);
    cov.library = [{ uid: 'b-sight', title: 'De Visionibus', kind: 'summa', subjectType: 'ability', subject: 'second-sight', level: 4, quality: 10, language: 'German' }, latinSumma('German')];
    await draw(c, cov);
    expect([...selectWith('Ars Grammatica').options].map((o) => o.textContent)).not.toContain('De Visionibus (summa Second Sight L4 Q10)');
    expect(selectWith('De Visionibus')).toBeUndefined();
    await act(async () => root!.unmount());
    el!.remove();
    sight.xp = { laterLife: 5 }; // Second Sight 1
    await draw(c, cov);
    expect(selectWith('De Visionibus')).toBeDefined();
  });

  it('a tractatus read and unlogged can be read again', async () => {
    const c = companion({ clerk: true });
    ensureAbility(c, 'dead-language', { laterLife: 75 }, 'Latin');
    const cov = newCovenant('x', 1220);
    cov.library = [{ uid: 'b-t', title: 'Quaestiones', kind: 'tractatus', subjectType: 'ability', subject: 'dead-language', param: 'Latin', level: 0, quality: 7, language: 'German' }];
    await draw(c, cov);
    await choose(selectWith('Read a tractatus'), 'tractatus');
    await choose(selectWith('Quaestiones'), 'b-t');
    await act(async () => button(/^Log season/).click());
    const covAfter = useStore.getState().covenants[cov.id];
    expect(covAfter.library[0].readBy).toEqual([c.id]);
    const who = structuredClone(me(c.id));
    const covs = [structuredClone(covAfter)];
    expect(unlogSeason(who, who.seasonLog.at(-1)!.uid, covs).ok).toBe(true);
    expect(covs[0].library[0].readBy ?? []).toEqual([]);
  });

  it('does not offer a book in a language the reader cannot read, and says why (DE line 16191; the owner chose blocking)', async () => {
    const c = companion({ clerk: true });
    const cov = newCovenant('x', 1220);
    cov.library = [latinSumma('Latin')];
    await draw(c, cov);
    expect([...el!.querySelectorAll('option')].some((o) => /Ars Grammatica/.test(o.textContent ?? ''))).toBe(false);
    expect(el!.textContent).toMatch(/Not offered: Ars Grammatica \(needs Latin/);
  });
});
