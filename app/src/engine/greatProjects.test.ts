// Hermetic Projects: a great building's progress and stress check, ships' damage levels, and a
// menagerie's breeding, birthing and young.
import { describe, expect, it } from 'vitest';
import {
  birthingIntervalHours, breedingForBest, breedingModifiers, breedingRoll, buildSeason, buildingCheckModifiers, buildingDamageLevels, buildingStressCheck, buildingWorkQuality, juvenileMight, masonProgress, repairSeason, seasonsToHeight, SHIP_SIZES, structureCheckModifiers,
} from './greatProjects';
import type { GreatBuilding } from './types';
import { itemDamageLevels } from './workshop';
import type { StressResult } from './dice';

const seq = (...xs: number[]) => () => (xs.shift() ?? 0) / 10 + 0.01;
const stress = (value: number, zero = false, botches = 0): StressResult => ({ kind: 'stress', faces: [value], value, multiplier: 1, zero, botchDice: zero ? 1 : 0, botchFaces: [], botches, exploded: false });

describe('the Great Tower', () => {
  it('a level of 20 feet a season at Craft: Mason 5, two at 10, three at 15; craft magic held to the score', () => {
    expect(masonProgress(5)).toEqual({ effective: 5, levelsPerSeason: 1, feetPerSeason: 20, feetPerYear: 80 });
    expect(masonProgress(5, 10).levelsPerSeason).toBe(2);
    expect([masonProgress(10).feetPerYear, masonProgress(15).feetPerYear]).toEqual([160, 240]);
    // 560 feet between Tribunals at Craft 5: seven years
    expect(seasonsToHeight(560, 20)).toBe(28);
  });
  it('damage levels: standard work at Size 10 or more has 8, excellent 16; the stress check adds Craft: Mason', () => {
    expect([itemDamageLevels('shoddy', 10), itemDamageLevels('standard', 10), itemDamageLevels('excellent', 10)]).toEqual([4, 8, 16]);
    expect(structureCheckModifiers(5, 3, true)).toBe(7);
  });
  it('the book’s ships: a grain barge (Size +8) of standard quality has 6 damage levels', () => {
    const barge = SHIP_SIZES.find((s) => s.id === 'ship-grain-barge')!;
    expect(itemDamageLevels('standard', barge.size)).toBe(6);
    expect(SHIP_SIZES).toHaveLength(8);
  });
});

describe('a great building on the covenant, season by season', () => {
  const tower: GreatBuilding = { uid: 't', name: 'The tower', height: 40, weakest: 'standard', latest: 'standard', damage: 0 };
  it('a mason of Craft 5 raises it 20 feet a season: four seasons make the book’s 80 feet a year', () => {
    let b = tower;
    for (let i = 0; i < 4; i++) b = buildSeason(b, 5, 'standard').building!;
    expect(b.height).toBe(120);
    // three enchanted tools bring Craft 5 only to 8: still one level; at Craft 10 with them, held to 10 more
    expect(buildSeason({ ...tower, tools: 3 }, 5, 'standard').building!.height).toBe(60);
    expect(buildSeason({ ...tower, tools: 5 }, 5, 'standard').building!.height).toBe(80);
  });
  it('below an effective Craft: Mason of 5 it does not rise, and nothing changes', () => {
    expect(buildSeason(tower, 4, 'standard').building).toBeUndefined();
  });
  it('the Workshop Total against the Craft Levels: shoddy 3, standard 6, superior 12, excellent 15', () => {
    expect([2, 3, 6, 11, 12, 15].map((t) => buildingWorkQuality(t, 5))).toEqual(['shoddy', 'shoddy', 'standard', 'standard', 'superior', 'excellent']);
  });
  it('damage levels follow the poorest work in it (4, 8, 12, 16); the stress check follows the latest', () => {
    expect((['shoddy', 'standard', 'superior', 'excellent'] as const).map((q) => buildingDamageLevels({ weakest: q }))).toEqual([4, 8, 12, 16]);
    const b = buildSeason(tower, 5, 'shoddy').building!;
    expect([b.weakest, buildingDamageLevels(b)]).toEqual(['shoddy', 4]);
    const c = buildSeason(b, 5, 'excellent').building!;
    expect([c.weakest, c.latest]).toEqual(['shoddy', 'excellent']);
    // Craft: Mason 5, excellent latest work +3, repaired before −1
    expect(buildingCheckModifiers({ ...c, repaired: true }, 5)).toBe(7);
  });
  it('a season of repairs mends one damage level; with none lost, shoddy work comes up to standard; both count as repaired', () => {
    const r = repairSeason({ ...tower, damage: 2 }).building!;
    expect([r.damage, r.repaired]).toEqual([1, true]);
    const s = repairSeason({ ...tower, weakest: 'shoddy', latest: 'shoddy' }).building!;
    expect([s.weakest, buildingDamageLevels(s), s.repaired]).toEqual(['standard', 8, true]);
    expect(repairSeason(tower).building).toBeUndefined();
  });
  it('the stress check against 15 records a lost damage level', () => {
    // die 3 + Craft 5 = 8 against 15: one level lost
    expect(buildingStressCheck(tower, 5, 0, seq(3)).building.damage).toBe(1);
    // die 1 doubles: 1, then 10 → 20 + 5 = 25: intact
    expect(buildingStressCheck(tower, 5, 0, seq(1, 9)).lost).toBe(0);
  });
});

describe('the menagerie', () => {
  it('breeding modifiers: a tamed herbivore, well fed, with a handler of Animal Handling 6: +7; a magical beast of Might 15: −3', () => {
    const m = breedingModifiers({ tamed: true, herbivore: true, adequateDiet: true, animalHandling: 6 });
    expect(m.reduce((s, x) => s + x.value, 0)).toBe(7);
    expect(breedingModifiers({ might: 15 })[0].value).toBe(-3);
  });
  it('the roll: stress die + modifiers against 9', () => {
    expect(breedingRoll(3, seq(6)).success).toBe(true);
    expect(breedingRoll(3, seq(5)).success).toBe(false);
  });
  it('breeding for the best, by the roll', () => {
    expect(breedingForBest(stress(0, true, 1))).toMatch(/Major Supernatural Flaw/);
    expect(breedingForBest(stress(0, true, 0))).toMatch(/Minor Supernatural Flaw/);
    expect(breedingForBest(stress(2))).toMatch(/Weak/);
    expect(breedingForBest(stress(8))).toMatch(/resembles/);
    expect(breedingForBest(stress(14))).toMatch(/hardy/);
    expect(breedingForBest(stress(16))).toMatch(/Minor Supernatural Virtue/);
    expect(breedingForBest(stress(20))).toMatch(/Major Supernatural Virtue/);
  });
  it('birthing every two hours at Size 0, doubling a Size; young Might a fifth of the adult’s', () => {
    expect([birthingIntervalHours(-1), birthingIntervalHours(0), birthingIntervalHours(2)]).toEqual([2, 2, 8]);
    expect([juvenileMight(20), juvenileMight(15, 3)]).toEqual([4, 5]);
  });
});
