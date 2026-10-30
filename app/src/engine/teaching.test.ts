// Teaching between characters, help in the lab, and a magic character's seasons.

import { describe, expect, it } from 'vitest';
import { buildGameData } from '../data';
import { newSaga } from '../store/store';
import { newCovenant } from './covenant';
import { deriveCharacter } from './character/derive';
import { ensureAbility, newCharacter } from './character/factory';
import { newMagicCharacter } from './character/magicCharacter';
import { newLab } from './lab';
import { newProject } from './projects';
import { bestLesson, maxStudents, mayLearn, teachableSubjects } from './teaching';
import { DEFAULT_ADVANCE, advanceSeason, loggedThisSeason } from './time';
import { abilityXpForScore, artXpForScore } from './xp';
import { DEFAULT_HOUSE_RULES, type Character } from './types';

const data = buildGameData();
const D = (c: Character) => deriveCharacter(c, data, DEFAULT_HOUSE_RULES);
const L = (c: Character) => ({ c, d: D(c) });
const quiet = { ...DEFAULT_ADVANCE, rollAging: false };

/** A covenant with Billy (a magus), Bob (a grog) and Bingus (a magical companion with Might 10, who needs no sleep). */
function saga() {
  const s = newSaga('Test');
  s.currentYear = 1220;
  s.currentSeason = 'Spring';
  const cov = newCovenant(s.id, 1220);
  cov.name = 'Domus';
  const mk = (type: 'magus' | 'grog' | 'companion', name: string) => {
    const c = newCharacter(type, s.id);
    c.name = name;
    c.creation.finalized = true;
    c.age = 30;
    c.covenantId = cov.id;
    cov.memberIds.push(c.id);
    ensureAbility(c, 'living-language', { laterLife: abilityXpForScore(5) }, 'German');
    return c;
  };
  const billy = mk('magus', 'Billy');
  const bob = mk('grog', 'Bob');
  const bingus = mk('companion', 'Bingus');
  bingus.creature = { realm: 'Magic', kind: 'animal', size: 0, might: 10, intelligence: 'companion', ownerId: billy.id };
  bingus.creature.magicCharacter = newMagicCharacter(bingus.creature, 'Medium', 10);
  bingus.seasons = { sleepless: true };
  bingus.characteristics.Com = 2;
  ensureAbility(bingus, 'teaching', { laterLife: abilityXpForScore(1) });
  ensureAbility(bingus, 'animal-handling', { laterLife: abilityXpForScore(5) });
  ensureAbility(bingus, 'brawl', { laterLife: abilityXpForScore(4) });
  ensureAbility(bingus, 'artes-liberales', { laterLife: abilityXpForScore(3) });
  ensureAbility(bob, 'brawl', { laterLife: abilityXpForScore(3) });
  return { saga: s, characters: [billy, bob, bingus], covenants: [cov], billy, bob, bingus, cov };
}

describe('teaching between characters (DE, Teaching)', () => {
  it('offers what the teacher knows better, that the student may learn: no Arts to a non-magus, no Academic Ability without a Virtue', () => {
    const { bingus, bob, billy } = saga();
    const forBob = teachableSubjects(L(bingus), L(bob), data);
    expect(forBob.language).toBe('German');
    expect(forBob.subjects.map((x) => x.label).sort()).toEqual(['Animal Handling', 'Brawl']);
    expect(forBob.subjects.find((x) => x.label === 'Animal Handling')?.newAbility).toMatchObject({ abilityId: 'animal-handling' });
    expect(forBob.blocked.find((x) => x.label === 'Artes Liberales')?.why).toMatch(/Academic Abilities need a Virtue/);
    // a magus may learn Academic Abilities, with Latin at 3
    expect(mayLearn(L(billy), data, 'artes-liberales')).toMatch(/Latin/);
    ensureAbility(billy, 'dead-language', { laterLife: abilityXpForScore(4) }, 'Latin');
    expect(mayLearn(L(billy), data, 'artes-liberales')).toBeUndefined();
    // the teacher's Arts are taught only to a magus, from 5
    billy.arts.Cr = { laterLife: artXpForScore(8) };
    expect(teachableSubjects(L(billy), L(bob), data).subjects.some((x) => x.isArt)).toBe(false);
    const apprentice = saga().billy;
    apprentice.abilities.push(...billy.abilities.filter((a) => a.abilityId === 'living-language'));
    expect(teachableSubjects(L(billy), L(apprentice), data).subjects.find((x) => x.key === 'art:Cr')).toMatchObject({ teacherScore: 8, studentScore: 0 });
  });

  it('needs a language in common, which a familiar has with its magus', () => {
    const { bingus, bob, billy } = saga();
    bob.abilities = bob.abilities.filter((a) => a.abilityId !== 'living-language');
    ensureAbility(bob, 'living-language', { laterLife: abilityXpForScore(5) }, 'Italian');
    expect(teachableSubjects(L(bingus), L(bob), data).why).toMatch(/no language in common/);
    billy.abilities = billy.abilities.filter((a) => a.abilityId !== 'living-language');
    bingus.creature!.familiarOf = billy.id;
    expect(teachableSubjects(L(bingus), L(billy), data).language).toBe('the familiar bond');
  });

  it('teaches the lesson that teaches the most in all: two students at +3 before one at +6', () => {
    const { bingus, bob, billy } = saga();
    expect(maxStudents(L(bingus))).toBe(5);
    // Communication 2 + Teaching 1 + 3, and +3 for two students: 9 xp each in Animal Handling (18), better than Brawl to Bob alone at +6 (12)
    const r = bestLesson(L(bingus), [L(bob), L(billy)], data);
    expect(r.plan?.label).toBe('Animal Handling');
    expect(r.plan?.students.map((w) => w.result.xp)).toEqual([9, 9]);
    // a student who asked for Brawl is taught only that
    const asked = bestLesson(L(bingus), [L(bob)], data, { wants: new Map([[bob.id, bingus.abilities.find((a) => a.abilityId === 'brawl')!.uid].map((x, i) => (i ? `ability:${x}` : x)) as [string, string]]) });
    expect(asked.plan).toMatchObject({ label: 'Brawl', total: 12 });
  });

  it('Bingus teaches Billy when Billy asks, in an extra season, and both seasons are logged', () => {
    const st = saga();
    st.billy.standing = { kind: 'taught', teacher: `char:${st.bingus.id}` };
    const { state, report } = advanceSeason(st, data, quiet);
    const [billy, , bingus] = state.characters;
    const taught = loggedThisSeason(billy, 1220, 'Spring');
    expect(taught).toHaveLength(1);
    expect(taught[0]).toMatchObject({ activity: 'taught' });
    expect(taught[0].summary).toMatch(/Taught by Bingus: Animal Handling \(\+12 xp\)/);
    expect(D(billy).abilities.find((a) => a.abilityId === 'animal-handling')?.effectiveXp).toBe(12);
    // the lesson took Bingus's extra season: its own season went on as usual
    const lessons = loggedThisSeason(bingus, 1220, 'Spring');
    expect(lessons.find((e) => e.activity === 'teach')?.extra).toBe(true);
    expect(report.lines.find((l) => l.who === 'Bingus' && /Taught Animal Handling to Billy/.test(l.text))?.text).toMatch(/Might 10/);
  });

  it('one who needs no sleep teaches in an extra season and in its own, to different students', () => {
    const st = saga();
    st.bingus.seasons = { sleepless: true, extra: { kind: 'teach', students: [st.bob.id] } };
    st.bingus.standing = { kind: 'teach', students: [st.billy.id] };
    const { state } = advanceSeason(st, data, quiet);
    const [billy, bob, bingus] = state.characters;
    expect(loggedThisSeason(bingus, 1220, 'Spring').map((e) => [e.activity, !!e.extra])).toEqual([['teach', true], ['teach', false]]);
    expect(loggedThisSeason(bob, 1220, 'Spring')[0].activity).toBe('taught');
    expect(loggedThisSeason(billy, 1220, 'Spring')[0].activity).toBe('taught');
  });

  it('a teacher set to teach chosen students teaches those free, and says why when none can learn', () => {
    const st = saga();
    st.bingus.standing = { kind: 'teach', students: [st.bob.id, st.billy.id] };
    st.bingus.seasons = undefined;
    const { state } = advanceSeason(st, data, quiet);
    const [billy, bob, bingus] = state.characters;
    expect(loggedThisSeason(bob, 1220, 'Spring')[0].summary).toMatch(/Animal Handling \(\+9 xp\)/);
    expect(loggedThisSeason(billy, 1220, 'Spring')[0].summary).toMatch(/Animal Handling \(\+9 xp\)/);
    expect(loggedThisSeason(bingus, 1220, 'Spring')[0]).toMatchObject({ activity: 'teach' });
    // a teacher whose students know as much: the season goes to its usual work
    const again = saga();
    again.bingus.seasons = undefined;
    again.bingus.standing = { kind: 'teach', students: [again.bob.id], target: `ability:${again.bingus.abilities.find((a) => a.abilityId === 'brawl')!.uid}` };
    again.bob.abilities.find((a) => a.abilityId === 'brawl')!.xp = { laterLife: abilityXpForScore(4) };
    const r = advanceSeason(again, data, quiet).report;
    expect(r.lines.find((l) => l.who === 'Bingus')?.text).toMatch(/^No lesson this season: Bingus has nothing to teach Bob in that/);
  });
});

describe('help in the laboratory (DE, Help in the Laboratory)', () => {
  function lab() {
    const st = saga();
    const ann = newCharacter('magus', st.saga.id);
    ann.name = 'Ann';
    ann.creation.finalized = true;
    ann.age = 30;
    ann.covenantId = st.cov.id;
    st.cov.memberIds.push(ann.id);
    st.characters.push(ann);
    ann.characteristics.Int = 2;
    ensureAbility(ann, 'magic-theory', { laterLife: abilityXpForScore(3) });
    st.cov.labs.push(newLab('Tower', st.billy.id));
    st.billy.arts.Cr = { laterLife: artXpForScore(5) };
    st.billy.arts.An = { laterLife: artXpForScore(5) };
    ensureAbility(st.billy, 'magic-theory', { laterLife: abilityXpForScore(3) });
    st.billy.projects = [{ ...newProject('invent'), technique: 'Cr', form: 'An', level: 15 }];
    st.billy.standing = { kind: 'lab', projectUid: st.billy.projects[0].uid };
    return { ...st, ann };
  }

  it('adds the helper’s Intelligence + Magic Theory to the Lab Total and gives the helper Exposure', () => {
    const st = lab();
    st.ann.standing = { kind: 'assist', helps: st.billy.id };
    const { state, report } = advanceSeason(st, data, quiet);
    const ann = state.characters.find((c) => c.name === 'Ann')!;
    expect(report.lines.find((l) => l.who === 'Billy' && /^Helped by Ann \(\+5\)/.test(l.text))).toBeTruthy();
    expect(loggedThisSeason(ann, 1220, 'Spring')[0].summary).toMatch(/Helped Billy in the lab.*\+2 xp Exposure in Magic Theory/);
    const alone = advanceSeason(lab(), data, quiet).state.characters[0].projects![0];
    expect(state.characters[0].projects![0].progress! - alone.progress!).toBe(5);
  });

  it('turns away a helper without The Gift unless it is the magus’s bound familiar, and takes as many as Leadership allows', () => {
    const st = lab();
    st.bingus.seasons = undefined;
    st.bingus.standing = { kind: 'assist', helps: st.billy.id };
    ensureAbility(st.bingus, 'magic-theory', { laterLife: abilityXpForScore(1) });
    const turned = advanceSeason(st, data, quiet).report;
    expect(turned.lines.find((l) => l.who === 'Bingus')?.text).toMatch(/No help in the lab this season: a helper needs The Gift/);
    // bound as Billy's familiar, it helps, and Ann besides (a familiar and one more, with Leadership 0)
    const bound = lab();
    bound.bingus.seasons = undefined;
    ensureAbility(bound.bingus, 'magic-theory', { laterLife: abilityXpForScore(1) });
    bound.billy.familiar = { name: 'Bingus', species: 'cat', might: 10, size: 0, realm: 'Magic', bindingTechnique: 'Cr', bindingForm: 'An', bindingLabTotal: 30, golden: 1, silver: 1, bronze: 1, pawnsSpent: 6, powers: [], characterId: bound.bingus.id };
    bound.bingus.standing = { kind: 'assist', helps: bound.billy.id };
    bound.ann.standing = { kind: 'assist', helps: bound.billy.id };
    const { state, report } = advanceSeason(bound, data, quiet);
    expect(state.characters.find((c) => c.name === 'Bingus')!.creature!.familiarOf).toBe(state.characters[0].id);
    expect(report.lines.find((l) => l.who === 'Billy' && /^Helped by/.test(l.text))?.text).toMatch(/Bingus.*and Ann/);
    // a third helper is one too many
    const crowd = lab();
    const cal = newCharacter('magus', crowd.saga.id);
    cal.name = 'Cal';
    cal.creation.finalized = true;
    cal.age = 30;
    ensureAbility(cal, 'magic-theory', { laterLife: abilityXpForScore(1) });
    crowd.characters.push(cal);
    crowd.ann.standing = { kind: 'assist', helps: crowd.billy.id };
    cal.standing = { kind: 'assist', helps: crowd.billy.id };
    const r = advanceSeason(crowd, data, quiet).report;
    expect(r.lines.find((l) => l.who === 'Cal')?.text).toMatch(/can use 1 helper a season \(Leadership\)/);
  });
});

describe('a magic character’s seasons (RoP: Magic, Advancement)', () => {
  it('does not waste an extra season on practice its Might cancels, and a bound familiar learns as a human', () => {
    const st = saga();
    const { report } = advanceSeason(st, data, quiet);
    expect(report.lines.find((l) => l.who === 'Bingus' && /Extra season/.test(l.text))?.text).toMatch(/nothing it could learn by practice \(its Might 10/);
    st.billy.familiar = { name: 'Bingus', species: 'cat', might: 10, size: 0, realm: 'Magic', bindingTechnique: 'Cr', bindingForm: 'An', bindingLabTotal: 30, golden: 1, silver: 1, bronze: 1, pawnsSpent: 6, powers: [], characterId: st.bingus.id };
    const bound = advanceSeason(st, data, quiet).report;
    expect(bound.lines.find((l) => l.who === 'Bingus' && /Extra season/.test(l.text))?.text).toMatch(/Practiced .*: \+4 xp/);
  });

  it('left to the clock, a character studies the covenant’s best book or teacher when it teaches more than practice', () => {
    const st = saga();
    st.cov.library.push({ uid: 'b1', title: 'De Pugna', kind: 'summa', subjectType: 'ability', subject: 'brawl', level: 6, quality: 9, language: 'German' });
    const { state, report } = advanceSeason(st, data, quiet);
    expect(report.lines.find((l) => l.who === 'Bob')?.text).toMatch(/^Read De Pugna.*\+9 xp/);
    expect(loggedThisSeason(state.characters[1], 1220, 'Spring')[0].bookId).toBe('b1');
    // a covenant teacher, when one teaches more
    const t = saga();
    t.cov.specialists.push({ uid: 'sp', name: 'Old Hans', role: 'teacher', ability: 'Brawl', score: 6, abilities: [{ id: 'brawl', score: 6 }], com: 2, teaching: 4 });
    const r = advanceSeason(t, data, quiet).report;
    expect(r.lines.find((l) => l.who === 'Bob')?.text).toMatch(/^Taught Brawl by Old Hans: Quality 15/);
  });

  it('service to the players’ covenant extracts vis only when its Aegis or Longevity Rituals lack it', () => {
    const st = saga();
    st.cov.labs.push(newLab('Tower', st.billy.id));
    st.cov.auraTrack = undefined;
    st.billy.priorities = [{ kind: 'service' }];
    st.billy.standing = { kind: 'priorities' };
    st.billy.age = 25;
    const { report } = advanceSeason(st, data, quiet);
    expect(report.lines.find((l) => l.who === 'Billy')?.text).toMatch(/^Service to the covenant: duties for Domus/);
    // from 30 the covenant puts by the vis of a Longevity Ritual, and extracts it if it lacks it
    st.billy.age = 32;
    expect(advanceSeason(st, data, quiet).report.lines.find((l) => l.who === 'Billy')?.text).toMatch(/^Service to the covenant: vis extracted for Domus/);
  });

  it('a magus left to the clock works its own project, not vis extraction', () => {
    const st = saga();
    st.cov.labs.push(newLab('Tower', st.billy.id));
    const extract = newProject('extract');
    st.billy.projects = [extract];
    const { report } = advanceSeason(st, data, quiet);
    expect(report.lines.find((l) => l.who === 'Billy')?.text).toMatch(/^Lab work/);
  });
});
