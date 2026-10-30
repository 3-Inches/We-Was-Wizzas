// Undo and redo: every change to a saga, character or covenant can be taken back, and quick edits
// to one record are one step.
import { describe, expect, it } from 'vitest';
import { newCharacter } from '../engine/character/factory';
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
