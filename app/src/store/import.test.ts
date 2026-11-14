// Importing: a saga brought in again (a backup restored beside the saga it came from) is a whole copy of
// its own, every reference among its records following the new ids; a file cut short still imports.
import { describe, expect, it } from 'vitest';
import { newCharacter } from '../engine/character/factory';
import { newCovenant } from '../engine/covenant';
import { newLab } from '../engine/lab';
import { bundleToShareLink, CHAT_LINK_LIMIT, shareLinkToBundle } from '../util/files';
import { exportCharacter, exportSaga, exportSagaRules, useStore, type ExportBundle } from './store';

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

  // -------------------------------------------------- a troupe: the storyguide's saga, a player's own browser
  const wire = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

  it("a saga's rules for players carry its settings and nothing of its play", () => {
    const st = useStore.getState();
    const saga = st.createSaga('The Rhine Saga');
    st.updateSaga(saga.id, (s) => {
      s.enabledBooks = ['DE', 'RoP_D'];
      s.options = { mysteries: false };
      s.journal = [{ id: 'j', date: '1220', title: 'Secret', text: 'The villain is the abbot.' } as never];
      s.playerOrder = ['Ana'];
      s.calendar = [{ id: 'e', name: 'Ambush' } as never];
    });
    const npc = newCharacter('magus', saga.id);
    npc.name = 'The Villain';
    st.putCharacter(npc);
    const b = wire(exportSagaRules(saga.id));
    expect(b.rulesOnly).toBe(true);
    expect(b.characters ?? []).toHaveLength(0);
    expect(b.covenants ?? []).toHaveLength(0);
    expect(b.saga!.enabledBooks).toEqual(['DE', 'RoP_D']);
    expect(b.saga!.options).toEqual({ mysteries: false });
    expect(JSON.stringify(b)).not.toMatch(/Villain|abbot|Ambush|Ana/);
    // short enough to send as a link, and it reads back whole
    (globalThis as { window?: unknown }).window ??= { location: { href: 'https://example.test/app/#/saga/x' } };
    const link = bundleToShareLink(b);
    expect(link.startsWith('https://example.test/app/#/import?d=')).toBe(true);
    expect(link.length).toBeLessThan(CHAT_LINK_LIMIT);
    expect(shareLinkToBundle(link.split('?d=')[1])?.saga?.name).toBe('The Rhine Saga');
  });

  it("a player's copy of the saga takes the storyguide's rules sent again, and keeps the player's characters", () => {
    const st = useStore.getState();
    const saga = st.createSaga('Shared');
    const rules = wire(exportSagaRules(saga.id));
    // the player's browser: the same saga (same id), with their character in it
    const mine = newCharacter('companion', saga.id);
    mine.name = 'Player Character';
    st.putCharacter(mine);
    rules.saga!.enabledBooks = ['DE'];
    rules.saga!.houseRules = { ...rules.saga!.houseRules, maxFlawPoints: 12 } as never;
    const before = Object.keys(useStore.getState().sagas).length;
    const r = useStore.getState().importBundle(rules);
    const s = useStore.getState();
    expect(r.rulesUpdated).toBe(true);
    expect(r.sagaId).toBe(saga.id);
    expect(Object.keys(s.sagas)).toHaveLength(before);
    expect(s.sagas[saga.id].enabledBooks).toEqual(['DE']);
    expect(s.characters[mine.id].sagaId).toBe(saga.id);
  });

  it("a player's character arrives without the covenant of the player's own saga, and can join the storyguide's", () => {
    const st = useStore.getState();
    // the player's saga, with a practice covenant
    const theirs = st.createSaga('Player side');
    const practice = newCovenant(theirs.id, 1220);
    const pc = newCharacter('magus', theirs.id);
    pc.name = 'Lucia';
    pc.covenantId = practice.id;
    practice.memberIds = [pc.id];
    st.putCharacter(pc);
    st.putCovenant(practice);
    const file = wire(exportCharacter(pc.id));
    // the storyguide's saga
    const sg = st.createSaga('Storyguide side');
    const home = newCovenant(sg.id, 1220);
    st.putCovenant(home);
    const r = useStore.getState().importBundle(file, { intoSagaId: sg.id, covenantId: home.id });
    const s = useStore.getState();
    expect(r.replaced).toBe(0);
    const got = s.characters[r.characterIds[0]];
    expect(got.id).not.toBe(pc.id); // the player's own copy is another record here
    expect(got.sagaId).toBe(sg.id);
    expect(got.covenantId).toBe(home.id);
    expect(s.covenants[home.id].memberIds).toContain(got.id);
    expect(s.covenants[practice.id].memberIds).toEqual([pc.id]);
    // with no covenant chosen, it has none rather than one that is not there
    const r2 = useStore.getState().importBundle(file, { intoSagaId: sg.id, copy: true });
    expect(useStore.getState().characters[r2.characterIds[0]].covenantId).toBeUndefined();
  });

  it('a character sent again replaces the earlier one and keeps its place in the covenant; as a copy, both stay', () => {
    const st = useStore.getState();
    const sg = st.createSaga('Second round');
    const home = newCovenant(sg.id, 1220);
    st.putCovenant(home);
    const sent = newCharacter('companion', 'elsewhere');
    sent.name = 'Draft';
    const first = useStore.getState().importBundle({ format: 'arm5-toolkit', kind: 'character', version: 1, exportedAt: '', characters: [wire(sent)] }, { intoSagaId: sg.id, covenantId: home.id });
    expect(first.characterIds).toEqual([sent.id]);
    sent.name = 'Finished';
    const again = useStore.getState().importBundle({ format: 'arm5-toolkit', kind: 'character', version: 1, exportedAt: '', characters: [wire(sent)] }, { intoSagaId: sg.id });
    let s = useStore.getState();
    expect(again.replaced).toBe(1);
    expect(s.characters[sent.id].name).toBe('Finished');
    expect(s.characters[sent.id].covenantId).toBe(home.id);
    expect(s.covenants[home.id].memberIds.filter((m) => m === sent.id)).toHaveLength(1);
    const beside = useStore.getState().importBundle({ format: 'arm5-toolkit', kind: 'character', version: 1, exportedAt: '', characters: [wire({ ...sent, name: 'Twin' })] }, { intoSagaId: sg.id, copy: true });
    s = useStore.getState();
    expect(beside.replaced).toBe(0);
    expect(beside.characterIds[0]).not.toBe(sent.id);
    expect(s.characters[sent.id].name).toBe('Finished');
    expect(s.characters[beside.characterIds[0]].name).toBe('Twin');
  });
});

