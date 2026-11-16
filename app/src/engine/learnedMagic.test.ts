// The Learned Magicians (Hedge Magic, Revised Edition): the Arts, charms, Entreat the Powers,
// chartae and amulets, checked against the book's own examples.
import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { addVirtue, ensureAbility, newCharacter } from './character/factory';
import { deriveCharacter, LEARNED_TRAINING } from './character/derive';
import { validateCharacter } from './character/validate';
import { DEFAULT_HOUSE_RULES, type Character } from './types';
import {
  amuletCharges, amuletItem, castingScore, chartaTime, chartaWorks, charmDivisor, charmOutcome, entreatTotal, interventionFollows, inventGain, inventSeason, isLearnedMagician, learnedArts, learnedLabTotal,
  learnedLevel, naturalMagicianOffset, readingCharm,
} from './learnedMagic';

const data = buildGameData();
const d = (c: Character) => deriveCharacter(c, data, DEFAULT_HOUSE_RULES);

function magician(): Character {
  const c = newCharacter('companion', 'm');
  addVirtue(c, data, 'mathematicus-of-bologna', 'Free');
  addVirtue(c, data, 'succurro', 'Major');
  addVirtue(c, data, 'salutem', 'Minor');
  return c;
}

describe('the Arts of the learned magicians', () => {
  it('each Virtue opens its Art at 0: a Technique and a Form make a magician', () => {
    const c = magician();
    const dc = d(c);
    const a = learnedArts(c, dc);
    expect(a.techniques.map((x) => x.abbr)).toEqual(['Su']);
    expect(a.forms.map((x) => x.abbr)).toEqual(['Sa']);
    expect(dc.abilities.find((x) => x.abilityId === 'succurro')?.total).toBe(0);
    expect(isLearnedMagician(c, dc)).toBe(true);
  });
  it('a Gifted mathematicus has all six Arts; Mythic Alchemy opens at 1', () => {
    const c = newCharacter('companion', 'g');
    addVirtue(c, data, 'mathematicus-of-bologna', 'Free');
    addVirtue(c, data, 'the-gift', 'Free');
    addVirtue(c, data, 'mythic-alchemy', 'Major');
    const dc = d(c);
    expect(learnedArts(c, dc).techniques).toHaveLength(3);
    expect(learnedArts(c, dc).forms).toHaveLength(3);
    expect(dc.abilities.find((x) => x.abilityId === 'mythic-alchemy')?.total).toBe(1);
  });
  it('a Technique rises as an Ability, a Form as an Art', () => {
    const c = magician();
    ensureAbility(c, 'succurro', { play: 15 });
    ensureAbility(c, 'salutem', { play: 15 });
    const dc = d(c);
    expect(dc.abilities.find((x) => x.abilityId === 'succurro')?.total).toBe(2);
    expect(dc.abilities.find((x) => x.abilityId === 'salutem')?.total).toBe(5);
  });
  it('years under a master: 30 experience each from the later-life years, Skilled Master +50, charms 5 levels a point', () => {
    const c = magician();
    c.age = 25;
    c.learned = { trainingYears: 4, charms: [{ uid: 'x', name: 'A charm', tf: 'SuSa', level: 10, range: 'Touch', duration: 'Sun', target: 'Individual', source: 'training' }] };
    addVirtue(c, data, 'skilled-master', 'Minor');
    const dc = d(c);
    const b = dc.budgets.find((x) => x.id === LEARNED_TRAINING)!;
    expect(b.total).toBe(120 + 50);
    expect(b.spent).toBe(2);
    expect(dc.budgets.find((x) => x.id === 'laterLife')!.total).toBe((25 - 5 - 4) * 15);
  });
  it('the rules check asks a mathematicus for a Technique and a Form', () => {
    const c = newCharacter('companion', 'n');
    addVirtue(c, data, 'mathematicus-of-bologna', 'Free');
    addVirtue(c, data, 'fortunam', 'Minor');
    const ids = validateCharacter(d(c), data, DEFAULT_HOUSE_RULES).map((i) => i.id);
    expect(ids).toContain('learned-arts');
  });
});

describe('charms', () => {
  it('Casting Score: Technique + Form + Communication + a Magic aura', () => {
    const c = magician();
    c.characteristics.Com = 2;
    expect(castingScore(c, d(c), 'SuSa', { realm: 'Magic', strength: 3 }).total).toBe(0 + 0 + 2 + 3);
  });
  it('the total: halved known, a fifth from a text; Strong Verbal Charms whole and halved; Weak Verbal Charms a fifth', () => {
    const c = magician();
    expect([charmDivisor(c, false), charmDivisor(c, true)]).toEqual([2, 5]);
    addVirtue(c, data, 'strong-verbal-charms', 'Major');
    expect([charmDivisor(c, false), charmDivisor(c, true)]).toEqual([1, 2]);
    const w = magician();
    addVirtue(w, data, 'weak-verbal-charms-flaw', 'Major');
    expect([charmDivisor(w, false), charmDivisor(w, true)]).toEqual([5, 5]);
  });
  it('works at the level, costs Fatigue within 10 below, fails further below', () => {
    expect(charmOutcome(10, 10)).toBe('works');
    expect(charmOutcome(0, 10)).toBe('fatigue');
    expect(charmOutcome(4.5, 15)).toBe('fails');
  });
  it('a level from its base: Stay the Fickle Hand of Fate is 5, Grant Fortuna Belli 15', () => {
    expect(learnedLevel(2, { range: 'Touch', duration: 'Sun', target: 'Individual' }, false).level).toBe(5);
    expect(learnedLevel(5, { range: 'Touch', duration: 'Diameter', target: 'Individual' }, false).level).toBe(15);
  });
  it('reading from a formulary: two minutes a magnitude, longer and riskier with poor Latin', () => {
    expect(readingCharm(15, 5)).toEqual({ minutes: 6, botch: 0 });
    expect(readingCharm(15, 3)).toEqual({ minutes: 12, botch: 2 });
    expect(readingCharm(15, 2)).toEqual({ minutes: 24, botch: 3 });
  });
  it('a double botch brings intervention; a single one for the Intervention Prone', () => {
    const c = magician();
    expect(interventionFollows(c, 1)).toBe(false);
    expect(interventionFollows(c, 2)).toBe(true);
    addVirtue(c, data, 'intervention-prone-flaw', 'Major');
    expect(interventionFollows(c, 1)).toBe(true);
  });
});

describe('Entreat the Powers', () => {
  // the book's Giacomo: Presence 1, Divine Lore 3, Magic Lore 2, a 6 on the die
  const giacomo = () => {
    const c = magician();
    addVirtue(c, data, 'entreat-the-powers', 'Major');
    c.characteristics.Pre = 1;
    ensureAbility(c, 'dominion-lore', { play: 30 });
    ensureAbility(c, 'magic-lore', { play: 15 });
    return c;
  };
  it('calling the angels in a Dominion aura of 3: 10, offsetting the whole −9', () => {
    const c = giacomo();
    const e = entreatTotal(d(c), ['Divine'], { realm: 'Divine', strength: 3 }, 6);
    expect(e.raw).toBe(10);
    expect(e.offset).toBe(9);
  });
  it('calling the powers of Magic there instead: 9, divided by the aura, 3', () => {
    const c = giacomo();
    expect(entreatTotal(d(c), ['Magic'], { realm: 'Divine', strength: 3 }, 6).offset).toBe(3);
  });
  it('three realms called in an Infernal aura of 4: 13 ÷ 4 = 3, and three more botch dice', () => {
    const c = giacomo();
    ensureAbility(c, 'faerie-lore', { play: 5 });
    const e = entreatTotal(d(c), ['Magic', 'Faerie', 'Divine'], { realm: 'Infernal', strength: 4 }, 6);
    expect(e.raw).toBe(13);
    expect(e.offset).toBe(3);
    expect(e.extraBotch).toBe(3);
  });
  it('Natural Magician: Philosophiae against a Divine or Infernal penalty only', () => {
    const c = magician();
    addVirtue(c, data, 'natural-magician', 'Minor');
    ensureAbility(c, 'philosophiae', { play: 50 });
    expect(naturalMagicianOffset(c, d(c), { realm: 'Divine', strength: 1 })).toBe(3);
    expect(naturalMagicianOffset(c, d(c), { realm: 'Faerie', strength: 3 })).toBe(0);
  });
});

describe('amulets and chartae', () => {
  it('the book’s amulets: Ample Harvest is 20 and needs 26 for 2 charges; Longevity is 5 and needs 21 for 4', () => {
    expect(learnedLevel(1, { range: 'Touch', duration: 'Season', target: 'Boundary' }, true).level).toBe(20);
    expect(learnedLevel(2, { range: 'Touch', duration: 'Season', target: 'Individual' }, true).level).toBe(5);
    expect(amuletCharges(26, 20)).toBe(2);
    expect(amuletCharges(21, 5)).toBe(4);
    expect(amuletCharges(20, 20)).toBe(0);
  });
  it('a charta needs half the Lab Total; it takes the horoscope and an hour a magnitude', () => {
    expect(chartaWorks(8, 4)).toBe(true);
    expect(chartaWorks(7, 4)).toBe(false);
    expect(chartaTime(4, 'daily')).toBe('2 hours');
    expect(chartaTime(15, 'nativity')).toMatch(/a day/);
  });
  it('Lab Total: Arts + Intelligence + Artes Liberales + aura, the horoscope, Strong Amulet Magic, the Weak Flaws', () => {
    const c = magician();
    c.characteristics.Int = 2;
    ensureAbility(c, 'artes-liberales', { play: 15 });
    addVirtue(c, data, 'strong-amulet-magic', 'Major');
    addVirtue(c, data, 'weak-chartae-flaw', 'Minor');
    const dc = d(c);
    expect(learnedLabTotal(c, dc, 'SuSa', undefined, { kind: 'amulet', horoscope: 'nativity', target: 'Individual' }).total).toBe(2 + 2 + 10 + 10);
    expect(learnedLabTotal(c, dc, 'SuSa', undefined, { kind: 'charta', horoscope: 'daily' }).total).toBe(2 + 2 + 5 + 10 - 5);
    // a nativity counts only as a daily horoscope for a Structure
    expect(learnedLabTotal(c, dc, 'SuSa', undefined, { kind: 'amulet', horoscope: 'nativity', target: 'Structure' }).total).toBe(2 + 2 + 5 + 10);
  });
  it('inventing a charm: the Lab Total × 5 less its level a season', () => {
    expect(inventGain(4, 15)).toBe(5);
    expect(inventGain(2, 15)).toBe(0);
  });
  it('an amulet goes on the sheet as a charged device under the nearest Hermetic Arts', () => {
    const it = amuletItem('Amulet of Longevity', { tf: 'SuSa', level: 5, range: 'Touch', duration: 'Season', target: 'Individual' }, 4);
    expect(it).toMatchObject({ kind: 'charged', charges: 4 });
    expect(it.effects[0]).toMatchObject({ technique: 'Cr', form: 'Co', baseLevel: 5 });
  });
  it('a season inventing: points until they reach the level, then the charm is known', () => {
    const c = magician();
    const charm = { uid: 'i', name: 'Ward of the Hearth', tf: 'TuSa', level: 20, range: 'Touch', duration: 'Sun', target: 'Individual', source: 'play' as const };
    c.learned = { inventing: { charm, progress: 0, seasons: 0 } };
    inventSeason(c, 6); // 30 − 20 = 10
    expect(c.learned.inventing).toMatchObject({ progress: 10, seasons: 1 });
    inventSeason(c, 6);
    expect(c.learned.inventing).toBeUndefined();
    expect(c.learned.charms?.map((x) => x.name)).toEqual(['Ward of the Hearth']);
  });
});
