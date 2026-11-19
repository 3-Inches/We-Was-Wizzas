// @vitest-environment jsdom
// Dice › Faith & miracles lists everyone in "Who prays", the holy in a group of their own at the top
// (roadmap Batch B, 5.17): anyone may pray, but the holy are who the page is for.
import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('idb-keyval', () => ({ get: async () => undefined, set: async () => undefined, del: async () => undefined }));
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { addVirtue, newCharacter } from '../../engine/character/factory';
import { gameDataFor } from '../../store/hooks';
import { newSaga, useStore } from '../../store/store';
import DicePage from './DicePage';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
let el: HTMLDivElement | undefined;
afterEach(async () => {
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
