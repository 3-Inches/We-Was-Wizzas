// The covenant's people over the years: inhuman covenfolk of more than one kind (the Inhuman
// Residents Boon taken again, as at Calebais), what they are spared, that they learn less their Might, and
// the human covenfolk warped by a strong aura.
import { describe, expect, it } from 'vitest';
import { newCovenant } from './covenant';
import { covenfolkYearEnd } from './covenfolk';
import { inhumanCovenfolk, inhumanGroups, inhumanUpkeep } from './covenantBoons';
import { covenfolkWarpingYearEnd } from './time';
import type { Covenant, CovenantHookBoon, Specialist } from './types';

const boon = (uid: string, nature: 'faerie' | 'spirit' | 'magic' | 'animal', share?: number): CovenantHookBoon =>
  ({ uid, name: 'Inhuman Residents', kind: 'boon', size: 'Minor', category: 'Residents', ...(share !== undefined ? { inhuman: { nature, share } } : { inhuman: { nature, share: undefined as never } }) }) as never;

describe('inhuman covenfolk', () => {
  it('takes the Boon more than once as kinds side by side, never more than all of them', () => {
    const cov = newCovenant('s', 1220);
    cov.hooksBoons = [boon('a', 'faerie', 0.6), boon('b', 'spirit', 0.3), boon('c', 'magic', 0.3)];
    const g = inhumanGroups(cov);
    expect(g.map((x) => [x.nature, Math.round(x.share * 100)])).toEqual([['faerie', 60], ['spirit', 30], ['magic', 10]]);
    expect(Math.round(inhumanCovenfolk(cov)!.share * 100)).toBe(100);
    // faeries eat nothing; spirits and beings of Magic need no food and no shelter
    const u = inhumanUpkeep(cov);
    expect(Math.round(u.noFood * 100)).toBe(100);
    expect(Math.round(u.noShelter * 100)).toBe(40);
  });

  it('a second Boon without a share set brings a fifth more, not another majority', () => {
    const cov = newCovenant('s', 1220);
    cov.hooksBoons = [boon('a', 'faerie'), boon('b', 'animal')];
    expect(inhumanGroups(cov).map((x) => Math.round(x.share * 100))).toEqual([60, 20]);
  });

  it('learn as people with little or no Might, take a strong Might off each season, and do not age', () => {
    const hob = (might?: number): Specialist => ({ uid: 'x', name: 'Hob', role: 'craftsman', ability: 'Craft (Smith)', craft: 'blacksmith', score: 5, count: 1, rare: false, age: 40, abilities: [{ id: 'craft-type', param: 'Blacksmith', score: 5 }], nature: 'magic', ...(might !== undefined ? { might } : {}) }) as Specialist;
    const human = { ...hob(), nature: undefined } as Specialist;
    const weak = hob(0);
    const middling = hob(1);
    const strong = hob(5);
    const cov = newCovenant('s', 1220);
    cov.specialists = [human, weak, middling, strong];
    covenfolkYearEnd(cov, 1220);
    const xp = (s: Specialist) => s.abilities![0].score * 100 + (s.abilities![0].xp ?? 0);
    expect(xp(weak)).toBe(xp(human));
    expect(xp(middling)).toBeLessThan(xp(weak));
    expect(xp(middling)).toBeGreaterThan(500);
    expect(xp(strong)).toBe(500);
    expect(weak.age).toBe(40);
    expect(human.age).toBe(41);
  });
  it('take their kind’s Might from the Boon when they have none of their own', () => {
    const cov = newCovenant('s', 1220);
    cov.hooksBoons = [{ ...boon('a', 'magic', 0.6), inhuman: { nature: 'magic', share: 0.6, might: 6 } } as never];
    const s = { uid: 'x', name: 'Hob', role: 'craftsman', ability: 'Craft (Smith)', craft: 'blacksmith', score: 5, count: 1, rare: false, age: 40, abilities: [{ id: 'craft-type', param: 'Blacksmith', score: 5 }], nature: 'magic' } as Specialist;
    cov.specialists = [s];
    covenfolkYearEnd(cov, 1220);
    expect(s.abilities![0].xp ?? 0).toBe(0);
  });
});

describe('covenfolk in a strong aura', () => {
  const strong = (strength: number): Covenant => {
    const cov = newCovenant('s', 1220);
    cov.aura = strength;
    cov.specialists = [{ uid: 'h', name: 'Hans', role: 'steward', ability: 'Profession: Steward', score: 4, count: 1, rare: false, age: 30 } as Specialist];
    return cov;
  };
  it('warps the people who live there, a point a year in an aura of 6', () => {
    const cov = strong(6);
    const lines: string[] = [];
    for (let y = 1220; y < 1225; y++) lines.push(...covenfolkWarpingYearEnd(cov, y));
    expect(cov.specialists[0].warpingPoints).toBe(5);
    expect(cov.folkWarping).toBe(5);
    // Warping Score 1 after five years: a Minor Flaw for the steward, and for the covenfolk at large
    expect(lines.some((l) => /Hans: Warping Score 1/.test(l))).toBe(true);
    expect(lines.some((l) => /covenfolk who have lived here all along reach a Warping Score of 1/.test(l))).toBe(true);
  });
  it('leaves them be in an aura of 5, and spares the inhuman', () => {
    const weak = strong(5);
    expect(covenfolkWarpingYearEnd(weak, 1220)).toEqual([]);
    expect(weak.folkWarping).toBeUndefined();
    const cov = strong(8);
    cov.specialists[0].nature = 'spirit';
    covenfolkWarpingYearEnd(cov, 1220);
    expect(cov.specialists[0].warpingPoints).toBeUndefined();
    expect(cov.folkWarping).toBe(2);
  });
});
