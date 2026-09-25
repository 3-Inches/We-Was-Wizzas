import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { addMagnitudes, designSpell, inventionSeasons } from './spellDesign';
import { chargedItemCharges, familiarBindingLevel, investEffect, longevityBonus, modifiedEffectLevel, openingCost, planSumma } from './enchant';
import { deriveCovenant, newCovenant, summaCost, computeFinances } from './covenant';
import { deriveLab, newLab } from './lab';
import { stressDie } from './dice';

const data = buildGameData();

describe('spell design', () => {
  it('handles magnitudes below level 5', () => {
    expect(addMagnitudes(1, 1)).toBe(2);
    expect(addMagnitudes(4, 1)).toBe(5);
    expect(addMagnitudes(4, 2)).toBe(10);
    expect(addMagnitudes(15, -2)).toBe(5);
    expect(addMagnitudes(15, -3)).toBe(4);
  });
  it("reproduces Weaver's Trap of Webs (CrAn 35)", () => {
    const r = designSpell({ technique: 'Cr', form: 'An', requisites: [], baseLevel: 5, range: 'Voice', duration: 'Sun', target: 'Group', sizeMagnitudes: 0, otherMagnitudes: 0 });
    expect(r.level).toBe(35);
    expect(r.ritual).toBe(false);
  });
  it('makes Year / Boundary / >50 spells Rituals with minimum level 20', () => {
    const r = designSpell({ technique: 'Re', form: 'Vi', requisites: [], baseLevel: 2, range: 'Touch', duration: 'Year', target: 'Individual', sizeMagnitudes: 0, otherMagnitudes: 0 });
    expect(r.ritual).toBe(true);
    expect(r.level).toBeGreaterThanOrEqual(20);
  });
  it('computes invention time (Tillitus example)', () => {
    expect(inventionSeasons(25, 20).seasons).toBe(4);
    expect(inventionSeasons(25, 12).seasons).toBe(1);
    expect(inventionSeasons(25, 13).seasons).toBe(2);
  });
});

describe('enchantment', () => {
  it("matches Mari's wand examples", () => {
    // Charged: Lab Total 41 vs level 15 -> 6 charges
    expect(chargedItemCharges(41, 15)).toBe(6);
    // Lesser: level 15 + 24/day (+5) = 20, Lab Total 41 >= 40
    const m = modifiedEffectLevel({ baseLevel: 15, usesPerDay: '24', penetration: 0, concentration: false, effectUse: false, environmentalTrigger: false, fastTrigger: false, linkedTrigger: false });
    expect(m.level).toBe(20);
    const inv = investEffect(41, 20, 'lesser');
    expect(inv.possible).toBe(true);
    expect(inv.vis).toBe(2);
  });
  it('computes opening costs', () => {
    expect(openingCost('wood', 'large')).toBe(8); // staff
    expect(openingCost('silver', 'small')).toBe(12); // silver dagger
  });
  it('longevity and familiar', () => {
    expect(longevityBonus(35, 0, false)).toBe(7);
    expect(longevityBonus(35, 0, true)).toBe(4);
    expect(familiarBindingLevel(10, -2)).toBe(25);
  });
  it('plans summae like the Quintus example', () => {
    const p = planSumma({ isArt: true, score: 24, level: 12, com: -1, language: 5, qualityBonus: 0 });
    expect(p.quality).toBe(5);
    expect(p.seasons).toBe(3);
    const p2 = planSumma({ isArt: true, score: 24, level: 6, com: -1, language: 5, qualityBonus: 0 });
    expect(p2.quality).toBe(10);
  });
});

describe('covenant', () => {
  it('costs library books with DE limits', () => {
    expect(summaCost({ uid: 'a', title: 'x', kind: 'summa', subjectType: 'art', subject: 'Cr', level: 15, quality: 12, language: 'Latin' }).cost).toBe(27);
    expect(summaCost({ uid: 'a', title: 'x', kind: 'summa', subjectType: 'art', subject: 'Cr', level: 15, quality: 17, language: 'Latin' }).issue).toBeTruthy();
    expect(summaCost({ uid: 'a', title: 'x', kind: 'summa', subjectType: 'ability', subject: 'magic-theory', level: 4, quality: 10, language: 'Latin' }).cost).toBe(22);
  });
  it('balances hooks and boons and computes aura', () => {
    const c = newCovenant('s', 1220);
    c.hooksBoons = [
      { uid: '1', name: 'Poverty', kind: 'hook', size: 'Major' },
      { uid: '2', name: 'Aura', kind: 'boon', size: 'Minor' },
      { uid: '3', name: 'Aura', kind: 'boon', size: 'Minor' },
      { uid: '4', name: 'Regio', kind: 'boon', size: 'Minor' },
      { uid: '5', name: 'Seclusion', kind: 'boon', size: 'Minor' },
    ];
    const d = deriveCovenant(c, data, []);
    expect(d.hookPoints).toBe(3);
    expect(d.boonPoints).toBe(4);
    expect(d.aura).toBe(5);
    expect(d.issues.some((i) => i.includes('Boons cost'))).toBe(true);
  });
  it('reproduces the Vernus expenditure example (90 pounds)', () => {
    const c = newCovenant('s', 1220);
    c.season = 'Spring';
    c.covenfolk = { grogs: 10, companions: 4, specialists: 3, craftsmen: 0, laborers: 0, servants: 0, teamsters: 0, dependents: 0, horses: 0 };
    c.finances.sundry = 0;
    c.finances.weaponArmorPoints = 320;
    const labs = Array.from({ length: 6 }, (_, i) => deriveLab(newLab(`Lab ${i}`), data));
    const f = computeFinances(c, [], labs, 6);
    expect(f.inhabitantPoints).toBe(77);
    expect(f.servantsRequired).toBe(12);
    expect(f.teamstersRequired).toBe(7);
    expect(Math.round(f.totalExpenditure)).toBe(90);
  });
});

describe('lab', () => {
  it('computes safety from refinement and occupied size', () => {
    const l = newLab('L');
    l.refinement = 1;
    const d = deriveLab(l, data);
    expect(d.characteristics.Safety).toBe(1);
    expect(d.freeSpace).toBe(1);
  });
});

describe('dice', () => {
  it('stress die explodes on 1 and doubles', () => {
    const seq = [0.1, 0.1, 0.5]; // 1, 1, 5 -> 5*4 = 20
    let i = 0;
    const r = stressDie(1, () => seq[i++]);
    expect(r.value).toBe(20);
  });
  it('stress die botches on 0 with botch dice', () => {
    const seq = [0.0, 0.0, 0.5];
    let i = 0;
    const r = stressDie(2, () => seq[i++]);
    expect(r.zero).toBe(true);
    expect(r.botches).toBe(1);
  });
});

describe('casting outcomes (DE p.213)', () => {
  it('formulaic: fail by up to 10 still casts with fatigue', async () => {
    const { castingOutcome } = await import('./magic');
    expect(castingOutcome('formulaic', 20, 20)).toMatchObject({ cast: true, fatigue: 0 });
    expect(castingOutcome('formulaic', 10, 20)).toMatchObject({ cast: true, fatigue: 1 });
    expect(castingOutcome('formulaic', 9, 20)).toMatchObject({ cast: false, fatigue: 1 });
  });
  it('ritual: long-term fatigue grows with shortfall', async () => {
    const { castingOutcome } = await import('./magic');
    expect(castingOutcome('ritual', 30, 30)).toMatchObject({ cast: true, fatigue: 1, longTerm: true });
    // DE example: casting total 22 vs level 30 (8 short) -> cast, three levels
    expect(castingOutcome('ritual', 22, 30)).toMatchObject({ cast: true, fatigue: 3 });
    expect(castingOutcome('ritual', 16, 30)).toMatchObject({ cast: false, fatigue: 4 });
    expect(castingOutcome('ritual', 10, 30)).toMatchObject({ cast: false, fatigue: 5 });
  });
});
