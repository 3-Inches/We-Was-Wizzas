// Undo and redo: every change to a saga, character or covenant can be taken back, and quick edits
// to one record are one step.
import { describe, expect, it } from 'vitest';
import { newCharacter } from '../engine/character/factory';
import { newCovenant } from '../engine/covenant';
import { HISTORY_RECORDS, useStore } from './store';

describe('undo and redo', () => {
  it('takes back changes one step at a time, merging quick edits to one record', () => {
    const st = useStore.getState();
    const saga = st.createSaga('Test');
    const c = newCharacter('grog', saga.id);
    c.name = 'Ulf';
    st.putCharacter(c);
    st.updateCharacter(c.id, (x) => void (x.name = 'Ulfr'));
    st.updateCharacter(c.id, (x) => void (x.name = 'Ulfric'));
    expect(useStore.getState().characters[c.id].name).toBe('Ulfric');
    expect(useStore.getState().undo()).toBe('change to Ulf');
    expect(useStore.getState().characters[c.id].name).toBe('Ulf');
    expect(useStore.getState().undo()).toBe('new character Ulf');
    expect(useStore.getState().characters[c.id]).toBeUndefined();
    expect(useStore.getState().redo()).toBe('new character Ulf');
    expect(useStore.getState().redo()).toBe('change to Ulf');
    expect(useStore.getState().characters[c.id].name).toBe('Ulfric');
    expect(useStore.getState().redo()).toBeUndefined();
  });
  it('restores everything a delete took, and a new change clears what could be redone', () => {
    const st = useStore.getState();
    const saga = st.createSaga('Other');
    const c = newCharacter('magus', saga.id);
    st.putCharacter(c);
    st.deleteSaga(saga.id);
    expect(useStore.getState().sagas[saga.id]).toBeUndefined();
    expect(useStore.getState().characters[c.id]).toBeUndefined();
    useStore.getState().undo();
    expect(useStore.getState().sagas[saga.id]?.name).toBe('Other');
    expect(useStore.getState().characters[c.id]).toBeDefined();
    useStore.getState().updateSaga(saga.id, (s) => void (s.name = 'Renamed'));
    expect(useStore.getState().history.future).toEqual([]);
  });
  it('removes several covenants and their people as one change, and Undo brings them all back', () => {
    const st = useStore.getState();
    const saga = st.createSaga('Tribunal');
    const covs = [newCovenant(saga.id, 1100), newCovenant(saga.id, 1150), newCovenant(saga.id, 1200)];
    const people = covs.map((cov) => {
      const c = newCharacter('magus', saga.id);
      c.covenantId = cov.id;
      cov.memberIds = [c.id];
      return c;
    });
    // a guest staying at the first: not a member, but it lives there
    const guest = newCharacter('magus', saga.id);
    guest.covenantId = covs[0].id;
    useStore.getState().putRecords({ characters: [...people, guest], covenants: covs }, 'the Tribunal');
    useStore.getState().deleteCovenantsWithMembers([covs[0].id, covs[1].id], 'removing two');
    const after = useStore.getState();
    expect(after.covenants[covs[0].id]).toBeUndefined();
    expect(after.covenants[covs[1].id]).toBeUndefined();
    expect(after.covenants[covs[2].id]).toBeDefined();
    expect([people[0].id, people[1].id, guest.id].map((id) => after.characters[id])).toEqual([undefined, undefined, undefined]);
    expect(after.characters[people[2].id]).toBeDefined();
    expect(useStore.getState().undo()).toBe('removing two');
    expect(useStore.getState().covenants[covs[1].id]).toBeDefined();
    expect(useStore.getState().characters[guest.id]).toBeDefined();
  });
  it('keeps only the newest big changes (a season passed with a whole Tribunal), and always the last', () => {
    const st = useStore.getState();
    const saga = st.createSaga('Big');
    const people = Array.from({ length: 400 }, () => newCharacter('grog', saga.id));
    for (let i = 0; i < 6; i++) useStore.getState().putRecords({ characters: people.map((c) => ({ ...c, name: `Grog ${i}` })), covenants: [] }, `bulk ${i}`);
    const { past } = useStore.getState().history;
    const held = past.reduce((t, s) => t + Object.values(s.before).reduce((n, r) => n + Object.keys(r).length, 0), 0);
    expect(held).toBeLessThanOrEqual(HISTORY_RECORDS);
    expect(past[past.length - 1].label).toMatch(/bulk 5/);
    expect(useStore.getState().undo()).toMatch(/bulk 5/);
    expect(useStore.getState().characters[people[0].id].name).toBe('Grog 4');
  });
});
