// Craftsmen met at random, lucky or not: the Virtues and Flaws that matter at the work, the score they
// work at (which sets their savings and their Build Points), and hiring as the saga goes on.
import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { addVirtue, newCharacter } from './character/factory';
import { computeFinances, memberCraft, newCovenant } from './covenant';
import { CRAFT_BY_ID, specialistCost } from './covenantRules';
import { covenfolkYearEnd, laborPointsPerSeason } from './covenfolk';
import { CRAFT_TRAITS, characterCraftTraits, rollCraftTraits, specialistCraftTraits, traitApplies, workingCraft } from './craftTraits';
import { findCraftsmen, hireCraftsman, letGo, livingHiringYearEnd, overcomeTrait, retireChance } from './hiring';
import { seeded } from './generate/random';
import type { Specialist } from './types';

const data = buildGameData();
const smith = (traits?: string[], score = 6): Specialist => ({
  uid: 'sm', name: 'Hans', role: 'craftsman', ability: 'Craft (Blacksmith)', craft: 'blacksmith', score, count: 1, rare: false, age: 40,
  abilities: [{ id: 'craft-type', param: 'Blacksmith', score }], chars: { Dex: 1 }, traits,
});

describe('craft Virtues and Flaws', () => {
  it('finds what helps and hurts a character at their craft, Puissant only in a Craft', () => {
    const c = newCharacter('grog', 's');
    c.abilities.push({ uid: 'bs', abilityId: 'craft-type', param: 'Goldsmith', xp: { laterLife: 75 } });
    addVirtue(c, data, 'palsied-hands-flaw', 'Minor');
    addVirtue(c, data, 'keen-vision', 'Minor');
    addVirtue(c, data, 'puissant-ability', 'Minor', 'stealth');
    const t = characterCraftTraits(c, data, 'Goldsmith');
    expect(t.map((x) => x.id).sort()).toEqual(['keen-vision', 'palsied-hands-flaw']);
    // fine work by eye is a goldsmith's, not a thatcher's
    expect(characterCraftTraits(c, data, 'Thatcher').map((x) => x.id)).toEqual(['palsied-hands-flaw']);
    expect(t.find((x) => x.id === 'palsied-hands-flaw')!.work).toBe(-2);
    // Craft 5 (75 xp), worked at 3 with shaking hands
    expect(memberCraft(c)!.score).toBe(3);
    addVirtue(c, data, 'puissant-ability', 'Minor', 'craft-type');
    expect(characterCraftTraits(c, data, 'Goldsmith').find((x) => x.id === 'puissant-ability')!.name).toBe('Puissant Craft');
    expect(memberCraft(c)!.score).toBe(5);
  });

  it('prices and pays a covenant craftsman by the score they work at', () => {
    expect(specialistCost(smith())).toBe(6);
    const palsied = smith(['palsied-hands-flaw']);
    expect(workingCraft(palsied)).toBe(4);
    // the covenant pays for the craftsman it gets: 4 Build Points, not 6
    expect(specialistCost(palsied)).toBe(4);
    expect(specialistCost(smith(['puissant-ability']))).toBe(8);
    // and they earn and save by it: (Dex + 4) × 3 Labor Points a season, 1 + 4/2 pounds a year
    expect(laborPointsPerSeason(palsied)).toBe(15);
    const cov = newCovenant('s', 1220);
    cov.covenfolk = { ...cov.covenfolk, grogs: 60 };
    cov.specialists = [palsied];
    expect(computeFinances(cov, [], [], 5).crafts.find((x) => x.craft.id === 'blacksmith')!.potential).toBe(3);
    expect(specialistCraftTraits(smith(['puissant-ability']), data, 'Blacksmith')[0].name).toBe('Puissant Blacksmith');
  });

  it('meets people at random: about a third with something that matters, never Free Expression for a brewer', () => {
    const rng = seeded(4);
    let some = 0;
    for (let i = 0; i < 3000; i++) {
      const t = rollCraftTraits(rng, 'Brewer');
      if (t.length) some++;
      expect(t.filter((id) => CRAFT_TRAITS.find((x) => x.id === id)!.good).length).toBeLessThanOrEqual(1);
      expect(t).not.toContain('free-expression');
      expect(t).not.toContain('keen-vision');
    }
    expect(some / 3000).toBeGreaterThan(0.2);
    expect(some / 3000).toBeLessThan(0.45);
    expect(traitApplies(CRAFT_TRAITS.find((x) => x.id === 'free-expression')!, 'Painter')).toBe(true);
  });

  it('learns faster with Affinity with their Craft', () => {
    const a = newCovenant('s', 1220);
    const b = newCovenant('s', 1220);
    a.specialists = [smith(['affinity-with-ability'])];
    b.specialists = [smith()];
    covenfolkYearEnd(a, 1220);
    covenfolkYearEnd(b, 1220);
    const xp = (c: typeof a) => c.specialists[0].abilities![0].xp ?? 0;
    expect(xp(a)).toBeGreaterThan(xp(b));
  });
});

describe('hiring in play', () => {
  it('finds a few craftsmen of a craft, hires one recruited in play, and lets one go', () => {
    const cov = newCovenant('s', 1220);
    cov.name = 'Testhold';
    const found = findCraftsmen(cov, 'carpenter', seeded(2), { tribunal: 'Rhine' });
    expect(found).toHaveLength(3);
    for (const s of found) expect(s).toMatchObject({ role: 'craftsman', craft: 'carpenter', free: true });
    expect(new Set(found.map((s) => s.name)).size).toBe(3);
    expect(hireCraftsman(cov, found[1], 1221, 'Spring')).toMatch(/comes to Testhold as its carpenter/);
    expect(specialistCost(cov.specialists[0])).toBe(0);
    expect(cov.specialists[0].history?.[0].text).toMatch(/hired in play/);
    cov.specialists.push({ ...smith(), uid: 'g', name: 'Brewer', craft: 'brewer', count: 3 });
    letGo(cov, 'g');
    expect(cov.specialists.find((s) => s.uid === 'g')!.count).toBe(2);
    letGo(cov, cov.specialists[0].uid);
    expect(cov.specialists).toHaveLength(1);
  });

  it('a Flaw got over in play no longer counts', () => {
    const s = smith(['arthritis-flaw']);
    overcomeTrait(s, 'arthritis-flaw', 1221, 'Summer', 'Healed of their arthritis by a Creo Corpus ritual');
    expect(s.traits).toBeUndefined();
    expect(workingCraft(s)).toBe(6);
  });

  it('the Tribunal’s covenants: old craftsmen retire, and new ones are taken on where they save money', () => {
    expect(retireChance(50)).toBe(0);
    expect(retireChance(70)).toBeGreaterThan(retireChance(62));
    const cov = newCovenant('s', 1220);
    cov.living = { key: 'x', attitude: 'neutral' } as never;
    cov.covenfolk = { ...cov.covenfolk, grogs: 40, servants: 20 };
    cov.finances.treasury = 100;
    cov.specialists = [{ ...smith(), age: 80 }];
    const lines = livingHiringYearEnd(cov, [], [], () => 0, true, 1225, 'Rhine');
    expect(lines[0]).toMatch(/Hans stops working at 80/);
    expect(cov.specialists.some((s) => s.uid === 'sm')).toBe(false);
    expect(lines.some((l) => /^Takes on/.test(l))).toBe(true);
    expect(cov.specialists.length).toBeGreaterThan(0);
    for (const s of cov.specialists) expect(CRAFT_BY_ID.has(s.craft!)).toBe(true);
    // with no money in hand, nobody new
    const poor = newCovenant('s', 1220);
    poor.covenfolk = { ...poor.covenfolk, grogs: 40 };
    expect(livingHiringYearEnd(poor, [], [], seeded(1), false, 1225)).toEqual([]);
  });
});
