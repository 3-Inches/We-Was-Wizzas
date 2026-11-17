// The Gruagachan (Hedge Magic, Revised Edition): Arts, casting, spell levels with the Geas and Limit
// Durations, tattoos and transformation, checked against the book's spells and its boar tattoo.
import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { addVirtue, ensureAbility, newCharacter } from './character/factory';
import { GRUAGACH_APPRENTICESHIP, deriveCharacter } from './character/derive';
import { DEFAULT_HOUSE_RULES, type Character } from './types';
import { validateCharacter } from './character/validate';
import {
  durationProblem, gruagachArtCap, gruagachArts, gruagachCastingScore, gruagachFlex, gruagachLabTotal, gruagachLevel, spontaneousTotal, tattoo, transformationFollows, botchWarpingPoints, gruagachInventSeason,
} from './gruagach';

const data = buildGameData();
const d = (c: Character) => deriveCharacter(c, data, DEFAULT_HOUSE_RULES);

function gruagach(gifted = false): Character {
  const c = newCharacter('companion', 'g');
  c.age = 30;
  addVirtue(c, data, 'gruagach', 'Free');
  if (gifted) addVirtue(c, data, 'the-gift', 'Free');
  else {
    addVirtue(c, data, 'give', 'Major');
    addVirtue(c, data, 'blessing', 'Minor');
  }
  return c;
}

describe('the gruagach Arts', () => {
  it('Virtues open their Arts at 0; a Gifted gruagach has all six; the Blessing Virtue no longer grants the Divine power', () => {
    const c = gruagach();
    const a = gruagachArts(c, d(c));
    expect([a.techniques.map((x) => x.abbr), a.forms.map((x) => x.abbr)]).toEqual([['Gv'], ['Bl']]);
    expect(c.abilities.some((x) => x.abilityId === 'blessing')).toBe(false);
    const g = gruagach(true);
    expect(gruagachArts(g, d(g)).forms).toHaveLength(4);
  });
  it('an unGifted gruagach needs Giant Blood, Large or Shapeshifter', () => {
    const c = gruagach();
    expect(validateCharacter(d(c), data, DEFAULT_HOUSE_RULES).map((i) => i.id)).toContain('gruagach-needs');
    addVirtue(c, data, 'large', 'Minor');
    expect(validateCharacter(d(c), data, DEFAULT_HOUSE_RULES).map((i) => i.id)).not.toContain('gruagach-needs');
  });
  it('Pictish caps the Arts; known spells vary by 2 magnitudes, 3 Flexible, 1 Inflexible', () => {
    expect([1, 2, 3, 4].map(gruagachArtCap)).toEqual([5, 15, 30, Infinity]);
    const c = gruagach();
    expect(gruagachFlex(c)).toBe(2);
    expect(gruagachFlex(c, 10)).toBe(4);
    addVirtue(c, data, 'flexible-gruagach-magic', 'Minor');
    expect(gruagachFlex(c)).toBe(3);
  });
  it('apprenticeship: Gifted 160 points and 80 levels of spells; unGifted 16 and 8 a year', () => {
    const g = gruagach(true);
    const b = d(g).budgets.find((x) => x.id === GRUAGACH_APPRENTICESHIP)!;
    expect([b.total, b.spellLevels?.total]).toEqual([160, 80]);
    const u = gruagach();
    u.gruagach = { apprenticeYears: 4 };
    addVirtue(u, data, 'well-trained-gruagach', 'Minor');
    const bu = d(u).budgets.find((x) => x.id === GRUAGACH_APPRENTICESHIP)!;
    expect([bu.total, bu.spellLevels?.total]).toEqual([64 + 50, 32 + 25]);
  });
});

describe('casting', () => {
  it('Casting Score: Technique + Form + Stamina + aura; spontaneous halved; Cailleach Magic doubles the lowest Art', () => {
    const c = gruagach();
    c.characteristics.Sta = 2;
    ensureAbility(c, 'gruagach-blessing', { play: 21 }); // 6
    expect(gruagachCastingScore(c, d(c), 'GvBl', { realm: 'Magic', strength: 2 }).total).toBe(0 + 6 + 2 + 2);
    addVirtue(c, data, 'cailleach-magic', 'Major');
    ensureAbility(c, 'gruagach-give', { play: 15 }); // 2
    expect(gruagachCastingScore(c, d(c), 'GvBl', undefined, { spontaneous: true }).total).toBe(2 + 6 + 2 + 2);
    expect(spontaneousTotal(12, 7)).toBe(9.5);
  });
  it('the book’s spells: levels from Conversation, Voice, Sun, the Geas and Limit Durations', () => {
    expect(gruagachLevel('GvBl', 10, { range: 'Conversation', duration: 'Limit', target: 'Individual', limit: 'general' }).level).toBe(20);
    expect(gruagachLevel('TaBl', 10, { range: 'Voice', duration: 'Limit', target: 'Individual', limit: 'general' }).level).toBe(25);
    expect(gruagachLevel('GvCu', 5, { range: 'Conversation', duration: 'Geas', target: 'Individual', geas: 'general', limit: 'general' }).level).toBe(15);
    expect(gruagachLevel('GvCu', 5, { range: 'Conversation', duration: 'Limit', target: 'Bloodline', limit: 'general' }).level).toBe(25);
    expect(gruagachLevel('TaSh', 5, { range: 'Conversation', duration: 'Sun', target: 'Individual' }).level).toBe(20);
    expect(gruagachLevel('GvSh', 1, { range: 'Personal', duration: 'Sun', target: 'Individual' }).level).toBe(3);
    expect(durationProblem('GvBl', 'Sun')).toBeTruthy();
    expect(durationProblem('GvSh', 'Geas')).toBeTruthy();
    expect(durationProblem('GvCu', 'Geas')).toBeUndefined();
  });
  it('transformation on a double botch, or a single one when Transformation Prone', () => {
    const c = gruagach();
    expect(transformationFollows(c, 1)).toBe(false);
    addVirtue(c, data, 'transformation-prone-flaw', 'Major');
    expect(transformationFollows(c, 1)).toBe(true);
  });
  it('a Vision botch gives double Warping Points, so a single one calls for the transformation roll', () => {
    expect(botchWarpingPoints('GvCu', 1)).toBe(1);
    expect(botchWarpingPoints('GvVs', 1)).toBe(2);
    expect(botchWarpingPoints('TaVs', 2)).toBe(4);
    expect(transformationFollows(gruagach(), botchWarpingPoints('GvVs', 1))).toBe(true);
    expect(transformationFollows(gruagach(), botchWarpingPoints('GvCu', 1))).toBe(false);
  });
});

describe('inventing a spell', () => {
  const spell = { uid: 's', name: 'Eyes of the Cat', tf: 'GvSh', level: 20, range: 'Personal', duration: 'Sun', target: 'Individual', source: 'play' as const };
  it('as a Hermetic spell: the Lab Total less the level each season, kept until it reaches the level', () => {
    const c = gruagach();
    expect(gruagachInventSeason(c, 30, spell)).toMatch(/10 of 20/);
    expect(c.gruagach?.inventing).toMatchObject({ progress: 10, seasons: 1 });
    expect(c.gruagach?.spells ?? []).toHaveLength(0);
    expect(gruagachInventSeason(c, 30, spell)).toMatch(/is invented/);
    expect(c.gruagach?.inventing).toBeUndefined();
    expect(c.gruagach?.spells?.map((x) => x.name)).toEqual(['Eyes of the Cat']);
  });
  it('in one season at twice the level; nothing when the Lab Total does not beat it', () => {
    const c = gruagach();
    gruagachInventSeason(c, 40, spell);
    expect(c.gruagach?.spells).toHaveLength(1);
    const e = gruagach();
    expect(gruagachInventSeason(e, 20, spell)).toMatch(/nothing gained/);
    expect(e.gruagach?.inventing).toBeUndefined();
  });
});

describe('tattoos', () => {
  it('the book’s boar tattoo: Give 2, Blessing 14, Pictish 3, Intelligence 2, aura 3 give 24; a similar spell +5, the boar’s +4 held to 3: 32, a level 16 effect for 2 pawns', () => {
    const c = gruagach();
    c.characteristics.Int = 2;
    ensureAbility(c, 'gruagach-give', { play: 15 });
    ensureAbility(c, 'gruagach-blessing', { play: 105 }); // 14
    ensureAbility(c, 'dead-language', { play: 30 }, 'Pictish');
    const dc = d(c);
    expect(gruagachLabTotal(c, dc, 'GvBl', { realm: 'Magic', strength: 3 }).total).toBe(24);
    const lt = gruagachLabTotal(c, dc, 'GvBl', { realm: 'Magic', strength: 3 }, { tattoo: true, shape: 4, similar: 5 }).total;
    expect(lt).toBe(32);
    expect(tattoo(lt, 15, 3, false)).toMatchObject({ ok: true, maxLevel: 16, vis: 2 });
    expect(tattoo(lt, 15, 3, true).vis).toBe(1);
    // the spare level buys 2 uses a day: level 16, still 2 pawns, which a tiny tattoo (capacity 2) holds
    expect(tattoo(lt, 15, 3, false, { usesMod: 1, sizeMult: 1 })).toMatchObject({ ok: true, level: 16, vis: 2, capacity: 2, problems: [] });
    // 3 uses a day would be level 17: too much for a Lab Total of 32
    expect(tattoo(lt, 15, 3, false, { usesMod: 2 }).ok).toBe(false);
  });
  it('the tattoo’s material and the season’s vis limit hold the pawns', () => {
    // level 30 needs 3 pawns: a tiny tattoo holds 2, a palm-sized one 4
    expect(tattoo(60, 30, 3, false, { sizeMult: 1 }).problems).toHaveLength(1);
    expect(tattoo(60, 30, 3, false, { sizeMult: 2 })).toMatchObject({ ok: true, problems: [] });
    // Pictish 1 allows 2 pawns a season
    expect(tattoo(60, 30, 1, false, { sizeMult: 2 }).ok).toBe(false);
  });
});
