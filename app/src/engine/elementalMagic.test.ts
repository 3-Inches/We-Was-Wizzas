// The Elementalists (Hedge Magic, Revised Edition): the Arts, totals, the Summoning chart, the
// Elemental Traits and Refining, checked against the book's examples.
import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { addVirtue, ensureAbility, newCharacter } from './character/factory';
import { deriveCharacter } from './character/derive';
import { validateCharacter } from './character/validate';
import { DEFAULT_HOUSE_RULES, type Character } from './types';
import {
  characteristicPotion, controlledEmotion, elementalArts, elementalSoak, elementalTotal, elementalTraits, elementalVisLimit, formFor, humoralRecovery, isElementalist, longevityPotion, moveVis, potionVisOk, refineMight,
  refiningExtraction, summoningNeeds, summoningReach,
} from './elementalMagic';

const data = buildGameData();
const d = (c: Character) => deriveCharacter(c, data, DEFAULT_HOUSE_RULES);

function elementalist(): Character {
  const c = newCharacter('companion', 'e');
  addVirtue(c, data, 'type-summoning', 'Major', 'Theurgical');
  addVirtue(c, data, 'type-summoning', 'Minor', 'Philosophical');
  addVirtue(c, data, 'elementalist-air', 'Minor');
  addVirtue(c, data, 'elementalist-fire', 'Minor');
  addVirtue(c, data, 'elementalist-water', 'Minor');
  return c;
}

describe('the Elementalist Arts', () => {
  it('each Virtue opens its Art at 0; a Technique taken twice keeps one score with two types', () => {
    const c = elementalist();
    const dc = d(c);
    const a = elementalArts(c, dc);
    expect(a.techniques).toEqual([{ id: 'summoning', name: 'Summoning', score: 0, types: ['Theurgical', 'Philosophical'] }]);
    expect(a.forms.map((f) => f.id)).toEqual(['air', 'fire', 'water']);
    expect(isElementalist(c, dc)).toBe(true);
  });
  it('several elements use the lowest Form; Elementalist Magic the highest; Elemental Medicine the highest held to Medicine', () => {
    const c = elementalist();
    ensureAbility(c, 'elementalist-air', { play: 50 }); // 4
    ensureAbility(c, 'elementalist-fire', { play: 105 }); // 6
    expect(formFor(c, d(c), ['air', 'fire']).value).toBe(4);
    const m = elementalist();
    ensureAbility(m, 'elementalist-air', { play: 50 });
    ensureAbility(m, 'elementalist-fire', { play: 105 });
    addVirtue(m, data, 'elemental-medicine', 'Major');
    ensureAbility(m, 'medicine', { play: 75 }); // 5
    expect(formFor(m, d(m), ['air', 'fire']).value).toBe(5);
  });
  it('Summoning: stress die + Stamina + Summoning + Form + aura; vis +2 a pawn up to the sum of the Forms', () => {
    const c = elementalist();
    c.characteristics.Sta = 2;
    ensureAbility(c, 'elemental-summoning', { play: 15 }); // 2
    ensureAbility(c, 'elementalist-air', { play: 50 }); // 4
    const dc = d(c);
    expect(elementalTotal(c, dc, 'summoning', ['air'], { realm: 'Magic', strength: 3 }, { vis: 2 }).total).toBe(2 + 2 + 4 + 3 + 4);
    expect(elementalVisLimit(dc)).toBe(4);
    // the longevity potion's vis is held to the same sum: a 50-year-old needs 10 pawns, more than 4
    expect(potionVisOk(dc, longevityPotion(20, 50).vis)).toBe(false);
    expect(potionVisOk(dc, longevityPotion(20, 20).vis)).toBe(true);
  });
  it('Theurgical Refining adds the Lore of the target’s realm', () => {
    const c = elementalist();
    addVirtue(c, data, 'type-refining', 'Major', 'Theurgical');
    ensureAbility(c, 'elementalist-air', { play: 50 });
    ensureAbility(c, 'faerie-lore', { play: 15 }); // 2
    ensureAbility(c, 'magic-lore', { play: 5 }); // 1
    const dc = d(c);
    const faerie = elementalTotal(c, dc, 'refining', ['air'], undefined, { type: 'Theurgical', realmLore: 'faerie-lore' });
    const magic = elementalTotal(c, dc, 'refining', ['air'], undefined, { type: 'Theurgical' });
    expect(faerie.total - magic.total).toBe(1);
  });
  it('the rules check asks for a Form beside a Technique', () => {
    const c = newCharacter('companion', 'x');
    addVirtue(c, data, 'type-divining', 'Major', 'Medicinal');
    expect(validateCharacter(d(c), data, DEFAULT_HOUSE_RULES).map((i) => i.id)).toContain('elemental-arts');
    addVirtue(c, data, 'elementalist-earth', 'Minor');
    expect(validateCharacter(d(c), data, DEFAULT_HOUSE_RULES).map((i) => i.id)).not.toContain('elemental-arts');
  });
  it('the Summoning chart: the book’s examples', () => {
    expect(summoningNeeds(20, -6)).toBe(20);
    expect(summoningNeeds(5, 3)).toBe(20);
    expect(summoningReach(10)).toMatchObject({ might: 10, size: -3 });
    // Might follows the total, Size the chart's rows: a 7 reaches Might 7 but only Size −6, and summoningNeeds agrees
    expect(summoningReach(14)).toMatchObject({ might: 14, size: -3 });
    expect(summoningReach(7)).toMatchObject({ might: 7, size: -6 });
    expect(summoningNeeds(7, -6)).toBe(7);
  });
});

describe('Elemental Traits', () => {
  it('the book’s example: Air 4, Fire 6, Water 2 and Warping Score 1 give Choleric 3, Phlegmatic 2, Sanguine 2', () => {
    const c = elementalist();
    c.warpingPoints = 5;
    ensureAbility(c, 'elementalist-air', { play: 50 });
    ensureAbility(c, 'elementalist-fire', { play: 105 });
    ensureAbility(c, 'elementalist-water', { play: 15 });
    const t = elementalTraits(c, d(c));
    expect(Object.fromEntries(t.map((x) => [x.trait, x.score]))).toEqual({ Sanguine: 2, Choleric: 3, Phlegmatic: 2 });
    expect(t.find((x) => x.trait === 'Choleric')!.weight).toBe('minor');
    // flux, a phlegmatic disease: −2 Phlegmatic, +3 Choleric
    expect(humoralRecovery(t, 'water')).toBe(1);
    expect(elementalSoak(c, t, 'fire')).toBe(3);
    addVirtue(c, data, 'weak-elemental-resistance-flaw', 'Major');
    expect(elementalSoak(c, t, 'fire')).toBe(0);
  });
});

describe('what a total does', () => {
  it('Medicinal Controlling: Elementalist Water 25 inspires Phlegmatic +3', () => {
    expect(controlledEmotion(25)).toBe(3);
  });
  it('the longevity potion: a 50-year-old spends ten pawns', () => {
    expect(longevityPotion(23, 50)).toEqual({ bonus: 4, vis: 10 });
  });
  it('the physician’s Characteristic potion: Form 4 and a total of 25 give five levels, but no higher than +2', () => {
    expect(characteristicPotion(25, 4, 0, 30)).toEqual({ bonus: 5, cap: 2, result: 2, vis: 6 });
    expect(characteristicPotion(25, 4, -3, 30).result).toBe(2);
    expect(characteristicPotion(10, 10, -1, 30).result).toBe(1);
    // never lowers a score already above the cap
    expect(characteristicPotion(25, 4, 3, 30).result).toBe(3);
  });
  it('Philosophical Refining: vis from an aura, and moving 5 pawns of Vim with Elementalist Air at 25', () => {
    expect(refiningExtraction(25)).toBe(2);
    // the book's example: 5 pawns of Vim moved with Elementalist Air at 25 leave 2 pawns of Auram
    expect(moveVis(25, 5, false)).toEqual({ ok: true, arrive: 2 });
    expect(moveVis(25, 5, true)).toEqual({ ok: true, arrive: 5 });
    expect(moveVis(20, 5, true).ok).toBe(false);
  });
  it('Theurgical Refining: the opposed element drains the excess over Might, and vis forms, no more than Might ÷ 5', () => {
    expect(refineMight(30, 15, 'opposed')).toEqual({ points: 15, drain: true, changed: 15, vis: 3 });
    expect(refineMight(40, 10, 'opposed')).toEqual({ points: 30, drain: true, changed: 10, vis: 2 });
  });
  it('its own element restores Might; vis forms only from what overflows the pool', () => {
    // a being of Might 15 with 5 points left: 15 restored would be 20, so 5 overflow, a pawn of vis
    expect(refineMight(30, 15, 'own', { pool: 5 })).toEqual({ points: 15, drain: false, changed: 10, vis: 1 });
    // with room for all of it, no vis
    expect(refineMight(25, 15, 'own', { pool: 0 })).toEqual({ points: 10, drain: false, changed: 10, vis: 0 });
  });
  it('another element moves half the excess, rounded down, either way', () => {
    expect(refineMight(30, 15, 'other', { pool: 0 })).toMatchObject({ points: 7, drain: false, changed: 7, vis: 0 });
    expect(refineMight(30, 15, 'other', { drain: true })).toMatchObject({ points: 7, drain: true, changed: 7, vis: 1 });
  });
});
