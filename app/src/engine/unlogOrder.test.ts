// What the adversarial review of Batch A found in Unlog: a season put back under a later one's work, a
// cost given back in the wrong season, an Ability or record the player had taken away, a Resolve line
// left from an old save. Each is a case where the season just logged unlogs cleanly, so the checks
// that log and unlog one season (unlogEverySeason.test.ts) could not see it.
import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { newSaga } from '../store/store';
import { ensureAbility, newCharacter } from './character/factory';
import { deriveCharacter } from './character/derive';
import { characterContext } from './context';
import { newCovenant } from './covenant';
import { seeded } from './generate/random';
import { applySeason, newSeasonEntry } from './longterm';
import { runStanding } from './time';
import type { Character, Season, SeasonLogEntry, SeasonUndo } from './types';
import { canUnlog, unlogSeason } from './unlog';

const data = buildGameData();

function person(): Character {
  const c = newCharacter('companion', 's');
  c.name = 'Ada';
  c.creation.finalized = true;
  return c;
}
function logged(c: Character, season: Season, undo: SeasonUndo, gains: Record<string, number> = {}, year = 1220): SeasonLogEntry {
  const e = newSeasonEntry(year, season, 'other', `Work in ${season}`, gains);
  e.undo = undo;
  applySeason(c, e, 1);
  c.seasonLog.push(e);
  return e;
}

describe('an older season under a later one’s work on the same record', () => {
  it('is unlogged after the later one, and Unlog says which', () => {
    const c = person();
    c.learned = { inventing: { progress: 20 } } as unknown as Character['learned'];
    const spring = logged(c, 'Spring', { records: [{ field: 'learned', key: 'inventing', was: { progress: 0 } }] });
    const summer = logged(c, 'Summer', { records: [{ field: 'learned', key: 'inventing', was: { progress: 10 } }] });
    expect(canUnlog(spring, c)).toMatchObject({ ok: false, why: expect.stringMatching(/Summer 1220 .* unlog that one first/) });
    expect(unlogSeason(c, spring.uid).ok).toBe(false);
    expect(canUnlog(summer, c).ok).toBe(true);
    expect(unlogSeason(c, summer.uid).ok).toBe(true);
    expect((c.learned as unknown as { inventing: { progress: number } }).inventing.progress).toBe(10);
    expect(unlogSeason(c, spring.uid).ok).toBe(true);
    expect((c.learned as unknown as { inventing: { progress: number } }).inventing.progress).toBe(0);
  });

  it('another mason’s later season on the same building counts too', () => {
    const a = person();
    const b = person();
    b.name = 'Bo';
    const building = { covenantId: 'cov', uid: 'tower' };
    const spring = logged(a, 'Spring', { building });
    logged(b, 'Summer', { building: { ...building, before: { uid: 'tower' } as never } });
    expect(canUnlog(spring, a, [a, b]).why).toMatch(/Bo’s Summer 1220/);
  });
});

describe('what Unlog gives back, and when', () => {
  it('a Merkavah season’s Fatigue only while that season lasts (each season’s end gives it back)', () => {
    const c = person();
    const e = logged(c, 'Spring', { fatigue: 1 });
    c.longTermFatigueLost = 1; // lost again in Summer, by something else
    unlogSeason(c, e.uid, [], { now: { year: 1220, season: 'Summer' } });
    expect(c.longTermFatigueLost).toBe(1);
    const d = person();
    const f = logged(d, 'Spring', { fatigue: 1 });
    d.longTermFatigueLost = 1;
    unlogSeason(d, f.uid, [], { now: { year: 1220, season: 'Spring' } });
    expect(d.longTermFatigueLost).toBe(0);
  });

  it('an Ability the character had before the season stays, though it is left with no experience', () => {
    const c = person();
    const lore = ensureAbility(c, 'area-lore', {}, 'Paris');
    const e = logged(c, 'Spring', {}, { [`ability:${lore.uid}`]: 2 });
    unlogSeason(c, e.uid);
    expect(c.abilities.some((a) => a.uid === lore.uid && a.param === 'Paris')).toBe(true);
  });

  it('a research record the player set up stays when its Discovery is unlogged', () => {
    const c = person();
    c.research = { goal: '', kind: 'major', target: 30, discoveries: [{ uid: 'd1', name: 'A', magnitude: 1, year: 1220, season: 'Spring' }] } as unknown as Character['research'];
    const e = logged(c, 'Spring', { discoveryUid: 'd1' });
    unlogSeason(c, e.uid);
    expect(c.research).toMatchObject({ kind: 'major', target: 30, discoveries: [] });
  });

  it('a covenant teacher keeps the lessons given since: a season fewer, not as before', () => {
    const s = newSaga('T');
    const cov = newCovenant(s.id, 1220);
    cov.specialists.push({ uid: 'sp', name: 'Magister', role: 'teacher', teaching: 3, abilities: [{ id: 'area-lore', label: 'Area Lore', score: 5 }] } as never);
    const pupils = ['A', 'B'].map((n) => {
      const c = person();
      c.name = n;
      c.covenantId = cov.id;
      cov.memberIds.push(c.id);
      const a = ensureAbility(c, 'area-lore', { childhood: 5 });
      c.standing = { kind: 'taught', teacher: 'spec:sp', target: `ability:${a.uid}` };
      return c;
    });
    for (const [c, season] of [[pupils[0], 'Spring'], [pupils[1], 'Summer']] as const) {
      const d = deriveCharacter(c, data, s.houseRules);
      runStanding(c, d, characterContext(c, [cov], data), cov, data, 1220, season, seeded(1), pupils);
    }
    expect(cov.specialists[0].taught?.seasons).toBe(2);
    expect(unlogSeason(pupils[0], pupils[0].seasonLog[0].uid, [cov]).ok).toBe(true);
    expect(cov.specialists[0].taught).toMatchObject({ year: 1220, seasons: 1 });
  });

  it('a save from before the roll’s Resolve line was kept on its season: Unlog takes the line too', () => {
    const c = person();
    const e = logged(c, 'Spring', {});
    c.folkWitch = { curse: { name: 'Disease', ease: 9, score: 6, auraBotch: 0, penetration: 2, year: 1220, season: 'Spring', entryUid: e.uid } };
    c.owed = [{ uid: 'o1', year: 1220, season: 'Spring', kind: 'curse', text: 'roll it' }];
    unlogSeason(c, e.uid);
    expect(c.owed ?? []).toEqual([]);
    expect(c.folkWitch?.curse).toBeUndefined();
  });
});
