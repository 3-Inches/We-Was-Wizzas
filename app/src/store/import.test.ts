// Importing: a saga brought in again (a backup restored beside the saga it came from) is a whole copy of
// its own, every reference among its records following the new ids; a file cut short still imports.
import { describe, expect, it } from 'vitest';
import { newCharacter } from '../engine/character/factory';
import { newCovenant } from '../engine/covenant';
import { newLab } from '../engine/lab';
import { exportSaga, useStore, type ExportBundle } from './store';

describe('importing', () => {
  it('makes a saga imported twice a copy whose characters, covenant and labs point at one another', () => {
    const st = useStore.getState();
    const saga = st.createSaga('Original');
    const cov = newCovenant(saga.id, 1220);
    const m = newCharacter('magus', saga.id);
    const g = newCharacter('grog', saga.id);
    m.covenantId = g.covenantId = cov.id;
    cov.memberIds = [m.id, g.id];
    const lab = newLab('Lab');
    lab.ownerId = m.id;
    cov.labs = [lab];
    st.putCharacter(m);
    st.putCharacter(g);
    st.putCovenant(cov);
    const file = JSON.parse(JSON.stringify(exportSaga(saga.id))) as ExportBundle;
    const r = useStore.getState().importBundle(file);
    expect(r.sagaId).not.toBe(saga.id);
    const s = useStore.getState();
    const chars = Object.values(s.characters).filter((c) => c.sagaId === r.sagaId);
    const covs = Object.values(s.covenants).filter((c) => c.sagaId === r.sagaId);
    expect(chars).toHaveLength(2);
    expect(covs).toHaveLength(1);
    expect(chars.every((c) => c.id !== m.id && c.id !== g.id && c.covenantId === covs[0].id)).toBe(true);
    expect(covs[0].id).not.toBe(cov.id);
    expect([...covs[0].memberIds].sort()).toEqual(chars.map((c) => c.id).sort());
    expect(chars.some((c) => c.id === covs[0].labs[0].ownerId)).toBe(true);
    // the original is untouched
    expect(useStore.getState().characters[m.id].covenantId).toBe(cov.id);
  });
  it('imports a saga file cut short with an id and what a saga needs', () => {
    const r = useStore.getState().importBundle({ format: 'arm5-toolkit', kind: 'saga', version: 1, saga: { name: 'Half' } as never, characters: [{ name: 'No id', type: 'grog' } as never] } as unknown as ExportBundle);
    const s = useStore.getState();
    expect(r.sagaId).toBeTruthy();
    expect(s.sagas[r.sagaId!].name).toBe('Half');
    expect(s.sagas[r.sagaId!].currentYear).toBe(1220);
    expect(Object.keys(s.sagas)).not.toContain('undefined');
    const c = Object.values(s.characters).find((x) => x.name === 'No id')!;
    expect(c.id).toBeTruthy();
    expect(c.sagaId).toBe(r.sagaId);
  });
});
