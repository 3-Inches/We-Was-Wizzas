// Building holy characters (Realms of Power: The Divine): the Mythic Companion types the book gives,
// the guided build's Holy Method and Power taken as a pair that works, and no Flaw at odds with a
// living faith beside it.

import { describe, expect, it } from 'vitest';
import { buildGameData } from '../../data';
import { nativeLanguageFor } from '../../data/lists';
import { MYTHIC_TYPES } from '../../data/mythic';
import { DEFAULT_HOUSE_RULES, type Character, type Saga } from '../types';
import { migrateCharacter } from '../../store/migrate';
import { addVirtue, applyMythicType, newCharacter } from '../character/factory';
import { canSpend, deriveCharacter } from '../character/derive';
import { abilityAvailability } from '../character/restrictions';
import { validateCharacter } from '../character/validate';
import { generateCharacter } from '../generate/character';
import { holyMethodsOf, holyPowersOf, suitedTradition, traditionsFor, worksHolyEffects } from '../holy';
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

  it('takes the Method and Power asked for by name, as the Divine tutorial’s practice character does', () => {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const g = generateCharacter(
        { type: 'companion', role: 'holy-worker', answers: { 'f-divine-powers': 10, 'vf:invocation': 10, 'vf:blessing-power': 10, 'vf:true-faith': 10 }, variety: 'focused', npc: false, seed },
        { data, saga, rules },
      );
      expect(has(g.c, 'invocation') && has(g.c, 'blessing-power'), `seed ${seed}: ${g.c.virtues.map((v) => v.defId).join(', ')}`).toBe(true);
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

describe('a Virtue printed in several books', () => {
  it('is open to a saga that uses any one of them: Ceremony with The Divine and without Realms of Power: Faerie', () => {
    const divine = buildGameData({ enabledBooks: ['DE', 'RoP_D'] });
    const ceremony = divine.vfById.get('ceremony')!;
    expect(ceremony.source.book).not.toBe('RoP_D');
    expect(divine.isBookEnabled(ceremony.source.book)).toBe(false);
    expect(divine.inBooks(ceremony)).toBe(true);
    const c = newCharacter('companion', 's');
    addVirtue(c, divine, 'ceremony', 'Minor');
    const d = deriveCharacter(c, divine, rules);
    expect(validateCharacter(d, divine, rules).some((i) => i.id.startsWith('book-'))).toBe(false);
    // its text speaks of holy prayer, not only of the faerie chapter it was first quoted from
    expect(ceremony.text).toMatch(/holy prayer/);
    // and it is closed to a saga that uses none of them
    const core = buildGameData({ enabledBooks: ['DE'] });
    expect(core.inBooks(core.vfById.get('ceremony')!)).toBe(false);
  });
});

describe('small rules of the Divine and its relics', () => {
  it("a Nephilim's least score in Hebrew opens Hebrew, not every dead language", () => {
    const c = newCharacter('mythic', 's');
    applyMythicType(c, data, 'nephilim');
    const d = derive(c);
    expect(abilityAvailability(d, data, 'dead-language', 'Hebrew').ok).toBe(true);
    expect(abilityAvailability(d, data, 'dead-language', 'Latin').ok).toBe(false);
    const pool = d.budgets.find((b) => b.id === 'laterLife')!;
    expect(canSpend(d, data, pool, { abilityId: 'dead-language', param: 'Hebrew' }).ok).toBe(true);
    expect(canSpend(d, data, pool, { abilityId: 'dead-language', param: 'Latin' }).ok).toBe(false);
    // with an education, every dead language is open as usual
    addVirtue(c, data, 'educated', 'Minor');
    expect(canSpend(derive(c), data, pool, { abilityId: 'dead-language', param: 'Latin' }).ok).toBe(true);
  });

  it('Rabbinic Law is one Ability, printed in the core book and The Divine, and old sheets are moved over', () => {
    expect(data.abilityById.get('rabbinical-law')).toBeUndefined();
    const law = data.abilityById.get('rabbinic-law')!;
    expect(law.source.book).toBe('DE');
    expect(law.alsoIn?.some((s) => s.book === 'RoP_D')).toBe(true);
    const old = newCharacter('mythic', 's');
    old.abilities.push({ uid: 'x', abilityId: 'rabbinical-law', xp: { laterLife: 5 } } as never);
    expect(migrateCharacter(old).abilities.find((a) => a.uid === 'x')?.abilityId).toBe('rabbinic-law');
    // the kabbalist's least score names the one Ability
    expect(Object.keys(MYTHIC_TYPES.kabbalist.minAbilities)).toContain('rabbinic-law');
  });

  it('two relics are flagged, since only one helps at a time', () => {
    const c = newCharacter('companion', 's');
    addVirtue(c, data, 'relic', 'Minor');
    expect(validateCharacter(derive(c), data, rules).some((i) => i.id === 'two-relics')).toBe(false);
    addVirtue(c, data, 'powerful-relic', 'Major');
    const issue = validateCharacter(derive(c), data, rules).find((i) => i.id === 'two-relics');
    expect(issue?.severity).toBe('warning');
  });
});

describe('the holy tradition', () => {
  it('a built holy character belongs to the tradition whose favored Abilities they have, of their faith', () => {
    const g = generateCharacter({ type: 'mythic', role: 'mythic-zahid', variety: 'focused', npc: false, seed: 3 } as never, { data, saga, rules });
    expect(g.c.holy?.tradition).toBe('sufis');
    const k = generateCharacter({ type: 'mythic', role: 'mythic-kabbalist', variety: 'focused', npc: false, seed: 3 } as never, { data, saga, rules });
    expect(['kabbalists', 'baal-shem']).toContain(k.c.holy?.tradition);
  }, 120_000);

  it("offers only the traditions of the character's faith, and a Holy Societas to the unGifted too", () => {
    const c = newCharacter('companion', 's');
    c.society = 'Islamic';
    expect(traditionsFor(c).every((t) => !t.faith || t.faith === 'Muslim')).toBe(true);
    // "can also accept unGifted characters like any holy tradition" (RoP: The Divine, Holy Societates)
    expect(traditionsFor(c).some((t) => t.societas)).toBe(true);
    // the faith is the character's own before the society's: a Jew in a Christian land, and mixed Iberia names none
    const j = newCharacter('companion', 's');
    j.society = 'Western Christendom';
    expect(traditionsFor(j).some((t) => t.id === 'kabbalists')).toBe(false);
    addVirtue(j, data, 'outsider-flaw', 'Major', 'Jew');
    expect(traditionsFor(j).some((t) => t.id === 'kabbalists')).toBe(true);
    expect(traditionsFor(j).some((t) => t.id === 'cantores')).toBe(false);
    const i = newCharacter('companion', 's');
    i.society = 'Iberia';
    expect(['sufis', 'kabbalists', 'cantores'].every((id) => traditionsFor(i).some((t) => t.id === id))).toBe(true);
    addVirtue(c, data, 'meditation', 'Major');
    addVirtue(c, data, 'understanding', 'Major');
    expect(suitedTradition(c)?.id).toBe('sufis');
  });

  it('gives no tradition to a character with no faith behind their Second Sight, Premonitions or music', () => {
    // these favored Abilities are ordinary Virtues: alone they make nobody an Ascetic or a Cantor
    const c = newCharacter('companion', 's');
    c.society = 'Western Christendom';
    addVirtue(c, data, 'second-sight', 'Minor');
    addVirtue(c, data, 'premonitions', 'Minor');
    addVirtue(c, data, 'enchanting-ability', 'Major', 'Music');
    expect(suitedTradition(c)).toBeUndefined();
    // with a Holy Power beside them, the tradition that favors both
    addVirtue(c, data, 'purity', 'Major');
    expect(suitedTradition(c)?.id).toBe('ascetics');
    // and the builders give one only to a holy character
    for (const type of ['companion', 'grog', 'magus'] as const) {
      for (let seed = 1; seed <= 12; seed++) {
        const g = generateCharacter({ type, variety: 'varied', npc: true, seed }, { data, saga, rules });
        const d = derive(g.c);
        if (!(d.trueFaith > 0 || holyMethodsOf(d).length || holyPowersOf(d).length || g.c.virtues.some((v) => v.defId === 'holy-magic'))) expect(g.c.holy?.tradition, `${type} #${seed}`).toBeUndefined();
      }
    }
  }, 240_000);
});
