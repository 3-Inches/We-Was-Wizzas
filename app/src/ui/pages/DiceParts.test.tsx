// @vitest-environment jsdom
// Parts of Dice moved or regrouped in Batch B. Faith & miracles lists everyone in "Who prays", the holy
// in a group of their own at the top (5.17). Great projects rolls a covenant's building and menagerie at
// the Game Table, and writes what a stress check costs on the covenant (5.8; owner point 1).
import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('idb-keyval', () => ({ get: async () => undefined, set: async () => undefined, del: async () => undefined }));
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { addVirtue, ensureAbility, newCharacter } from '../../engine/character/factory';
import { newCovenant } from '../../engine/covenant';
import { gameDataFor } from '../../store/hooks';
import { newSaga, useStore } from '../../store/store';
import DicePage from './DicePage';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
let el: HTMLDivElement | undefined;
afterEach(async () => {
  vi.restoreAllMocks();
  if (root) await act(async () => root!.unmount());
  el?.remove();
});

describe('who prays, on the Faith page', () => {
  it('puts the holy first, in a group of their own, and opens on one of them', async () => {
    const saga = newSaga('Test');
    const data = gameDataFor(saga);
    const person = (name: string, npc = false) => {
      const c = newCharacter('companion', saga.id);
      c.name = name;
      c.npc = npc;
      c.creation.finalized = true;
      return c;
    };
    const anna = person('Anna');
    const brother = person('Brother Odo', true);
    addVirtue(brother, data, 'true-faith');
    const cora = person('Cora');
    localStorage.clear();
    useStore.setState({ activeSagaId: saga.id, sagas: { [saga.id]: saga }, characters: Object.fromEntries([anna, brother, cora].map((c) => [c.id, c])), covenants: {} });
    el = document.createElement('div');
    document.body.appendChild(el);
    root = createRoot(el);
    await act(async () => root!.render(<MemoryRouter initialEntries={['/?sub=holy']}><DicePage /></MemoryRouter>));
    const sel = [...el.querySelectorAll('select')].find((s) => [...s.options].some((o) => o.textContent === 'Brother Odo'))!;
    const groups = [...sel.querySelectorAll('optgroup')].map((g) => [g.label, [...g.querySelectorAll('option')].map((o) => o.textContent)]);
    expect(groups).toEqual([
      ['The holy', ['Brother Odo']],
      ['The players’ characters', ['Anna', 'Cora']],
    ]);
    expect(sel.value).toBe(brother.id);
  });
});

describe('a great building’s stress check, at Game Table › Dice › Great projects', () => {
  it('is rolled with the covenant’s mason, and a damage level lost is written on the covenant', async () => {
    const saga = newSaga('Test');
    const mason = newCharacter('grog', saga.id);
    mason.name = 'Hugo';
    mason.creation.finalized = true;
    ensureAbility(mason, 'craft-type', { laterLife: 75 }, 'Mason'); // Craft: Mason 5
    const cov = newCovenant(saga.id, 1220);
    cov.name = 'Fengheld';
    cov.memberIds = [mason.id];
    mason.covenantId = cov.id;
    cov.buildings = [{ uid: 'b1', name: 'The great tower', height: 100, weakest: 'standard', latest: 'standard', damage: 0 }];
    localStorage.clear();
    useStore.setState({ activeSagaId: saga.id, sagas: { [saga.id]: saga }, characters: { [mason.id]: mason }, covenants: { [cov.id]: cov } });
    el = document.createElement('div');
    document.body.appendChild(el);
    root = createRoot(el);
    await act(async () => root!.render(<MemoryRouter initialEntries={['/?sub=projects']}><DicePage /></MemoryRouter>));
    expect(el.textContent).toMatch(/Master mason: Hugo, Craft: Mason 5/);
    // a botched stress die: the building is damaged
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const roll = [...el.querySelectorAll('button')].find((b) => /Roll the stress check/.test(b.textContent ?? ''))!;
    await act(async () => roll.click());
    const after = useStore.getState().covenants[cov.id];
    expect(after.buildings![0].damage).toBeGreaterThan(0);
    expect(after.log.at(-1)?.text).toMatch(/The great tower: .*damage level/);
    expect(el.textContent).toMatch(/Recorded on Fengheld/);
  });

  it('opens on the covenant its Overview links from', async () => {
    const saga = newSaga('Test');
    const a = newCovenant(saga.id, 1220);
    a.name = 'Fengheld';
    a.buildings = [{ uid: 'b1', name: 'The great tower', height: 100, weakest: 'standard', latest: 'standard', damage: 0 }];
    const b = newCovenant(saga.id, 1220);
    b.name = 'Valnastium';
    b.buildings = [{ uid: 'b2', name: 'The bridge', height: 40, weakest: 'standard', latest: 'standard', damage: 0 }];
    localStorage.clear();
    useStore.setState({ activeSagaId: saga.id, sagas: { [saga.id]: saga }, characters: {}, covenants: { [a.id]: a, [b.id]: b } });
    el = document.createElement('div');
    document.body.appendChild(el);
    root = createRoot(el);
    await act(async () => root!.render(<MemoryRouter initialEntries={[`/?sub=projects&cov=${b.id}`]}><DicePage /></MemoryRouter>));
    expect(el.textContent).toMatch(/Valnastium’s record/);
    expect((el.querySelector('main select, select') as HTMLSelectElement).value).toBe(b.id);
  });
});
