// City & Guild's craftsman rules, against the book's example of Klaus's Workshop.
import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { deriveCharacter } from './character/derive';
import { ensureAbility, newCharacter } from './character/factory';
import { DEFAULT_HOUSE_RULES } from './types';
import { craftQuality, laborPoints, rollExertion, seasonalOutput, sellGoods, upkeep, wondrousItem, workshopTotal, workshopYearEnd } from './workshop';

const faces = (...f: number[]) => {
  let i = 0;
  return () => (f[i++ % f.length] + 0.5) / 10;
};
// Klaus: Strength +3, Swordsmith 6 + Puissant 2; Gunter Swordsmith 3, Hans Swordsmith 5
const klaus = (assistants: number[]) =>
  workshopTotal({ characteristic: { label: 'Strength', value: 3 }, ability: { label: 'Swordsmith', value: 8 }, innovation: 0, rawMaterials: 0, assistants }).total;

describe("Klaus's Workshop (City & Guild)", () => {
  it('gives the Workshop Totals and the goods they make', () => {
    expect(klaus([3, 5])).toBe(15);
    expect(craftQuality(15, 6, 8)).toMatchObject({ quality: 'excellent', bonus: 1 });
    expect(klaus([3])).toBe(13);
    expect(craftQuality(13, 6, 8).quality).toBe('superior');
    expect(craftQuality(7, 6, 5).quality).toBe('standard'); // Hans alone
    expect(craftQuality(5, 6, 5).quality).toBe('shoddy');
  });
  it('caps an excellent bonus at Craft ÷ 3 and raises the levels with the base', () => {
    expect(craftQuality(30, 6, 4).bonus).toBe(2);
    expect(craftQuality(14, 9, 8).quality).toBe('standard'); // base 9: superior at 15
  });
  it('counts Labor Points, with 3 lost for each worker an understaffed master lacks', () => {
    expect(laborPoints(3, 8, 'average')).toBe(33);
    expect(laborPoints(3, 8, 'average', 1)).toBe(30);
    expect(laborPoints(3, 8, 'wealthy')).toBe(66);
    expect(upkeep(0)).toBe(36);
    expect(upkeep(2)).toBe(46);
  });
  it('makes a wondrous item: Craft Level 12 + magnitude, done when the season points reach it', () => {
    expect(wondrousItem(17, 1, 0)).toMatchObject({ craftLevel: 13, perSeason: 4, seasons: 4 });
    expect(wondrousItem(26, 1, 0).seasons).toBe(1);
  });
  it('scales seasonal output by Craft ÷ 5, rounded up (tailor 7 → 45 suits)', () => {
    expect(seasonalOutput(32, 7)).toBe(45);
  });
  it('rolls exertion and haggling', () => {
    const ex = rollExertion(faces(9, 6));
    expect(ex.bonus).toBe(0); // 6–7 on the chart: no benefit
    expect(ex.lines[0]).toMatch(/No benefit/);
    expect(sellGoods(2, 3, faces(7)).premium).toBe(40); // 12: 10% at 9, +10% a point
  });
});

describe('investments at the year’s end (City & Guild ch.7)', () => {
  it('pays speculation’s point in ten, and returns falling due, then the upkeep', () => {
    const data = buildGameData();
    const c = newCharacter('companion', 's1');
    const ab = ensureAbility(c, 'craft-type', { play: 75 }, 'Smith');
    c.workshop = { abilityUid: ab.uid, primary: 'Dex', innovation: 0, rawMaterials: 0, laborPoints: 100, assistants: [], manual: 0, craftLevelMod: 0, seasonsWorked: 0, reputationXp: 0, shoddyStreak: 0, speculation: 45, pending: [{ year: 1222, lp: 30, note: 'An introduction repaid' }, { year: 1224, lp: 30, note: 'Later' }] };
    const d = deriveCharacter(c, data, DEFAULT_HOUSE_RULES);
    const lines = workshopYearEnd(c, d, 1222);
    expect(c.workshop.laborPoints).toBe(100 + 4 + 30 - 36);
    expect(c.workshop.pending).toHaveLength(1);
    expect(lines.join(' ')).toMatch(/Speculation returns 4/);
  });
});
