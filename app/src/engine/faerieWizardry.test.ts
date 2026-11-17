// Realms of Power: Faerie: Sympathy Traits and Faerie Rank, faerie rites, the Ars Fabulosa, Faerie Calling.
import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { addVirtue, newCharacter } from './character/factory';
import { deriveCharacter } from './character/derive';
import { DEFAULT_HOUSE_RULES, type Character } from './types';
import {
  bargainPenetration, bargainTotal, callingResolveEase, creativityCost, expectedTraits, faerieArts, faerieRank, riteLevel, riteMaxLevel, riteOptions, riteTotal, sympathyBotchDice, sympathyCanRise, sympathyOnRoll, sympathyCap, sympathyStep, sympathyXp,
} from './faerieWizardry';

const data = buildGameData();
const d = (c: Character) => deriveCharacter(c, data, DEFAULT_HOUSE_RULES);
const t = (trait: string, score: number) => ({ uid: trait, trait, score });

describe('Sympathy Traits', () => {
  it('Faerie Rank is the highest positive trait modified by the lowest negative', () => {
    expect(faerieRank([t('Winter', 4), t('Summer', -2)])).toBe(2);
    expect(faerieRank([t('Iron', -3)])).toBe(-3);
    expect(faerieRank([])).toBe(0);
  });
  it('rises like an Ability; a negative trait costs 10 from −1, 15 from −2', () => {
    expect(sympathyStep(0)).toBe(5);
    expect(sympathyStep(2)).toBe(15);
    expect(sympathyStep(-1)).toBe(10);
    expect(sympathyStep(-2)).toBe(15);
    expect(sympathyXp({ ...t('Dawn', 1), xp: 9 }, 1)).toMatchObject({ score: 2, xp: 0 });
    expect(sympathyXp({ ...t('Dawn', 1), xp: 0 }, -1)).toMatchObject({ score: 0, xp: 4 });
    expect(sympathyXp({ ...t('Iron', -1), xp: 9 }, 1)).toMatchObject({ score: 0, xp: 0 });
    // practice is held at the cap
    expect(sympathyXp({ ...t('Dawn', 2), xp: 14 }, 1, { cap: 2, warping: 2 })).toMatchObject({ score: 2, xp: 14 });
    // the 1s and botches of play are not: "These fluctuations are not limited by the character's Warping Score"
    expect(sympathyXp({ ...t('Dawn', 2), xp: 14 }, 1)).toMatchObject({ score: 3, xp: 0 });
  });
  it('a negative trait rises by practice only while the Warping Score exceeds its size (the book: Warping 2 raises −1, not −2)', () => {
    expect(sympathyCanRise(-1, 2, 2)).toBe(true);
    expect(sympathyCanRise(-2, 2, 2)).toBe(false);
    expect(sympathyCanRise(-3, 2, 2)).toBe(false);
    expect(sympathyXp({ ...t('Iron', -2), xp: 14 }, 1, { cap: 2, warping: 2 })).toMatchObject({ score: -2, xp: 14 });
    expect(sympathyXp({ ...t('Iron', -1), xp: 9 }, 1, { cap: 2, warping: 2 })).toMatchObject({ score: 0, xp: 0 });
  });
  it('a botch costs an experience point for each 0 rolled', () => {
    expect(sympathyXp({ ...t('Dawn', 1), xp: 3 }, -3)).toMatchObject({ score: 1, xp: 0 });
    expect(sympathyXp({ ...t('Dawn', 1), xp: 3 }, -4)).toMatchObject({ score: 0, xp: 4 });
    // reversed for a negative trait: a botch deepens the penalty
    expect(sympathyXp({ ...t('Iron', -1), xp: 0 }, -2)).toMatchObject({ score: -2, xp: 13 });
  });
  it('the worst negative trait adds its size in botch dice to every botch roll (the book: Iron −3, three more)', () => {
    expect(sympathyBotchDice({ sympathy: [t('Iron', -3), t('Winter', 4), t('Bells', -1)] })).toMatchObject({ dice: 3, trait: { trait: 'Iron' } });
    expect(sympathyBotchDice({ sympathy: [t('Winter', 4)] }).dice).toBe(0);
    expect(sympathyBotchDice({}).dice).toBe(0);
  });
  it('the cap: Warping Score, +1 Faerie Blood, +3 Strong Faerie Blood, + the Faerie Sympathy Virtue', () => {
    const c = newCharacter('companion', 's');
    c.warpingPoints = 5; // Warping Score 1
    addVirtue(c, data, 'faerie-sympathy', 'Major');
    expect(sympathyCap(c, d(c))).toBe(1 + 3);
    addVirtue(c, data, 'strong-faerie-blood', 'Major');
    expect(sympathyCap(c, d(c))).toBe(1 + 3 + 3);
    addVirtue(c, data, 'faerie-antipathy-flaw', 'Minor');
    expect(expectedTraits(c).map((x) => x.score)).toEqual([3, -1]);
  });
});

describe('Sympathy Traits on an ordinary roll', () => {
  const t = (trait: string, score: number) => ({ uid: trait, trait, score });
  it('a positive trait stands in for a specialty and calls for a stress die (RoP: Faerie line 5844)', () => {
    // the faerie huntsman: Animal Handling 3 and Hounds +3 make Animal Handling 6 when the dogs are sent out
    const r = sympathyOnRoll([t('Hounds', 3)], ['Hounds']);
    expect(3 + r.total).toBe(6);
    expect(r.stressOnly).toBe(true);
  });
  it('only the highest positive trait that applies counts (line 5846)', () => {
    // Ice +2 and Storms +1: at most +2 on a roll about hailstorms
    expect(sympathyOnRoll([t('Ice', 2), t('Storms', 1)], ['Ice', 'Storms']).total).toBe(2);
  });
  it('the worst negative trait that applies comes off the Ability (line 5848)', () => {
    // Iron −3: Single Weapon takes −3 when fighting with an iron weapon
    const r = sympathyOnRoll([t('Iron', -3), t('Bells', -1)], ['Iron', 'Bells']);
    expect(r.total).toBe(-3);
    expect(r.stressOnly).toBe(false);
  });
  it('a trait not ticked does nothing', () => {
    expect(sympathyOnRoll([t('Hounds', 3), t('Iron', -3)], []).total).toBe(0);
  });
});

describe('faerie rites', () => {
  it('Virtues open the Methods and Powers at 1 and the bargaining Arts at 0', () => {
    const c = newCharacter('companion', 's');
    addVirtue(c, data, 'evocation', 'Major');
    addVirtue(c, data, 'beguile', 'Minor');
    addVirtue(c, data, 'summoning', 'Major');
    const dc = d(c);
    expect(faerieArts(dc)).toEqual({ methods: ['evocation'], powers: ['beguile'] });
    expect(dc.abilities.find((a) => a.abilityId === 'evocation')?.total).toBe(1);
    expect(dc.abilities.some((a) => a.abilityId === 'faerie-summoning')).toBe(true);
  });
  it('Rite Casting Total: Characteristic + Method + Power + aura; held to 5 × the traits', () => {
    const c = newCharacter('companion', 's');
    c.characteristics.Com = 2;
    addVirtue(c, data, 'evocation', 'Major');
    addVirtue(c, data, 'beguile', 'Minor');
    expect(riteTotal(d(c), 'evocation', 'beguile', 3).total).toBe(2 + 1 + 1 + 3);
    // the book's example: +1 and −4 allow level 25
    expect(riteMaxLevel([t('A', 1), t('B', -4)])).toBe(25);
    expect(riteMaxLevel([t('A', 1), t('B', -4)], true)).toBe(50);
  });
  it('a rite’s level from its guideline and faerie parameters: Gown of Enfolding Colors is 15', () => {
    // Base 2, +1 Touch, +2 Midday/Midnight, +2 Room
    expect(riteLevel(2, 'Touch', 'Midday/Midnight', 'Room').level).toBe(15);
    // The Irresistible Dance: Base 10, +2 Voice, +1 Focus
    expect(riteLevel(10, 'Voice', 'Focus', 'Individual').level).toBe(25);
    expect(riteLevel(1, 'Touch', 'Aura', 'Individual').ritual).toBe(true);
    const o = riteOptions();
    for (const n of ['Crossroads', 'Presence', 'Prop', 'Symbol']) expect(o.ranges.some((x) => x.name === n)).toBe(true);
    expect(o.ranges.some((x) => x.name === 'Water-way')).toBe(false); // another tradition's
  });
});

describe('the Ars Fabulosa and Faerie Calling', () => {
  it('a bargaining total and its Penetration, the effect level 0 when held by a Summoning', () => {
    const c = newCharacter('companion', 's');
    c.characteristics.Com = 1;
    addVirtue(c, data, 'bonding', 'Minor');
    expect(bargainTotal(d(c), 'bonding', 2, 3).total).toBe(1 + 0 + 2 + 3);
    // the book's example: Might 15 needs Bonding Total + Penetration of 30, or 15 when held
    expect(bargainPenetration(20, 15, 10, 0, false)).toBe(15);
    expect(bargainPenetration(10, 15, 5, 0, true)).toBe(15);
  });
  it('resolving the Calling: against (Warping Score − Faerie Rank) × 3', () => {
    expect(callingResolveEase(3, 1)).toBe(6);
    expect(callingResolveEase(1, 3)).toBe(0);
  });
  it('a faerie’s change of role costs the table’s points + its Might, less a pawn of vis each', () => {
    expect(creativityCost(2, 10)).toBe(20);
    expect(creativityCost(2, 10, 4)).toBe(16);
  });
});
