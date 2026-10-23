// Rules raised in playtesting: post-Gauntlet xp, aging before play, Ability availability, Holy
// Magic, Magic Resistance sources, Heroic Personality, powers, Mystery Virtues, Magian Lineage.

import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { DEFAULT_HOUSE_RULES, type Character } from './types';
import { addQualities, addVirtue, ensureAbility, newCharacter, removeQualities, removeVirtue, setHouse, setMasteryXp, syncImpliedVirtues } from './character/factory';
import { deriveCharacter, postGauntletXp } from './character/derive';
import { validateCharacter } from './character/validate';
import { abilityAvailability, statusesCompatible, vfAvailability } from './character/restrictions';
import { POWER_KINDS, masteryPools, powerSpending, powerStats } from './character/powers';
import { ageYears, computeStudy, magianLinkedGains, twilightEffects, twilightSizes, twilightTriggered, warpingScoreWith } from './longterm';
import { castingScore, conditionalBonuses, labTotal, magicResistance } from './magic';
import { migrateCharacter } from '../store/migrate';
import { CROSS_REF_MECHANICS } from '../data/crossRefs';
import { planBook } from './books';
import { fixesFor } from './character/fixes';

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

describe('mechanics from the rules a Virtue or Flaw refers to (playtest)', () => {
  it('names only Virtues and Flaws that exist', () => {
    for (const [id, m] of Object.entries(CROSS_REF_MECHANICS)) {
      expect(data.vfById.has(id), id).toBe(true);
      const effs = [...(m.effects ?? []), ...Object.values(m.paramEffects ?? {}).flat(), ...Object.values(m.sizeEffects ?? {}).flat()];
      const ids = [...effs.flatMap((e) => (e.type === 'implies' ? [e.virtue] : [])), ...(m.requires ?? []), ...(m.excludes ?? []), ...(m.needs ?? []).flatMap((n) => n.anyOf ?? [])];
      for (const x of ids) expect(data.vfById.has(x), `${id} -> ${x}`).toBe(true);
    }
  });
  it('gives what the text says it includes, by size and by choice', () => {
    const c = newCharacter('companion', 's1');
    addVirtue(c, data, 'templar-commander', 'Major');
    expect(c.virtues.filter((v) => v.free).map((v) => v.defId).sort()).toEqual(['brother-knight', 'temporal-influence']);
    const g = newCharacter('companion', 's1');
    addVirtue(g, data, 'of-kings-and-giants-antaeus-bloodline', 'Major');
    expect(g.virtues.filter((v) => v.grantedBy).map((v) => v.defId).sort()).toEqual(['greater-malediction-flaw', 'large', 'magic-sensitivity']);
    const dg = derive(g);
    expect(dg.size).toBe(1);
    expect(dg.agingStartAge).toBe(50);
    expect(dg.tally.flawPoints).toBe(0); // the Flaw comes with the Virtue and gives no points
    const l = newCharacter('magus', 's1');
    const lla = addVirtue(l, data, 'life-linked-art', 'Major', 'Inspirational');
    expect(l.virtues.find((v) => v.defId === 'inspirational')?.grantedBy).toBe(lla.uid);
  });
  it('works the same as the Virtue it names, and keeps the hand-coded rules', () => {
    expect(data.vfById.get('eastern-priest')?.effects?.some((e) => e.type === 'abilityAccess')).toBe(true);
    expect(data.vfById.get('redcap')?.effects?.some((e) => e.type === 'implies' && e.virtue === 'well-traveled')).toBe(true);
    const c = magus();
    addVirtue(c, data, 'potent-magic', 'Minor', 'fire');
    expect(conditionalBonuses(derive(c))).toEqual([expect.objectContaining({ casting: 3, lab: 3 })]);
  });
  it('rules out what the text rules out, both ways', () => {
    const c = newCharacter('companion', 's1');
    addVirtue(c, data, 'mendicant-friar', 'Minor');
    expect(vfAvailability(derive(c), data, data.vfById.get('wealthy')!)?.severity).toBe('error');
    const r = newCharacter('companion', 's1');
    addVirtue(r, data, 'wealthy', 'Major');
    expect(vfAvailability(derive(r), data, data.vfById.get('redcap')!)?.severity).toBe('error');
  });
  it('lets Deft Form cast without the penalty for odd words and gestures', () => {
    const c = magus();
    addVirtue(c, data, 'deft-form', 'Minor', 'Ig');
    const d = derive(c);
    const ig = castingScore(d, { technique: 'Cr', form: 'Ig' }, { kind: 'formulaic', wordsGestures: -10 });
    const an = castingScore(d, { technique: 'Cr', form: 'An' }, { kind: 'formulaic', wordsGestures: -10 });
    expect(ig.total - an.total).toBe(10 + d.arts.Ig.score - d.arts.An.score);
  });
});

describe('third playtest: Twilight sizes, Strong Angelic Heritage, magic characters', () => {
  it('gives a Twilight Virtue of the size the Warping Points allow', () => {
    expect(twilightSizes('virtue', 6)).toEqual([]);
    expect(twilightSizes('virtue', 9)).toEqual(['Minor']);
    expect(twilightSizes('virtue', 10)).toEqual(['Minor']);
    expect(twilightSizes('virtue', 11)).toEqual(['Major']);
    expect(twilightSizes('flaw', 10)).toEqual(['Minor', 'Major']);
  });
  it('lets Strong Angelic Heritage be taken again for more holy powers, with Divine Might of age / 20', () => {
    const c = newCharacter('companion', 's1');
    c.age = 60;
    addVirtue(c, data, 'blood-of-the-nephilim', 'Major');
    addVirtue(c, data, 'strong-angelic-heritage', 'Minor');
    expect(vfAvailability(derive(c), data, data.vfById.get('strong-angelic-heritage')!)?.code).not.toBe('dup');
    addVirtue(c, data, 'strong-angelic-heritage', 'Minor');
    const d = derive(c);
    expect(codes(c)).not.toContain('dup');
    expect(d.powerBudgets.holy).toBe(60);
    expect(d.might).toMatchObject({ realm: 'Divine', score: 3 });
    expect(magicResistance(d, 'Co').total).toBe(3);
  });
  const magicHuman = () => {
    const c = newCharacter('companion', 's1');
    c.age = 120;
    c.creature = { realm: 'Magic', kind: 'human', size: 0, might: 0, intelligence: 'companion', magicCharacter: { season: 'summer', powerLevel: 'Medium', baseMight: 10, form: 'Co', qualities: [] } };
    return c;
  };
  it('builds a magic character from its Season, not its age, and adds up its Might and Qualities', () => {
    const c = magicHuman();
    ensureAbility(c, 'teaching', { laterLife: 75 });
    let d = derive(c);
    expect(d.budgets.find((b) => b.id === 'laterLife')?.total).toBe(360);
    expect(d.budgets.some((b) => b.id === 'childhood' || b.id === 'native')).toBe(false);
    expect(d.might?.score).toBe(10);
    expect(d.socialPenalties.some((p) => p.amount === -6)).toBe(true);
    c.creature!.magicCharacter!.qualities.push({ uid: 'q1', id: 'improved-abilities' }, { uid: 'q2', id: 'improved-might' }, { uid: 'q3', id: 'natural-appearance' });
    d = derive(c);
    expect(d.budgets.find((b) => b.id === 'laterLife')?.total).toBe(410);
    expect(d.might?.score).toBe(11);
    expect(d.magicChar?.points).toMatchObject({ budget: 10, spent: 5 });
    expect(d.socialPenalties.some((p) => p.amount === -6)).toBe(false);
    // Might is subtracted from every Advancement Total
    const ab = c.abilities.find((a) => a.abilityId === 'teaching')!;
    const study = computeStudy(d, { kind: 'teacher', com: 3, teaching: 5, teacherScore: 8, students: 1, goodTeacher: true, isArt: false, subject: 'Teaching', labTeaching: 3 }, { abilityUid: ab.uid });
    expect(study.parts.find((p) => /Lab Teaching/.test(p.label))?.value).toBe(3);
    expect(study.advancementTotal).toBe(3 + 5 + 3 + 6 + 5 + 3 - 11);
  });
  it('sizes a magic animal: Might less its Size, Strength and Quickness from its Size', () => {
    const c = newCharacter('companion', 's1');
    c.creature = { realm: 'Magic', kind: 'animal', size: -3, might: 0, intelligence: 'companion', magicCharacter: { season: 'summer', powerLevel: 'Medium', baseMight: 10, qualities: [] } };
    const d = derive(c);
    expect(d.might?.score).toBe(13);
    expect(d.characteristics.Str.value).toBe(-6);
    expect(d.characteristics.Qik.value).toBe(3);
    expect(d.size).toBe(-3);
  });
  it('gives a magic character a magical Social Status, and its companion no companion of its own', () => {
    const c = magicHuman();
    c.creature!.ownerId = 'owner';
    addVirtue(c, data, 'redcap', 'Major');
    expect(codes(c)).toEqual(expect.arrayContaining(['magic-status', 'magic-friend']));
    expect(vfAvailability(derive(c), data, data.vfById.get('magic-being-companion-flaw')!)?.code).toBe('companion-of-companion');
    expect(vfAvailability(derive(newCharacter('companion', 's1')), data, data.vfById.get('magical-friend-flaw')!)?.code).toBe('magic-only');
    // and a magic character may take it: it is one of the five magical Social Statuses
    const friend = magicHuman();
    addVirtue(friend, data, 'magical-friend-flaw', 'Minor');
    expect(codes(friend)).not.toContain('being');
  });
});

describe('writing books (DE Writing Books)', () => {
  it('follows the Quintus example and adds Good Teacher', () => {
    const c = magus();
    const q = planBook(derive(c), { kind: 'summa', isArt: true, score: 24, com: -1, language: 5 });
    expect([q.level, q.perSeason, q.seasons, q.quality]).toEqual([12, 4, 3, 5]);
    const six = planBook(derive(c), { kind: 'summa', isArt: true, score: 24, level: 6, com: -1, language: 5 });
    expect([six.seasons, six.quality]).toEqual([2, 10]);
    addVirtue(c, data, 'good-teacher', 'Minor');
    const t = planBook(derive(c), { kind: 'tractatus', isArt: false, score: 9, com: 3, language: 5 });
    expect([t.quality, t.tractatusLimit]).toEqual([12, 5]);
    // an Ability summa gains 3 Quality per Level dropped, never more than the base Quality
    const ab = planBook(derive(c), { kind: 'summa', isArt: false, score: 9, level: 1, com: 3, language: 5 });
    expect(ab.quality).toBe(12 + 9);
    expect(ab.seasons).toBe(1);
    const capped = planBook(derive(c), { kind: 'summa', isArt: false, score: 20, level: 1, com: 3, language: 5 });
    expect(capped.quality).toBe(24);
  });
});

describe('fourth playtest: a magic character\'s Qualities and powers (RoP: Magic)', () => {
  const bingus = () => {
    const c = newCharacter('companion', 's1');
    c.creature = { realm: 'Magic', kind: 'animal', size: 0, might: 0, intelligence: 'companion', magicCharacter: { season: 'summer', powerLevel: 'Medium', baseMight: 10, form: 'An', qualities: [] } };
    return c;
  };
  const issuesOf = (c: Character, code: string) => validateCharacter(derive(c), data, rules).filter((i) => i.code === code);
  it('adds several copies at once, and holds Improved and Reduced (Characteristic) to their prerequisites', () => {
    const c = bingus();
    addQualities(c, data, 'improved-characteristic', 3, 'Int');
    addQualities(c, data, 'reduced-characteristic-inferiority', 4, 'Dex');
    expect(c.creature!.magicCharacter!.qualities).toHaveLength(7);
    let d = derive(c);
    // Improved needs +5 already, Reduced −5 from Poor (Characteristic): neither applies, and the Inferiorities give no points
    expect([d.characteristics.Int.value, d.characteristics.Dex.value]).toEqual([0, 0]);
    expect(d.magicChar!.points).toMatchObject({ budget: 10, spent: 9, fromInferiorities: 0 });
    expect(issuesOf(c, 'magic-quality').map((i) => i.quality)).toEqual([
      { id: 'improved-characteristic', param: 'Int', count: 3 },
      { id: 'reduced-characteristic-inferiority', param: 'Dex', count: 4 },
    ]);
    // Great Intelligence twice takes Int 3 to 5; Poor Dexterity twice takes Dex −3 to −5
    c.characteristics.Int = 3;
    c.characteristics.Dex = -3;
    for (let i = 0; i < 2; i++) {
      addVirtue(c, data, 'great-characteristic', 'Minor', 'Int');
      addVirtue(c, data, 'poor-characteristic-flaw', 'Minor', 'Dex');
    }
    d = derive(c);
    expect(d.characteristics.Int.value).toBe(8);
    // no lower than the inverse of the greatest Characteristic (Int +8): three of the four apply
    expect(d.characteristics.Dex.value).toBe(-8);
    expect(d.magicChar!.points.fromInferiorities).toBe(9);
    const fix = issuesOf(c, 'magic-quality');
    expect(fix.map((i) => i.quality)).toEqual([{ id: 'reduced-characteristic-inferiority', param: 'Dex', count: 1 }]);
    const f = fixesFor(fix[0], derive(c), data, rules)[0];
    expect(f.label).toBe('Remove Reduced (Characteristic) (Dexterity)');
    if (f.kind === 'apply') f.apply(c);
    expect(c.creature!.magicCharacter!.qualities.filter((q) => q.id === 'reduced-characteristic-inferiority')).toHaveLength(3);
    removeQualities(c, data, 'improved-characteristic', 'Int', 2);
    expect(c.creature!.magicCharacter!.qualities.filter((q) => q.id === 'improved-characteristic')).toHaveLength(1);
    // a ritual's point later does not unmake the Reduced (Characteristic) taken when it was −5
    const pts = derive(c).magicChar!.points.fromInferiorities;
    const was = issuesOf(c, 'magic-quality').map((i) => i.message);
    c.characteristics.Dex += 1;
    c.magicGain = { Dex: 1 };
    expect(derive(c).magicChar!.points.fromInferiorities).toBe(pts);
    expect(issuesOf(c, 'magic-quality').map((i) => i.message)).toEqual(was);
  });
  it('takes its Might off Advancement Totals, less 2 for each pawn of vis it eats', () => {
    const c = bingus();
    const d = derive(c);
    const might = d.magicChar!.might;
    const xp = (visEaten: number) => computeStudy(d, { kind: 'adventure', quality: 5, subject: 'Brawl' }, { visEaten }).xp;
    expect(xp(0)).toBe(Math.max(0, 5 - might));
    expect(xp(2)).toBe(Math.max(0, 5 - might + 4));
    expect(xp(Math.ceil(might / 2))).toBe(5); // never more than the total itself
    expect(xp(50)).toBe(5);
  });
  it('takes the Inferiority with the Flaw it brought, so its points go too', () => {
    const c = bingus();
    const [q] = addQualities(c, data, 'minor-flaw-inferiority', 1);
    const live = c.creature!.magicCharacter!.qualities.find((x) => x.uid === q.uid)!;
    live.virtueUid = addVirtue(c, data, 'greedy-flaw', 'Minor', undefined, { noPoints: true }).uid;
    expect(derive(c).magicChar!.points.budget).toBe(11);
    removeVirtue(c, data, live.virtueUid);
    expect(c.creature!.magicCharacter!.qualities).toHaveLength(0);
    expect(derive(c).magicChar!.points.budget).toBe(10);
  });
  it('raises Confidence with Improved Confidence, also on a finished character', () => {
    const c = bingus();
    addQualities(c, data, 'improved-confidence', 2);
    expect(derive(c).confidence).toEqual({ score: 3, points: 7 });
    c.creation.finalized = true;
    c.confidence = { score: 3, points: 7 };
    addQualities(c, data, 'improved-confidence', 1);
    expect(c.confidence).toEqual({ score: 4, points: 9 });
    removeQualities(c, data, 'improved-confidence', undefined, 2);
    expect(c.confidence).toEqual({ score: 2, points: 5 });
    // a Score that no longer matches is flagged, and the fix keeps the points spent so far
    c.confidence = { score: 1, points: 21 };
    const issue = issuesOf(c, 'magic-confidence')[0];
    expect(issue).toBeDefined();
    const f = fixesFor(issue, derive(c), data, rules)[0];
    if (f.kind === 'apply') f.apply(c);
    expect(c.confidence).toEqual({ score: 2, points: 21 });
  });
  it('gives Magical Meditation as an Ability at 1, and takes it away with the Quality', () => {
    const c = bingus();
    addQualities(c, data, 'magical-meditation', 1);
    const d = derive(c);
    const ab = d.abilities.find((a) => a.abilityId === 'magical-meditation');
    expect(ab?.score).toBe(1);
    expect(abilityAvailability(d, data, 'magical-meditation').ok).toBe(true);
    expect(codes(c)).not.toContain('ability-access');
    removeQualities(c, data, 'magical-meditation', undefined, 1);
    expect(c.abilities.some((a) => a.abilityId === 'magical-meditation')).toBe(false);
  });
  it('spends mastery points from Improved Powers and unused levels on its powers', () => {
    const c = bingus();
    addQualities(c, data, 'improved-powers', 1);
    addQualities(c, data, 'lesser-power', 1);
    addQualities(c, data, 'ritual-power', 2);
    c.powers = [
      { uid: 'p1', name: 'From Nag to Charger', kind: 'lesser', level: 15, penetration: 0, mastery: { cost: 2 } },
      { uid: 'p2', name: 'Grant Virtue', kind: 'ritual', level: 50, penetration: 0, mastery: { cost: 9 } },
    ];
    const d = derive(c);
    // the book's Aeolus: a level 15 Lesser Power with 10 levels left over costs 1 Might
    expect(powerStats(c.powers[0], 0, true).mightCost).toBe(1);
    // a Ritual Power costs at least half its magnitude
    expect(powerStats(c.powers[1], 0, true).mightCost).toBe(5);
    const mp = masteryPools(c.powers, d.powerBudgets, d.magicChar!.mastery);
    expect([mp.general, mp.leftover.lesser, mp.spent, mp.over]).toEqual([5, 2, 11, 4]);
    expect(codes(c)).toContain('mastery-over');
    c.powers[1].mastery = { cost: 5 };
    expect(codes(c)).not.toContain('mastery-over');
    // effects of level 50 or more are Ritual Powers
    addQualities(c, data, 'personal-power', 2);
    c.powers.push({ uid: 'p3', name: 'Super Form', kind: 'personal', level: 50, penetration: 0 });
    expect(codes(c)).toContain('power-ritual');
    // mastery points taken as experience in Concentration, Finesse or Penetration
    c.creature!.magicCharacter!.masteryXp = 2;
    expect(derive(c).budgets.find((b) => b.id === 'pool:mastery')?.total).toBe(10);
  });
});

describe('fifth playtest: a magical companion\'s status and mastery as experience (RoP: Magic)', () => {
  const bingus = () => {
    const c = newCharacter('companion', 's1');
    c.creature = { realm: 'Magic', kind: 'animal', size: 0, might: 0, intelligence: 'companion', ownerId: 'billy', magicCharacter: { season: 'summer', powerLevel: 'Medium', baseMight: 10, form: 'An', qualities: [] } };
    return c;
  };
  it('lets Magical Master sit alongside the Magical Friend a companion Flaw asks for', () => {
    const c = bingus();
    addVirtue(c, data, 'magical-master', 'Major');
    const warn = validateCharacter(derive(c), data, rules).find((i) => i.code === 'magic-friend');
    expect(warn?.message).toMatch(/Magical Master may be combined with it/);
    expect(statusesCompatible(data.vfById.get('magical-master')!, data.vfById.get('magical-friend-flaw')!)).toBe(true);
    addVirtue(c, data, 'magical-friend-flaw', 'Minor');
    expect(codes(c)).not.toContain('magic-friend');
    expect(validateCharacter(derive(c), data, rules).find((i) => i.id === 'status-many')?.severity).toBe('info');
  });
  it('turns mastery points into Penetration experience, and flags mastery that raises a cost without Reduced Power', () => {
    const c = bingus();
    addQualities(c, data, 'improved-powers', 1);
    addQualities(c, data, 'personal-power', 1);
    setMasteryXp(c, 'penetration', 3);
    let d = derive(c);
    expect(c.creature!.magicCharacter!.masteryXp).toBe(3);
    expect(d.budgets.find((b) => b.id === 'pool:mastery')).toMatchObject({ total: 15, spent: 15 });
    expect(d.abilities.find((a) => a.abilityId === 'penetration')?.score).toBe(2);
    setMasteryXp(c, 'penetration', 0);
    expect(c.abilities.some((a) => a.abilityId === 'penetration')).toBe(false);
    expect(c.creature!.magicCharacter!.masteryXp).toBeUndefined();
    c.powers = [{ uid: 'p1', name: 'Super Form', kind: 'personal', level: 20, penetration: 0, mastery: { cost: -4 } }];
    d = derive(c);
    const issue = validateCharacter(d, data, rules).find((i) => i.code === 'power-mastery-neg')!;
    expect(issue.message).toMatch(/raises its Might cost by 4/);
    const f = fixesFor(issue, d, data, rules)[0];
    if (f.kind === 'apply') f.apply(c);
    expect(c.powers[0].mastery).toBeUndefined();
  });
});
