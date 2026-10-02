// Rules raised in playtesting: post-Gauntlet xp, aging before play, Ability availability, Holy
// Magic, Magic Resistance sources, Heroic Personality, powers, Mystery Virtues, Magian Lineage.

import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { DEFAULT_HOUSE_RULES, type Character } from './types';
import { addVirtue, ensureAbility, newCharacter, removeVirtue, setHouse, syncImpliedVirtues } from './character/factory';
import { deriveCharacter, postGauntletXp } from './character/derive';
import { validateCharacter } from './character/validate';
import { abilityAvailability, vfAvailability } from './character/restrictions';
import { POWER_KINDS, powerSpending, powerStats } from './character/powers';
import { ageYears, computeStudy, magianLinkedGains, twilightEffects, twilightTriggered, warpingScoreWith } from './longterm';
import { castingScore, conditionalBonuses, labTotal, magicResistance } from './magic';
import { migrateCharacter } from '../store/migrate';

const data = buildGameData();
const rules = DEFAULT_HOUSE_RULES;
const derive = (c: Character) => deriveCharacter(c, data, rules);
const codes = (c: Character) => validateCharacter(derive(c), data, rules).map((i) => i.code);

function magus(house = 'tremere') {
  const c = newCharacter('magus', 's1');
  c.name = 'Test';
  setHouse(c, data, house, 0);
  return c;
}

describe('post-Gauntlet experience (DE p.50)', () => {
  it('costs lab seasons from whole years, never below 0 a year', () => {
    // 22 years, 67 lab seasons: 16 years all in the lab, one year with 3 lab seasons, 5 years of study
    const r = postGauntletXp(22, 67, 30, 10);
    expect(r.total).toBe(150);
    expect(r.fullLabYears).toBe(16);
    expect(r.studyYears).toBe(5);
    expect(postGauntletXp(5, 0, 30, 10).total).toBe(150);
    expect(postGauntletXp(2, 8, 30, 10).total).toBe(0);
    expect(postGauntletXp(3, 2, 30, 10).total).toBe(70);
  });
  it('gives the budget on the character', () => {
    const c = magus();
    c.creation.yearsPostGauntlet = 22;
    c.creation.postGauntletLabSeasons = 67;
    c.age += 22;
    expect(derive(c).budgets.find((b) => b.id === 'postGauntlet')?.total).toBe(150);
  });
});

describe('aging before play (DE p.50)', () => {
  it('rolls each year from 35, lowers Characteristics without changing their creation cost', () => {
    const c = magus();
    c.age = 40;
    c.characteristics.Qik = 1;
    const before = derive(c).charPointsSpent;
    expect(codes(c)).toContain('aging');
    // every die a 8: roll 8 + 4 (age/10) - 1 (Living Conditions) = 11: one Aging Point in any Characteristic
    const r = ageYears(c, 35, 39, { livingConditions: 1, longevity: 0, extra: 0, anyChar: 'Qik', renewLongevity: true }, () => 0.85);
    expect(r.died).toBeUndefined();
    expect(r.years).toHaveLength(5);
    expect(c.creation.agedThrough).toBe(39);
    expect(c.characteristics.Qik).toBeLessThan(1);
    expect(c.agingLoss?.Qik).toBeGreaterThan(0);
    expect(derive(c).charPointsSpent).toBe(before);
    expect(codes(c)).not.toContain('aging');
  });
});

describe('which Abilities a character can learn', () => {
  it('keeps House Abilities to their House', () => {
    const verd = derive(magus('verditius'));
    expect(abilityAvailability(verd, data, 'heartbeast').ok).toBe(false);
    expect(abilityAvailability(verd, data, 'enigmatic-wisdom').ok).toBe(false);
    expect(abilityAvailability(verd, data, 'faerie-magic').ok).toBe(false);
    expect(abilityAvailability(verd, data, 'magic-lore').ok).toBe(true);
    expect(abilityAvailability(verd, data, 'mystery-cult-lore').ok).toBe(true); // a Mystery House
    expect(abilityAvailability(derive(magus('criamon')), data, 'enigmatic-wisdom').ok).toBe(true);
    expect(abilityAvailability(derive(magus('tremere')), data, 'mystery-cult-lore').ok).toBe(false);
  });
  it('flags an Ability the character cannot have', () => {
    const c = magus('verditius');
    ensureAbility(c, 'heartbeast', { apprenticeship: 5 });
    expect(codes(c)).toContain('ability-unavailable');
  });
});

describe('Holy Magic (RoP:D)', () => {
  it('replaces Magic Theory in the lab and gives the hedge wizard Reputation', () => {
    const c = magus();
    addVirtue(c, data, 'holy-magic', 'Major');
    const d = derive(c);
    expect(d.theoryAbility).toBe('holy-magic');
    expect(d.abilities.some((a) => a.abilityId === 'holy-magic' && a.score >= 1)).toBe(true);
    expect(d.reputations.some((r) => /hedge wizard/i.test(r.text) && r.score === 3)).toBe(true);
    const lt = labTotal(d, { technique: 'Cr', form: 'Ig' }, { activity: 'spells', aura: { realm: 'Magic', strength: 3 } });
    expect(lt.parts.some((p) => /Holy Magic/.test(p.label))).toBe(true);
    ensureAbility(c, 'magic-theory', { apprenticeship: 15 });
    expect(codes(c)).toContain('mt-with-holy');
  });
});

describe('Magic Resistance (DE p.55, p.419)', () => {
  it('uses the highest source instead of adding them', () => {
    const c = newCharacter('companion', 's1');
    addVirtue(c, data, 'true-faith', 'Major');
    addVirtue(c, data, 'powerful-relic', 'Major');
    const d = derive(c);
    expect(d.trueFaith).toBe(1);
    expect(d.relicFaith).toBe(3);
    expect(magicResistance(d, 'Co').total).toBe(30);
  });
});

describe('Heroic Personality (HoH:TL)', () => {
  it('gives Confidence 2 with 5 points and traits up to ±5', () => {
    const c = newCharacter('companion', 's1');
    addVirtue(c, data, 'heroic-personality-flaw', 'Major');
    const d = derive(c);
    expect(d.confidence).toEqual({ score: 2, points: 5 });
    expect(d.personalityMax).toBe(5);
  });
  it('lets the player set Confidence by hand during creation', () => {
    const c = newCharacter('companion', 's1');
    c.confidence = { score: 3, points: 4 };
    c.creation.confidenceSet = true;
    expect(derive(c).confidence).toEqual({ score: 3, points: 4 });
  });
});

describe('supernatural powers (DE, HoH:TL)', () => {
  it('budgets levels per Virtue taken and checks them', () => {
    const c = newCharacter('companion', 's1');
    addVirtue(c, data, 'greater-power', 'Major');
    addVirtue(c, data, 'heroes-birthright', 'Minor');
    addVirtue(c, data, 'heroes-birthright', 'Minor');
    const d = derive(c);
    expect(d.powerBudgets.greater).toBe(50);
    expect(d.powerBudgets.birthright).toBe(30);
    c.powers = [
      { uid: 'p1', name: 'Pilum', kind: 'greater', level: 45, penetration: 10 },
      { uid: 'p2', name: 'Gift', kind: 'birthright', level: 35, penetration: 0 },
    ];
    expect(powerSpending(c.powers)).toEqual({ greater: 55, birthright: 35 });
    const cs = codes(c);
    expect(cs).toContain('powers-over');
    expect(cs).toContain('power-level');
    expect(POWER_KINDS.birthright.maxLevel).toBe(30);
  });
  it('works out Initiative, Fatigue and Confidence', () => {
    expect(powerStats({ uid: 'a', name: '', kind: 'greater', level: 50, penetration: 0 }, 2)).toEqual({ magnitude: 10, init: -3, fatigue: 1, confidence: 0 });
    expect(powerStats({ uid: 'a', name: '', kind: 'lesser', level: 25, penetration: 0 }, 2)).toEqual({ magnitude: 5, init: -8, fatigue: 1, confidence: 0 });
    expect(powerStats({ uid: 'a', name: '', kind: 'ritual', level: 30, penetration: 0 }, 0)).toEqual({ magnitude: 6, init: -12, fatigue: 2, confidence: 6 });
  });
});

describe('laboratory Virtues and Flaws filed as character ones', () => {
  it('moves Hell Portal and Volcanic Spirit Forge to the lab list', () => {
    expect(data.vfById.has('hell-portal-flaw')).toBe(false);
    expect(data.labVFById.get('hell-portal')?.mods.characteristics).toEqual({ Safety: -2, Warping: 2 });
    expect(data.labVFById.get('volcanic-spirit-forge')?.kind).toBe('virtue');
  });
});

describe('Mystery Virtues (TMRE, Cabal Legacy)', () => {
  it('needs Initiation or Cabal Legacy at creation', () => {
    const c = magus();
    addVirtue(c, data, 'hermetic-numerology', 'Minor');
    expect(codes(c)).toContain('mystery-init');
    addVirtue(c, data, 'cabal-legacy-flaw', 'Minor');
    expect(codes(c)).not.toContain('mystery-init');
  });
});

describe('Magian Lineage (DE)', () => {
  it('gives half the Source Quality to the other connected Abilities', () => {
    const c = magus();
    addVirtue(c, data, 'magian-lineage', 'Major', 'magic-lore,faerie-lore,dominion-lore');
    const lore = ensureAbility(c, 'magic-lore', { apprenticeship: 5 });
    const d = derive(c);
    const src = { kind: 'summa' as const, quality: 9, level: 5, isArt: false, subject: 'Magic Lore' };
    const res = computeStudy(d, src, { abilityUid: lore.uid });
    const linked = magianLinkedGains(d, data, src, lore.uid, res.advancementTotal);
    expect(linked.map((l) => [l.abilityId, l.xp])).toEqual([
      ['faerie-lore', 5],
      ['dominion-lore', 5],
    ]);
    expect(magianLinkedGains(d, data, { kind: 'exposure', subject: '' }, lore.uid, 2)).toEqual([]);
  });
  it('asks for three Abilities with the Major Virtue', () => {
    const c = magus();
    addVirtue(c, data, 'magian-lineage', 'Major', 'magic-lore');
    expect(codes(c)).toContain('magian-three');
  });
});

describe('gender', () => {
  it('normalizes typed values to the two the rules use', () => {
    const c = newCharacter('companion', 's1');
    expect(migrateCharacter({ ...c, gender: 'f' }).gender).toBe('Female');
    expect(migrateCharacter({ ...c, gender: 'man' }).gender).toBe('Male');
  });
});

describe('Magical Focus (DE)', () => {
  it('allows only one Magical Focus, whatever its source', () => {
    const c = magus('tremere'); // Minor Magical Focus (Certamen) from the House
    expect(codes(c)).not.toContain('one-focus');
    addVirtue(c, data, 'minor-magical-focus', 'Minor', 'healing');
    expect(codes(c)).toContain('one-focus');
  });
});

describe('one-click conditional bonuses (playtest)', () => {
  it('adds Life Boost per Fatigue level, a similar spell for Spell Improvisation, chosen circumstances and other modifiers', () => {
    const c = magus();
    addVirtue(c, data, 'life-boost', 'Minor');
    addVirtue(c, data, 'spell-improvisation', 'Minor');
    addVirtue(c, data, 'special-circumstances', 'Minor', 'storms');
    const d = derive(c);
    const base = castingScore(d, { technique: 'Cr', form: 'Ig' }, { kind: 'formulaic' }).total;
    expect(castingScore(d, { technique: 'Cr', form: 'Ig' }, { kind: 'formulaic', lifeBoost: 2 }).total).toBe(base + 10);
    expect(castingScore(d, { technique: 'Cr', form: 'Ig' }, { kind: 'spontaneous', lifeBoost: 2 }).total).toBe(base);
    expect(castingScore(d, { technique: 'Cr', form: 'Ig' }, { kind: 'spontaneous', similarSpell: { name: 'Pilum', magnitude: 4 } }).total).toBe(base + 4);
    const bonus = conditionalBonuses(d);
    expect(bonus).toHaveLength(1);
    expect(castingScore(d, { technique: 'Cr', form: 'Ig' }, { kind: 'formulaic', circumstance: [bonus[0].uid] }).total).toBe(base + 3);
    expect(castingScore(d, { technique: 'Cr', form: 'Ig' }, { kind: 'formulaic', circumstance: [] }).total).toBe(base);
    expect(castingScore(d, { technique: 'Cr', form: 'Ig' }, { kind: 'formulaic', other: -4 }).total).toBe(base - 4);
    expect(labTotal(d, { technique: 'Cr', form: 'Ig' }, { activity: 'spells', other: 2 }).total).toBe(labTotal(d, { technique: 'Cr', form: 'Ig' }, { activity: 'spells' }).total + 2);
  });
});

describe('Virtues and Flaws from the second playtest character', () => {
  it('allows only one Magical Focus between the Major and Minor versions', () => {
    const c = magus('criamon');
    addVirtue(c, data, 'minor-magical-focus', 'Minor', 'buffing');
    const d = derive(c);
    expect(vfAvailability(d, data, data.vfById.get('major-magical-focus')!)?.severity).toBe('error');
  });
  it('gives Mythic Characteristic a specialty and Unbearable to Beings its extra penalty', () => {
    const c = magus('criamon');
    addVirtue(c, data, 'mythic-characteristic', 'Minor', 'Int');
    c.virtues[c.virtues.length - 1].note = 'great knowledge';
    addVirtue(c, data, 'unbearable-to-beings-flaw', 'Minor', 'demons');
    const d = derive(c);
    expect(d.charSpecialties).toMatchObject([{ char: 'Int', text: 'great knowledge' }]);
    expect(d.socialPenalties).toMatchObject([{ vs: 'demons', amount: -3 }]);
  });
  it('checks for Twilight on one Warping Point with Twilight Prone, and uses the Warping Score after adding the points', () => {
    const c = magus('criamon');
    const plain = derive(c);
    expect(twilightTriggered(plain, 1)).toBe(false);
    expect(twilightTriggered(plain, 2)).toBe(true);
    addVirtue(c, data, 'twilight-prone-flaw', 'Major');
    expect(twilightTriggered(derive(c), 1)).toBe(true);
    c.warpingPoints = 13;
    expect(warpingScoreWith(derive(c), 2, false)).toBe(2); // 15 points: Warping Score 2
    expect(warpingScoreWith(derive(c), 2, true)).toBe(1);
    expect(twilightEffects(true, 8).find((e) => e.id === 'virtue')?.ok).toBe(true);
    expect(twilightEffects(false, 3).find((e) => e.id === 'flaw')?.ok).toBe(false);
  });
  it('gives a creature Magic Resistance from its Might, and adds Apt Student to teaching', () => {
    const pet = newCharacter('companion', 's1');
    pet.creature = { realm: 'Magic', might: 13, size: -3, kind: 'animal', intelligence: 'companion' };
    const d = derive(pet);
    expect(d.size).toBe(-3);
    expect(magicResistance(d, 'An').total).toBe(13);
    const c = magus();
    addVirtue(c, data, 'apt-student', 'Minor');
    const teach = computeStudy(derive(c), { kind: 'teacher', com: 1, teaching: 3, teacherScore: 10, students: 1, goodTeacher: false, isArt: true, subject: 'Creo' }, { art: 'Cr' });
    expect(teach.parts.some((p) => /Apt Student/.test(p.label) && p.value === 5)).toBe(true);
  });
});

describe('Virtues that give another Virtue free (playtest)', () => {
  const ids = (c: Character) => c.virtues.map((v) => v.defId);
  it('gives Magical Blood the Virtue or bonus of its kind of magic being, and follows a change of kind', () => {
    const c = newCharacter('companion', 's1');
    const mb = addVirtue(c, data, 'magical-blood', 'Minor');
    expect(ids(c)).toEqual(['magical-blood']);
    mb.param = 'Magic Spirit: Second Sight';
    syncImpliedVirtues(c, data);
    const ss = c.virtues.find((v) => v.defId === 'second-sight')!;
    expect(ss).toMatchObject({ free: true, grantedBy: mb.uid });
    expect(c.abilities.find((a) => a.abilityId === 'second-sight')?.xp.free).toBe(5);
    expect(derive(c).tally.virtuePoints).toBe(1);
    mb.param = 'Magic Human: Strength';
    expect(syncImpliedVirtues(c, data)).toEqual(['Second Sight went with it.']);
    expect(ids(c)).toEqual(['magical-blood']);
    expect(c.abilities.some((a) => a.abilityId === 'second-sight')).toBe(false);
    c.characteristics.Str = 3;
    const d = derive(c);
    expect(d.characteristics.Str.value).toBe(3);
    c.characteristics.Str = 1;
    expect(derive(c).characteristics.Str.value).toBe(2);
    expect(derive(c).reputations.some((r) => r.score === 3 && /bloodline/.test(r.scope))).toBe(true);
    mb.param = 'Magic Thing: Lesser Power';
    syncImpliedVirtues(c, data);
    expect(derive(c).powerBudgets.lesser).toBe(25);
  });
  it('makes a Virtue already bought free, and charges for it again when the giver goes', () => {
    const c = newCharacter('companion', 's1');
    addVirtue(c, data, 'second-sight', 'Minor');
    expect(derive(c).tally.virtuePoints).toBe(1);
    const sfb = addVirtue(c, data, 'strong-faerie-blood', 'Major');
    expect(c.virtues.filter((v) => v.defId === 'second-sight')).toHaveLength(1);
    expect(derive(c).tally.virtuePoints).toBe(3);
    removeVirtue(c, data, sfb.uid);
    const ss = c.virtues.find((v) => v.defId === 'second-sight')!;
    expect([ss.free, ss.grantedBy]).toEqual([undefined, undefined]);
    expect(derive(c).tally.virtuePoints).toBe(1);
  });
  it('passes a free Virtue on when two Virtues give it', () => {
    const c = newCharacter('companion', 's1');
    const sfb = addVirtue(c, data, 'strong-faerie-blood', 'Major');
    const mb = addVirtue(c, data, 'magical-blood', 'Minor', 'Magic Spirit: Second Sight');
    expect(c.virtues.filter((v) => v.defId === 'second-sight')).toHaveLength(1);
    removeVirtue(c, data, sfb.uid);
    expect(c.virtues.find((v) => v.defId === 'second-sight')?.grantedBy).toBe(mb.uid);
  });
  it('adopts freebies saved before they were linked', () => {
    const c = newCharacter('companion', 's1');
    const sfb = addVirtue(c, data, 'strong-faerie-blood', 'Major');
    const ss = c.virtues.find((v) => v.defId === 'second-sight')!;
    delete ss.grantedBy;
    syncImpliedVirtues(c, data);
    expect(c.virtues.filter((v) => v.defId === 'second-sight')).toHaveLength(1);
    expect(ss.grantedBy).toBe(sfb.uid);
  });
});

describe('rules a Virtue or Flaw refers to (playtest)', () => {
  it('links the Virtues and Flaws it names and the book sections it cites', () => {
    const sfb = data.vfById.get('strong-faerie-blood')!;
    expect(sfb.refs?.map((r) => r.vf)).toEqual(expect.arrayContaining(['second-sight', 'faerie-blood']));
    expect(sfb.refs?.find((r) => r.s)?.s).toBe('DE#opening-the-arts');
    const aura = data.vfById.get('commanding-aura')!.refs?.find((r) => r.s);
    expect(data.ruleSections[aura!.s!].title).toBe('Aura of Rightful Authority');
    expect(data.ruleSections['DE#opening-the-arts'].text).toMatch(/Supernatural Ability/);
    // every link resolves
    for (const v of data.virtuesFlaws) {
      for (const r of v.refs ?? []) {
        if (r.vf) expect(data.vfById.has(r.vf) || r.vf === v.id).toBe(true);
        if (r.s) expect(data.ruleSections[r.s]).toBeTruthy();
      }
    }
  });
});
