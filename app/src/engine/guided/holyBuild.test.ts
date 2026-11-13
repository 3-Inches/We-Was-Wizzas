// Building holy characters (Realms of Power: The Divine): the Mythic Companion types the book gives,
// the guided build's Holy Method and Power taken as a pair that works, and no Flaw at odds with a
// living faith beside it.

import { describe, expect, it } from 'vitest';
import { buildGameData } from '../../data';
import { nativeLanguageFor } from '../../data/lists';
import { MYTHIC_TYPES } from '../../data/mythic';
import { DEFAULT_HOUSE_RULES, type Character, type Saga } from '../types';
import { addVirtue, applyMythicType, newCharacter } from '../character/factory';
import { canSpend, deriveCharacter } from '../character/derive';
import { abilityAvailability } from '../character/restrictions';
import { validateCharacter } from '../character/validate';
import { generateCharacter } from '../generate/character';
import { holyMethodsOf, holyPowersOf, worksHolyEffects } from '../holy';
import { autoBuild } from './autobuild';
import { evaluate, shortlist, type GuidedContext } from './score';

const data = buildGameData();
const rules = DEFAULT_HOUSE_RULES;
const saga = { id: 's', name: 'S', currentYear: 1220, currentSeason: 'Spring', tribunal: 'Rhine', enabledBooks: [], houseRules: rules, mechanicsOverrides: {}, custom: { virtuesFlaws: [], abilities: [], spells: [] } } as unknown as Saga;
const derive = (c: Character) => deriveCharacter(c, data, rules);
const ctxOf = (c: Character, archetypes: string[] = []): GuidedContext => ({ c, d: derive(c), data, rules, archetypes, saga });
const has = (c: Character, id: string) => c.virtues.some((v) => v.defId === id);
const IMPIOUS = ['depraved-flaw', 'pagan-flaw', 'unbaptized-flaw', 'excommunicate-flaw', 'a-deal-with-the-devil-flaw', 'uncertain-faith-flaw'];

describe('Mythic Companion types of The Divine', () => {
  it('a zahid takes True Faith, Meditation and Understanding, with Second Sight free, and loses them with the type', () => {
    const c = newCharacter('mythic', 's');
    applyMythicType(c, data, 'zahid');
    expect(['zahid', 'true-faith', 'meditation', 'understanding', 'second-sight'].every((id) => has(c, id))).toBe(true);
    expect(c.virtues.find((v) => v.defId === 'second-sight')?.freeReason).toBe('Mythic Companion free Minor Virtue');
    expect(c.society).toBe('Islamic');
    const d = derive(c);
    expect(worksHolyEffects(d)).toBe(true);
    // the type's own least Abilities are open to it without Arcane Lore or an education
    expect(abilityAvailability(d, data, 'dominion-lore').ok).toBe(true);
    expect(abilityAvailability(d, data, 'theology-islam').ok).toBe(true);
    expect(validateCharacter(d, data, rules).some((i) => i.id === 'mythic-type')).toBe(false);
    expect(validateCharacter(d, data, rules).find((i) => i.id === 'mythic-min-abilities')?.message).toMatch(/Meditation 3/);
    applyMythicType(c, data, 'perfectus');
    expect(['zahid', 'true-faith', 'meditation', 'understanding'].some((id) => has(c, id))).toBe(false);
    expect(c.abilities.some((a) => a.abilityId === 'meditation')).toBe(false);
    expect(['perfectus', 'purity', 'transcendence', 'second-sight', 'enemies-flaw'].every((id) => has(c, id))).toBe(true);
    expect(c.virtues.find((v) => v.defId === 'enemies-flaw')?.size).toBe('Major');
  });

  it('a kabbalist stands beside another Social Status, as an Outsider among strangers', () => {
    const c = newCharacter('mythic', 's');
    c.gender = 'Male';
    applyMythicType(c, data, 'kabbalist');
    addVirtue(c, data, 'rabbi', 'Minor');
    const o = c.virtues.find((v) => v.defId === 'outsider-flaw');
    expect(o?.size).toBe('Major');
    expect(o?.param).toBe('Jew');
    const issues = validateCharacter(derive(c), data, rules);
    expect(issues.find((i) => i.id === 'status-many')?.severity).toBe('info');
    expect(holyMethodsOf(derive(c)).map((m) => m.id)).toEqual(['kabbalah']);
    expect(holyPowersOf(derive(c)).map((p) => p.id).sort()).toEqual(['blessing', 'wonders']);
  });

  it('a Nephilim has Great Stamina and Great Strength, and Strong Angelic Heritage once', () => {
    const c = newCharacter('mythic', 's');
    applyMythicType(c, data, 'nephilim');
    expect(c.virtues.filter((v) => v.defId === 'strong-angelic-heritage')).toHaveLength(1);
    expect(c.virtues.filter((v) => v.defId === 'great-characteristic').map((v) => v.param).sort()).toEqual(['Sta', 'Str']);
    expect(validateCharacter(derive(c), data, rules).some((i) => i.id === 'mythic-free-minor')).toBe(false);
  });

  it('every type builds clean from Quick build, with its least Ability scores', () => {
    for (const id of Object.keys(MYTHIC_TYPES)) {
      const g = generateCharacter({ type: 'mythic', role: `mythic-${id}`, variety: 'focused', npc: false, seed: 5 }, { data, saga, rules });
      const errors = g.issues.filter((i) => i.severity === 'error');
      expect(errors, `${id}: ${errors.map((e) => e.message).join('; ')}`).toEqual([]);
      expect(validateCharacter(derive(g.c), data, rules).some((i) => i.id === 'mythic-min-abilities'), `${id} least scores`).toBe(false);
    }
  });

  it('a zahid from Quick build is of Muslim lands: an Arabic name’s homeland and tongue, not the saga’s', () => {
    const g = generateCharacter({ type: 'mythic', role: 'mythic-zahid', variety: 'focused', npc: false, seed: 2 }, { data, saga, rules });
    expect(g.c.society).toBe('Islamic');
    expect(g.c.abilities.find((a) => a.native)?.param).toBe(nativeLanguageFor(g.c.nationality));
    expect(g.c.abilities.find((a) => a.native)?.param).not.toBe('German');
  });
});

describe('the guided build and the Divine', () => {
  it('rules out Flaws at odds with a living faith for a Faithful character, and keeps them for others', () => {
    const c = newCharacter('companion', 's');
    const faithful = shortlist(evaluate({ answers: {}, declined: [] }, ctxOf(c, ['faith'])), 'flaw').map((s) => s.def.id);
    expect(IMPIOUS.filter((id) => faithful.includes(id))).toEqual([]);
    expect(faithful).toContain('pious-flaw');
    // a story about the Church without a faith of one's own: the Flaws are still story hooks
    const churchy = shortlist(evaluate({ answers: { 'g-church': 10 }, declined: [] }, ctxOf(c)), 'flaw').map((s) => s.def.id);
    expect(churchy).toContain('unbaptized-flaw');
  });

  it('builds a Faithful companion with no impious Flaw', () => {
    const c = newCharacter('companion', 's');
    c.creation.archetypes = ['faith'];
    autoBuild(c, { answers: {}, declined: [] }, { data, rules, saga, archetypes: ['faith'] });
    expect(IMPIOUS.filter((id) => has(c, id))).toEqual([]);
    expect(validateCharacter(derive(c), data, rules).filter((i) => i.severity === 'error')).toEqual([]);
  });

  it('asked for holy powers, takes a Method and a Power it calls, and raises both', () => {
    for (const type of ['companion', 'mythic', 'magus'] as const) {
      const c = newCharacter(type, 's');
      c.creation.archetypes = ['faith'];
      autoBuild(c, { answers: { 'f-divine-powers': 10 }, declined: [] }, { data, rules, saga, archetypes: ['faith'] });
      const d = derive(c);
      expect(worksHolyEffects(d), `${type} works holy effects`).toBe(true);
      expect(holyMethodsOf(d)[0].score, `${type} Method raised`).toBeGreaterThan(1);
      expect(validateCharacter(d, data, rules).filter((i) => i.severity === 'error').map((i) => i.message), type).toEqual([]);
    }
  });

  it('does not take holy powers unasked, nor for a grog', () => {
    const c = newCharacter('companion', 's');
    autoBuild(c, { answers: {}, declined: [] }, { data, rules, saga, archetypes: ['faith'] });
    expect(holyMethodsOf(derive(c))).toEqual([]);
    const g = newCharacter('grog', 's');
    autoBuild(g, { answers: { 'f-divine': 10, 'f-divine-powers': 10 }, declined: [] }, { data, rules, saga, archetypes: ['faith'] });
    expect(holyMethodsOf(derive(g))).toEqual([]);
  });

  it('a holy Mythic Companion is one of the Divine’s own types, by the character’s faith', () => {
    const type = (society: string) => {
      const c = newCharacter('mythic', 's');
      c.society = society;
      autoBuild(c, { answers: { 'f-divine-powers': 9 }, declined: [] }, { data, rules, saga, archetypes: ['faith'] });
      return c.virtues.find((v) => v.freeReason === 'Mythic Companion')?.defId;
    };
    expect(type('Islamic')).toBe('zahid');
    expect(type('Jewish')).toBe('kabbalist');
    expect(['perfectus', 'nephilim']).toContain(type('Western Christendom'));
  });
});

describe('rules that came up on the way', () => {
  it('Parma Magica cannot be learned without The Gift, whatever opens the Arcane Abilities', () => {
    const c = newCharacter('companion', 's');
    addVirtue(c, data, 'arcane-lore', 'Minor');
    const d = derive(c);
    expect(abilityAvailability(d, data, 'magic-lore').ok).toBe(true);
    expect(abilityAvailability(d, data, 'parma-magica').ok).toBe(false);
    for (const b of d.budgets) expect(canSpend(d, data, b, { abilityId: 'parma-magica' }).ok, b.label).toBe(false);
  });

  it('a homeland names its tongue', () => {
    expect(nativeLanguageFor('Syrian')).toBe('Arabic');
    expect(nativeLanguageFor('Welsh')).toBe('Welsh');
    expect(nativeLanguageFor('Rhinelander')).toBe('German');
    expect(nativeLanguageFor('Elsewhere')).toBeUndefined();
  });
});
