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

describe('a covenant immune to a Flaw', () => {
  const withImmunity = (size: 'Major' | 'Minor', defId: string): Covenant => {
    const cov = newCovenant('s', 1220);
    cov.hooksBoons = [{ uid: 'im', name: 'Immunity', kind: 'boon', size, category: 'Residents', immunity: { kind: 'flaw', value: defId, share: 1 } } as never];
    cov.visSources = [{ uid: 'v', name: 'the spring', art: 'Aq', pawnsPerYear: 6 } as never];
    return cov;
  };
  it('gives one made there Hunger for (Form) Magic of a Form at random, held off whatever the Form, a grog for no points', async () => {
    const { buildGameData } = await import('../data');
    const { newCharacter } = await import('./character/factory');
    const { takeImmunityFlaw, immunityFlawState } = await import('./covenantBoons');
    const data = buildGameData();
    const cov = withImmunity('Major', 'hunger-for-form-magic-flaw');
    const grog = newCharacter('grog', 's');
    grog.virtues.push({ uid: 'f', defId: 'greedy-flaw', size: 'Minor' });
    expect(takeImmunityFlaw(grog, cov, data, () => 0.5)).toMatch(/Hunger for \(Form\) Magic \((An|Aq|Au|Co|He|Ig|Im|Me|Te|Vi)\).*for no points/);
    const h = grog.virtues.find((v) => v.defId === 'hunger-for-form-magic-flaw')!;
    expect(h).toMatchObject({ size: 'Major', heldBy: 'im', free: true, noPoints: true });
    // another seed, another Form: the choice is at random, not the covenant's vis
    const forms = new Set([0.05, 0.25, 0.45, 0.65, 0.85].map((r) => { const g2 = newCharacter('grog', 's'); takeImmunityFlaw(g2, cov, data, () => r); return g2.virtues.find((v) => v.defId === 'hunger-for-form-magic-flaw')!.param; }));
    expect(forms.size).toBeGreaterThan(2);
    const magus = newCharacter('magus', 's');
    magus.virtues.push({ uid: 'x', defId: 'hunger-for-form-magic-flaw', size: 'Major', param: 'Ig' });
    expect(immunityFlawState(cov, magus).unpaired).toHaveLength(1);
    takeImmunityFlaw(magus, cov, data, () => 0.5);
    expect(immunityFlawState(cov, magus).paired).toHaveLength(1);
  });
  it('gives whatever Flaw is chosen, its choice at random (Poor Characteristic)', async () => {
    const { buildGameData } = await import('../data');
    const { newCharacter } = await import('./character/factory');
    const { takeImmunityFlaw } = await import('./covenantBoons');
    const data = buildGameData();
    const cov = withImmunity('Major', 'poor-characteristic-flaw');
    const chars = new Set([0.1, 0.4, 0.7, 0.95].map((r) => { const c = newCharacter('companion', 's'); takeImmunityFlaw(c, cov, data, () => r); return c.virtues.find((v) => v.defId === 'poor-characteristic-flaw')?.param; }));
    expect([...chars].every((x) => ['Int', 'Per', 'Str', 'Sta', 'Pre', 'Com', 'Dex', 'Qik'].includes(x!))).toBe(true);
    expect(chars.size).toBeGreaterThan(1);
  });
  it('lets a Minor Immunity hold off a Minor Flaw', async () => {
    const { buildGameData } = await import('../data');
    const { newCharacter } = await import('./character/factory');
    const { takeImmunityFlaw, hookBoonPoints } = await import('./covenantBoons');
    const data = buildGameData();
    const minorFlaw = data.virtuesFlaws.find((v) => v.kind === 'flaw' && v.sizes.includes('Minor') && !v.param && !v.categories.includes('Hermetic'))!;
    const cov = withImmunity('Minor', minorFlaw.id);
    const c = newCharacter('companion', 's');
    expect(takeImmunityFlaw(c, cov, data, () => 0.5)).toBeTruthy();
    expect(c.virtues.find((v) => v.defId === minorFlaw.id)).toMatchObject({ size: 'Minor', heldBy: 'im' });
    expect(hookBoonPoints(cov.hooksBoons[0], [c])).toMatchObject({ hook: 1, boon: 0 });
  });
  it('makes one away from the aura hunger for a pawn a season', async () => {
    const { newCharacter } = await import('./character/factory');
    const { hungerSeason } = await import('./time');
    const c = newCharacter('companion', 's');
    c.virtues.push({ uid: 'h', defId: 'hunger-for-form-magic-flaw', size: 'Major', param: 'Ig', heldBy: 'im' });
    expect(hungerSeason(c)).toEqual([]);
    c.auraTime = 'away';
    expect(hungerSeason(c)[0]).toMatch(/no pawn/);
    expect(c.hungerLost).toBe(1);
    c.purse = { pounds: 0, vis: [{ art: 'Ig', pawns: 3 }] };
    expect(hungerSeason(c)[0]).toMatch(/ate a pawn.*win back 1/);
    expect(c.hungerLost).toBeUndefined();
    expect(c.purse.vis[0].pawns).toBe(1);
  });
});
