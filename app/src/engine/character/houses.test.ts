// The Houses of Hermes at character creation: what each House gives, the Ex Miscellanea traditions
// of the books with what they require, and builds that keep one House's Mysteries out of another's.

import { describe, expect, it } from 'vitest';
import { buildGameData } from '../../data';
import { EX_MISC_TRADITIONS, HOUSES, HOUSE_BY_ID } from '../../data/houses';
import { DEFAULT_HOUSE_RULES, type Character, type Saga } from '../types';
import { generateCharacter } from '../generate/character';
import { addVirtue, applyExMiscTradition, newCharacter, setHouse } from './factory';
import { deriveCharacter } from './derive';
import { validateCharacter } from './validate';
import { fixesFor } from './fixes';
import { certamenTotals } from '../magic';

const data = buildGameData();
const rules = DEFAULT_HOUSE_RULES;
const saga = { id: 's', name: 'S', currentYear: 1220, currentSeason: 'Spring', tribunal: 'Rhine', enabledBooks: [], houseRules: rules, mechanicsOverrides: {}, custom: { virtuesFlaws: [], abilities: [], spells: [] } } as unknown as Saga;
const derive = (c: Character) => deriveCharacter(c, data, rules);
const issues = (c: Character) => validateCharacter(derive(c), data, rules);
const has = (c: Character, id: string, param?: string) => c.virtues.some((v) => v.defId === id && (param === undefined || v.param === param));
const magus = (house: string) => {
  const c = newCharacter('magus', 's');
  setHouse(c, data, house, 0);
  return c;
};

describe('the House benefit', () => {
  it('every House with a set benefit gives its Virtue free, and its data names real Virtues', () => {
    for (const h of HOUSES) {
      for (const o of h.benefitOptions) expect(data.vfById.get(o.virtueId), `${h.name}: ${o.virtueId}`).toBeTruthy();
      if (!h.benefitOptions.length) continue;
      const c = magus(h.id);
      const free = c.virtues.find((v) => v.freeReason === 'House Virtue');
      expect(free?.defId, h.name).toBe(h.benefitOptions[0].virtueId);
      expect(issues(c).some((i) => i.id === 'house-virtue'), h.name).toBe(false);
    }
  });

  it('the Mystery Houses start with their Ability at 1, a Tytalus with more Confidence, a Guernicus with a name in the Order', () => {
    const score = (c: Character, id: string) => derive(c).abilities.find((a) => a.abilityId === id)?.score;
    expect(score(magus('bjornaer'), 'heartbeast')).toBe(1);
    expect(score(magus('criamon'), 'enigmatic-wisdom')).toBe(1);
    expect(score(magus('merinita'), 'faerie-magic')).toBe(1);
    expect(derive(magus('tytalus')).confidence).toMatchObject({ score: 2, points: 5 });
    expect(derive(magus('guernicus')).reputations.some((r) => r.score === 4 && /Hermetic Prestige/.test(r.text))).toBe(true);
    // a Merinita without faerie blood carries the Warping Point of the Initiation
    expect(magus('merinita').warpingPoints).toBe(1);
  });

  it("a Tremere's focus in certamen doubles the lower Art in the duel, and is no focus for spells", () => {
    const c = magus('tremere');
    c.arts.Re.laterLife = 55; // 10
    c.arts.Me.laterLife = 15; // 5
    const d = derive(c);
    // not offered where spells are cast or designed
    expect(d.magicalFocus).toBe('none');
    const t = certamenTotals(d, 'Re', 'Me');
    expect(t.attack.form.total - d.characteristics.Pre.value).toBe(10);
    expect(t.attack.technique.total - d.characteristics.Pre.value).toBe(10);
    // another magus's focus still is one, and does nothing in certamen
    const f = magus('flambeau');
    f.arts.Re.laterLife = 55;
    f.arts.Me.laterLife = 15;
    addVirtue(f, data, 'minor-magical-focus', 'Minor', 'fire');
    const df = derive(f);
    expect(df.magicalFocus).toBe('minor');
    expect(certamenTotals(df, 'Re', 'Me').attack.form.total - df.characteristics.Pre.value).toBe(5);
  });

  it('a Bjornaer is asked for the heartbeast until one is chosen', () => {
    const c = magus('bjornaer');
    const ask = issues(c).find((i) => i.id === 'bjornaer-heartbeast');
    expect(ask?.severity).toBe('info');
    expect(fixesFor(ask!, derive(c), data, rules).length).toBeGreaterThan(0);
    c.heartbeast = 'wolf';
    expect(issues(c).some((i) => i.id === 'bjornaer-heartbeast')).toBe(false);
    expect(issues(magus('tremere')).some((i) => i.id === 'bjornaer-heartbeast')).toBe(false);
  });

  it("a Jerbiton's free Virtue comes from the books' list, and one tied to an Ability takes an Ability of the theme", () => {
    const h = HOUSE_BY_ID.jerbiton;
    const known = h.freeChoiceFrom!.filter((id) => data.vfById.get(id));
    // the Societates list is there: scholarship, art and dealing with people
    for (const id of ['apt-student', 'educated', 'free-expression', 'gossip', 'piercing-gaze', 'puissant-ability', 'venus-blessing', 'well-traveled']) expect(known, id).toContain(id);
    for (const id of known) expect(data.vfById.get(id)!.sizes, id).toContain('Minor');
    for (const id of h.freeChoiceAbilities!) expect(data.abilityById.get(id), id).toBeTruthy();
    for (let seed = 1; seed <= 8; seed++) {
      const g = generateCharacter({ type: 'magus', house: 'jerbiton', variety: 'varied', npc: false, seed }, { data, saga, rules });
      const free = g.c.virtues.find((v) => v.freeReason === 'House Virtue');
      expect(free, `seed ${seed}`).toBeTruthy();
      expect(h.freeChoiceFrom, `seed ${seed}`).toContain(free!.defId);
      if (data.vfById.get(free!.defId)?.param?.kind === 'ability') expect(h.freeChoiceAbilities, `seed ${seed}: ${free!.param}`).toContain(free!.param);
    }
  }, 120_000);
});

describe('Ex Miscellanea traditions', () => {
  const traditions = EX_MISC_TRADITIONS.filter((t) => t.id !== 'custom');

  it("every tradition's three parts are in the data and make a whole package", () => {
    for (const t of traditions) {
      const c = magus('ex-miscellanea');
      applyExMiscTradition(c, data, t.id);
      const pkg = c.virtues.filter((v) => v.freeReason === 'Ex Miscellanea');
      expect(pkg.map((v) => v.defId).sort(), t.name).toEqual([t.majorNonHermetic, t.minorHermetic, t.majorHermeticFlaw].sort());
      // the compulsory Flaw pays for nothing
      expect(pkg.find((v) => v.defId === t.majorHermeticFlaw)?.noPoints, t.name).toBe(true);
      expect(issues(c).some((i) => i.id === 'exmisc-package'), t.name).toBe(false);
      // a Virtue that takes a choice has one (Affinity with Auram, not Affinity with nothing)
      for (const v of pkg) if (data.vfById.get(v.defId)?.param && !data.vfById.get(v.defId)!.param!.optional) expect(v.param, `${t.name}: ${v.defId}`).toBeTruthy();
    }
  });

  it('a Beast Master also has Animal Ken, a focus and Incompatible Arts, which go when the tradition does', () => {
    const c = magus('ex-miscellanea');
    applyExMiscTradition(c, data, 'beast-masters');
    expect(has(c, 'animal-ken') && has(c, 'minor-magical-focus') && has(c, 'incompatible-arts-flaw')).toBe(true);
    // required, but paid for as usual
    expect(c.virtues.find((v) => v.defId === 'animal-ken')?.free).toBeFalsy();
    applyExMiscTradition(c, data, 'tempestaria');
    expect(has(c, 'animal-ken') || has(c, 'incompatible-arts-flaw') || has(c, 'summon-animals')).toBe(false);
    expect(has(c, 'affinity-with-art', 'Au')).toBe(true);
  });

  it('a Karaite holds Holy Magic as the Major Virtue and is an Outsider (Major)', () => {
    const c = magus('ex-miscellanea');
    applyExMiscTradition(c, data, 'karaites');
    expect(has(c, 'holy-magic') && has(c, 'craft-amulets') && has(c, 'karaite-magic-flaw')).toBe(true);
    expect(c.virtues.find((v) => v.defId === 'outsider-flaw')).toMatchObject({ size: 'Major', param: 'Jew' });
    expect(issues(c).filter((i) => i.severity === 'error' && i.step === 'house')).toEqual([]);
  });

  it("a tradition of the player's own design still wants its three parts", () => {
    const c = magus('ex-miscellanea');
    applyExMiscTradition(c, data, 'custom');
    expect(issues(c).some((i) => i.id === 'exmisc-package')).toBe(true);
  });
});

describe("one House's Mysteries stay out of another's builds", () => {
  it('no magus but a Bjornaer is built with a Virtue for the Heartbeast Ability, and a Bjornaer has a heartbeast', () => {
    for (const h of HOUSES) {
      const g = generateCharacter({ type: 'magus', house: h.id, variety: 'varied', npc: false, seed: 2 }, { data, saga, rules });
      const d = derive(g.c);
      if (h.id === 'bjornaer') expect(g.c.heartbeast, h.name).toBeTruthy();
      else {
        expect(g.c.virtues.some((v) => v.param === 'heartbeast'), h.name).toBe(false);
        expect(g.c.heartbeast, h.name).toBeFalsy();
      }
      expect(validateCharacter(d, data, rules).filter((i) => i.id.startsWith('vf-ability-')), h.name).toEqual([]);
    }
  }, 240_000);

  it('a Virtue for an Ability the character cannot learn is flagged', () => {
    const c = magus('tremere');
    addVirtue(c, data, 'puissant-ability', 'Minor', 'heartbeast');
    expect(issues(c).some((i) => i.id.startsWith('vf-ability-') && /Heartbeast/.test(i.message))).toBe(true);
    const b = magus('bjornaer');
    addVirtue(b, data, 'puissant-ability', 'Minor', 'heartbeast');
    expect(issues(b).some((i) => i.id.startsWith('vf-ability-'))).toBe(false);
  });

  it('Holy Magic comes to a built magus only when holy power was asked for, and never two relics', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const g = generateCharacter({ type: 'magus', house: 'flambeau', variety: 'varied', npc: false, seed }, { data, saga, rules });
      const asked = (g.c.guided?.answers['f-divine-powers'] ?? 0) >= 5;
      if (!asked) expect(g.c.virtues.some((v) => v.defId === 'holy-magic'), `seed ${seed}`).toBe(false);
      expect(g.c.virtues.filter((v) => v.defId === 'relic' || v.defId === 'powerful-relic').length, `seed ${seed}`).toBeLessThanOrEqual(1);
    }
  }, 240_000);
});

describe('House options of the supplements', () => {
  const sagaWith = (options: Record<string, boolean>) => ({ ...saga, options }) as Saga;

  it("Flambeau's schools offer the school's Virtue only when the troupe uses the optional rule", () => {
    const h = HOUSE_BY_ID.flambeau;
    const schools = h.benefitOptions.filter((o) => o.rule === 'flambeauSchools');
    expect(schools.map((o) => o.virtueId)).toEqual(['warrior', 'minor-magical-focus', 'puissant-ability', 'cautious-with-ability']);
    // taking one as the House Virtue: free, as the House's
    const c = newCharacter('magus', 's');
    setHouse(c, data, 'flambeau', h.benefitOptions.findIndex((o) => o.virtueId === 'warrior'));
    expect(c.virtues.find((v) => v.freeReason === 'House Virtue')?.defId).toBe('warrior');
    expect(issues(c).some((i) => i.id === 'house-virtue')).toBe(false);
    // the builder keeps to Puissant Perdo or Ignem unless the rule is on
    for (const seed of [1, 2, 3]) {
      const off = generateCharacter({ type: 'magus', house: 'flambeau', variety: 'varied', npc: false, seed }, { data, saga, rules });
      expect(off.c.virtues.find((v) => v.freeReason === 'House Virtue')?.defId).toBe('puissant-art');
    }
    const warrior = generateCharacter({ type: 'magus', house: 'flambeau', variety: 'focused', npc: false, seed: 4, answers: { 'h-combat': 10, 'h-weapons': 10 } } as never, { data, saga: sagaWith({ flambeauSchools: true }), rules });
    expect(['puissant-art', 'warrior', 'minor-magical-focus', 'puissant-ability', 'cautious-with-ability']).toContain(warrior.c.virtues.find((v) => v.freeReason === 'House Virtue')?.defId);
  }, 120_000);

  it('the Seirenes, the Cult of Orpheus and the Witches of Thessaly apply whole, the Seirenes to women only', () => {
    for (const id of ['seirenes', 'orpheus', 'thessaly']) {
      const c = magus('ex-miscellanea');
      c.gender = 'Female';
      applyExMiscTradition(c, data, id);
      expect(issues(c).filter((i) => i.step === 'house' && i.severity !== 'info'), id).toEqual([]);
    }
    const m = magus('ex-miscellanea');
    m.gender = 'Male';
    applyExMiscTradition(m, data, 'seirenes');
    expect(issues(m).some((i) => i.id === 'exmisc-women')).toBe(true);
    expect(derive(m).abilities.find((a) => a.abilityId === 'siren-song')?.score).toBe(1);
  });

  it('a Seirene may not have Quiet Magic, and her Music limits her Siren Song', () => {
    const c = magus('ex-miscellanea');
    c.gender = 'Female';
    applyExMiscTradition(c, data, 'seirenes');
    expect(issues(c).some((i) => i.id === 'siren-song-music')).toBe(true);
    c.abilities.push({ uid: 'mu', abilityId: 'music', xp: { apprenticeship: 5 } } as never);
    expect(issues(c).some((i) => i.id === 'siren-song-music')).toBe(false);
    addVirtue(c, data, 'quiet-magic', 'Minor');
    expect(issues(c).some((i) => i.id === 'exmisc-forbids-quiet-magic')).toBe(true);
    // the builder gives her Music and no Quiet Magic
    for (const seed of [1, 2, 3]) {
      const g = generateCharacter({ type: 'magus', house: 'ex-miscellanea', gender: 'Female', variety: 'varied', npc: false, seed, answers: { 'vf:siren-song': 10, 'h-performance': 10 } } as never, { data, saga: { ...saga, enabledBooks: ['HoH_S'] } as Saga, rules });
      if (g.c.creation.exMiscTradition !== 'seirenes') continue;
      expect(g.c.virtues.some((v) => v.defId === 'quiet-magic'), `#${seed}`).toBe(false);
      expect(derive(g.c).abilities.find((a) => a.abilityId === 'music')?.score ?? 0, `#${seed}`).toBeGreaterThanOrEqual(1);
    }
  }, 120_000);

  it("a Witch of Thessaly's Summoning is an Art: it opens at 0 and rises on the Art table", () => {
    const c = magus('ex-miscellanea');
    applyExMiscTradition(c, data, 'thessaly');
    const art = () => derive(c).abilities.find((a) => a.abilityId === 'goetic-summoning');
    expect(art()?.score).toBe(0);
    const ab = c.abilities.find((a) => a.abilityId === 'goetic-summoning')!;
    ab.xp.postGauntlet = 6; // 1 + 2 + 3
    expect(art()?.score).toBe(3);
    ab.xp.postGauntlet = 9;
    expect([art()?.score, art()?.remainder]).toEqual([3, 3]);
  });
});

