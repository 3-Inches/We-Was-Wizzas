// The Folk Witches (Hedge Magic, Revised Edition): powers, the kitchen, potions and the Witch Moon,
// checked against the book's brewing example.
import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { addVirtue, ensureAbility, newCharacter } from './character/factory';
import { FOLK_APPRENTICESHIP, deriveCharacter } from './character/derive';
import { DEFAULT_HOUSE_RULES, type Character } from './types';
import { validateCharacter } from './character/validate';
import {
  brew, familiarBinding, healingCost, kitchenLabTotal, kitchenVisLimit, methodsFor, potionAbility, witchCastingScore, witchMoonEnds, witchMoonOutcome, witchMoonWound, witchPenetration, witchPowers,
  witchVisExtraction,
} from './folkWitch';

const data = buildGameData();
const d = (c: Character) => deriveCharacter(c, data, DEFAULT_HOUSE_RULES);

function witch(gifted = false): Character {
  const c = newCharacter('companion', 'w');
  c.age = 30;
  addVirtue(c, data, 'folk-witch', 'Free');
  if (gifted) addVirtue(c, data, 'the-gift', 'Free');
  else addVirtue(c, data, 'witch-healing', 'Major');
  return c;
}

describe('folk witches', () => {
  it('an unGifted witch has the powers of her Virtues; a Gifted one all seven, but a Flawed Opening’s', () => {
    expect(witchPowers(witch(), d(witch())).map((p) => p.id)).toEqual(['witch-healing']);
    const g = witch(true);
    addVirtue(g, data, 'flawed-folk-witch-gift-opening', 'Minor', 'Flight');
    expect(witchPowers(g, d(g)).map((p) => p.name)).toEqual(['Animal Ken', 'Cursing', 'Dowsing', 'Healing', 'Second Sight', 'Shapeshifter']);
  });
  it('the apprenticeship: 200 points from ten later-life years; Well-Trained +50', () => {
    const c = witch();
    addVirtue(c, data, 'well-trained-folk-witch', 'Minor');
    const dc = d(c);
    expect(dc.budgets.find((b) => b.id === FOLK_APPRENTICESHIP)!.total).toBe(250);
    expect(dc.budgets.find((b) => b.id === 'laterLife')!.total).toBe((30 - 5 - 10) * 15);
  });
  it('Casting Score: Characteristic + Ability + aura; vis only if Gifted; Life-Linked +5 a Fatigue level', () => {
    const c = witch();
    c.characteristics.Sta = 2;
    const s = witchCastingScore(c, d(c), 'witch-healing', { realm: 'Magic', strength: 3 }, { vis: 2 });
    expect(s.total).toBe(2 + 1 + 3);
    expect(s.notes.join(' ')).toMatch(/unGifted/);
    addVirtue(c, data, 'life-linked-folk-witch-magic', 'Major');
    expect(witchCastingScore(c, d(c), 'witch-healing', undefined, { fatigue: 2 }).total).toBe(2 + 1 + 10);
    expect(witchPenetration(20, 9, 3)).toBe(14);
  });
  it('the rules check asks for a Flaw that limits her magic', () => {
    const c = witch();
    expect(validateCharacter(d(c), data, DEFAULT_HOUSE_RULES).map((i) => i.id)).toContain('folk-witch-flaw');
    addVirtue(c, data, 'unstable-magic-flaw', 'Minor');
    expect(validateCharacter(d(c), data, DEFAULT_HOUSE_RULES).map((i) => i.id)).not.toContain('folk-witch-flaw');
  });
  it('Healing’s Ease Factors and vis; the casting methods a tradition allows', () => {
    expect(healingCost('wound', 6)).toEqual({ ease: 6, vis: 3, what: 'Light Wound' });
    expect(healingCost('fatigue', 12)).toEqual({ ease: 12, vis: 3, what: 'Tired' });
    const c = witch();
    addVirtue(c, data, 'silent-tradition-flaw', 'Minor');
    expect(methodsFor(c, ['incantation', 'potion'])).toEqual(['potion']);
  });
});

describe('the kitchen and potions', () => {
  it('the book’s brew: Intelligence 1, Folk Witch Magic Theory 4, Healing 5, aura 3 give Brew Potency 13 and 4 doses for 7 pawns', () => {
    const c = witch();
    c.characteristics.Int = 1;
    ensureAbility(c, 'witch-healing', { play: 75 });
    ensureAbility(c, 'folk-witch-magic-theory', { play: 50 });
    const dc = d(c);
    expect(kitchenLabTotal(c, dc, 'witch-healing', { realm: 'Magic', strength: 3 }, { potion: true }).total).toBe(13);
    const limit = kitchenVisLimit(c, 4, true);
    expect(limit).toBe(8);
    expect(brew(4, 3, limit)).toEqual({ doses: 4, vis: 7, maxDoses: 4 });
    // with only 4 pawns, one dose
    expect(brew(4, 3, 4).doses).toBe(1);
    // from a Lab Text of level 4: 8 doses wanted, but 8 pawns allow only 5
    expect(brew(4, 3, limit, { labText: 4 })).toEqual({ doses: 5, vis: 8, maxDoses: 8 });
    addVirtue(c, data, 'expert-potion-brewer', 'Minor');
    expect(kitchenLabTotal(c, d(c), 'witch-healing', { realm: 'Magic', strength: 3 }, { potion: true }).total).toBe(18);
  });
  it('a potion of Animal Ken or Second Sight: the potency ÷ 5 (rounded up), for that many days', () => {
    expect(potionAbility(13)).toEqual({ score: 3, days: 13 });
  });
  it('vis from the aura: a tenth of the Lab Total, rounded up; a familiar: 10 + Size + Might', () => {
    expect(witchVisExtraction(8)).toBe(1);
    expect(witchVisExtraction(11)).toBe(2);
    expect(familiarBinding(-4, 0)).toBe(6);
  });
});

describe('the Witch Moon', () => {
  it('ends on Stamina − Warping Score + stress die against 6; good within the Warping Score’s months', () => {
    const c = witch();
    c.characteristics.Sta = 1;
    expect(witchMoonEnds(d(c), 2)).toBe(-1);
    expect(witchMoonOutcome(1, 1, 0).good).toBe(true);
    expect(witchMoonOutcome(3, 1, 2)).toMatchObject({ good: false });
    expect(witchMoonWound(c)).toBe('Medium');
    addVirtue(c, data, 'harsh-moon-flaw', 'Minor');
    expect(witchMoonWound(c)).toBe('Heavy');
  });
});
