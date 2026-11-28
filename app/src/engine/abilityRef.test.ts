// An Ability of a kind is matched one way (Batch F, Found F6): the sheet's totals (derive.ts), study of an
// Ability begun that season (longterm.ts), and the rules check (validate.ts) read `abilityRef.ts`.
// "Skill in one Craft does not imply skill in any others" (DE line 7474).

import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { namesAbility, splitAbilityRef } from './abilityRef';
import { deriveCharacter } from './character/derive';
import { addVirtue, ensureAbility, newCharacter } from './character/factory';
import { validateCharacter } from './character/validate';
import { computeStudy } from './longterm';
import { abilityXpForScore } from './xp';
import { DEFAULT_HOUSE_RULES, type Character } from './types';

const data = buildGameData();
const derive = (c: Character) => deriveCharacter(c, data, DEFAULT_HOUSE_RULES);
const summa = { kind: 'summa', quality: 10, level: 5, isArt: false, subject: 'Craft: Woodcarver' } as const;

describe('one reading of a Virtue’s Ability', () => {
  it('splits the kind off, and matches it whatever its case or spaces', () => {
    expect(splitAbilityRef('craft-type:Runes')).toEqual({ abilityId: 'craft-type', kind: 'Runes' });
    expect(splitAbilityRef('brawl')).toEqual({ abilityId: 'brawl' });
    expect(namesAbility('craft-type: woodcarver', 'craft-type', 'Woodcarver')).toBe(true);
    expect(namesAbility('craft-type:Wood  Carver', 'craft-type', 'wood carver')).toBe(true);
    // one Craft is not another
    expect(namesAbility('craft-type:Woodcarver', 'craft-type', 'Smith')).toBe(false);
    // a Virtue on the Ability alone helps it whatever its kind
    expect(namesAbility('craft-type', 'craft-type', 'Smith')).toBe(true);
    expect(namesAbility('brawl', 'brawl')).toBe(true);
    expect(namesAbility('brawl', 'athletics')).toBe(false);
  });

  it('an Affinity with Craft: woodcarver speeds a Craft: Woodcarver begun from a book', () => {
    const c = newCharacter('companion', 's1');
    addVirtue(c, data, 'affinity-with-ability', 'Minor', 'craft-type:woodcarver');
    // DE, Affinity with Ability: experience × 1.5 (10 → 15)
    expect(computeStudy(derive(c), summa, { newAbility: { abilityId: 'craft-type', param: 'Woodcarver' } }).xp).toBe(15);
    expect(computeStudy(derive(c), summa, { newAbility: { abilityId: 'craft-type', param: 'Smith' } }).xp).toBe(10);
  });

  it('and the sheet’s Craft: Woodcarver once begun', () => {
    const c = newCharacter('companion', 's1');
    addVirtue(c, data, 'affinity-with-ability', 'Minor', 'craft-type:woodcarver');
    ensureAbility(c, 'craft-type', { laterLife: abilityXpForScore(2) }, 'Woodcarver');
    ensureAbility(c, 'craft-type', { laterLife: abilityXpForScore(2) }, 'Smith');
    const d = derive(c);
    const of = (p: string) => d.abilities.find((a) => a.uid === c.abilities.find((x) => x.abilityId === 'craft-type' && x.param === p)?.uid);
    expect(of('Woodcarver')?.affinity).toBe(true);
    expect(of('Smith')?.affinity).toBeFalsy();
  });
});

describe('the rules check reads the kind', () => {
  const warnings = (c: Character) => validateCharacter(derive(c), data, DEFAULT_HOUSE_RULES).filter((i) => i.id.startsWith('vf-ability-')).map((i) => i.message);

  it('checks an Ability of a kind the character cannot learn', () => {
    // a grog with no Arcane Virtue cannot learn (Realm) Lore … but a kind needs an Ability that takes one:
    // Puissant Heartbeast is the book's own case of an Ability closed to the character
    const c = newCharacter('magus', 's1');
    c.house = 'flambeau';
    addVirtue(c, data, 'puissant-ability', 'Minor', 'heartbeast');
    expect(warnings(c).join(' ')).toMatch(/cannot learn Heartbeast/);
  });

  it('warns when the kind typed names none of the character’s, while they have that Ability of another', () => {
    const c = newCharacter('companion', 's1');
    addVirtue(c, data, 'puissant-ability', 'Minor', 'craft-type:Woodcarving');
    ensureAbility(c, 'craft-type', { laterLife: abilityXpForScore(2) }, 'Woodcarver');
    expect(warnings(c).join(' ')).toMatch(/names Craft: Woodcarving, which the character does not have; they have Craft: Woodcarver/);
    // spelled the same, but for the case: no warning
    c.virtues.at(-1)!.param = 'craft-type:woodcarver';
    expect(warnings(c)).toEqual([]);
  });

  it('warns when the kind is left out, or the Ability names none', () => {
    const c = newCharacter('companion', 's1');
    addVirtue(c, data, 'puissant-ability', 'Minor', 'craft-type');
    expect(warnings(c).join(' ')).toMatch(/say which Craft/);
    c.virtues.at(-1)!.param = 'woodcarving';
    expect(warnings(c).join(' ')).toMatch(/"woodcarving" names no Ability/);
  });
});
