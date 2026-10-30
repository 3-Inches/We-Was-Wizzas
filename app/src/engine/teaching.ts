// Teaching between characters (DE, Teaching): what a teacher can teach a student, the lesson that
// teaches its students the most, and the season it takes on both sides. A teacher needs 2 in an
// Ability or 5 in an Art, more than the student, and a language in common; an Art is taught one to
// one; a teacher takes five students for each point of Teaching (one with none). The teacher gains
// Exposure in Teaching and can do nothing else that season.

import { ARTS, ART_NAMES, abilityTypeOf, isLanguageAbility, type Art, type GameData } from '../data';
import type { DerivedCharacter } from './character/derive';
import { ensureAbility } from './character/factory';
import { applySeason, computeStudy, newSeasonEntry, type StudyResult } from './longterm';
import type { Character, CharSpell, Season, SeasonLogEntry } from './types';
import { abilityScoreFromXp } from './xp';

export interface Learner {
  c: Character;
  d: DerivedCharacter;
}

/** Something a teacher can teach one student. */
export interface Teachable {
  /** the subject on the teacher's sheet: 'art:Cr', 'ability:<uid>' or 'mastery:<spellUid>' */
  key: string;
  label: string;
  isArt: boolean;
  teacherScore: number;
  studentScore: number;
  /** the subject on the student's sheet, when the student has it */
  studentKey?: string;
  /** an Ability the student does not have yet, added when it is taught */
  newAbility?: { abilityId: string; param?: string };
}

const xpOf = (x: Record<string, number | undefined>) => Object.values(x).reduce<number>((t, v) => t + (v ?? 0), 0);

/** A Spell Mastery score: the experience kept on the spell. */
export function masteryScore(s: CharSpell): number {
  return abilityScoreFromXp(xpOf(s.masteryXp));
}

const sameSpell = (a: CharSpell, b: CharSpell) => (a.spellId && a.spellId === b.spellId) || a.spell.name.trim().toLowerCase() === b.spell.name.trim().toLowerCase();

/** A familiar and the magus it is bound to. */
export function boundTogether(a: Character, b: Character): boolean {
  return a.creature?.familiarOf === b.id || b.creature?.familiarOf === a.id;
}

function languages(x: Learner): Map<string, string> {
  const out = new Map<string, string>();
  for (const a of x.c.abilities) {
    if (!isLanguageAbility(a.abilityId) || (x.d.abilityByUid.get(a.uid)?.score ?? 0) < 1) continue;
    const name = a.param || a.abilityId.replace(/^dead-language-?/, '') || 'a language';
    out.set(name.trim().toLowerCase(), name.replace(/^./, (ch) => ch.toUpperCase()));
  }
  return out;
}

/** The language teacher and student have in common; a familiar speaks its magus's (DE, Familiars). */
export function commonLanguage(t: Learner, s: Learner): string | undefined {
  if (boundTogether(t.c, s.c)) return 'the familiar bond';
  const mine = languages(t);
  for (const [k, label] of languages(s)) if (mine.has(k)) return label;
  return undefined;
}

const scholarly = (x: Learner) => x.c.abilities.some((a) => (a.abilityId === 'dead-language' || a.abilityId.startsWith('dead-language-')) && (x.d.abilityByUid.get(a.uid)?.score ?? 0) >= 3);

/**
 * Why a student cannot learn an Ability it has no score in, or nothing if it can: Academic, Arcane
 * and Martial Abilities need a Virtue or a magus (an Academic one Latin at 3 as well); a new
 * Supernatural Ability has its own rules; only the Gifted learn Parma Magica (DE, Abilities). A
 * familiar can learn Magic Theory (DE, Familiars).
 */
export function mayLearn(s: Learner, data: GameData, abilityId: string): string | undefined {
  const { d } = s;
  if (abilityId === 'parma-magica') return d.hasGift ? undefined : 'only the Gifted learn Parma Magica';
  if (abilityId === 'magic-theory' && s.c.creature?.familiarOf) return undefined;
  const type = abilityTypeOf(data, abilityId);
  if (type === 'Supernatural') return d.abilityAccess.abilities.has(abilityId) ? undefined : 'a new Supernatural Ability is learned by its own rules (DE, Learning Supernatural Abilities)';
  if (type === 'General') return undefined;
  if (!d.isMagus && !d.abilityAccess.types.has(type) && !d.abilityAccess.abilities.has(abilityId)) return `${type} Abilities need a Virtue that opens them`;
  if (type === 'Academic' && !isLanguageAbility(abilityId) && !scholarly(s)) return 'an Academic Ability needs Latin (or another learned language) at 3 first';
  return undefined;
}

/**
 * What the teacher can teach this student, and what it knows but cannot teach them and why. Arts
 * only to a magus; Spell Mastery only of a spell the student knows; nothing without a common language.
 */
export function teachableSubjects(t: Learner, s: Learner, data: GameData): { subjects: Teachable[]; blocked: { label: string; why: string }[]; language?: string; why?: string } {
  const language = commonLanguage(t, s);
  const who = s.c.name || 'the student';
  if (!language) return { subjects: [], blocked: [], why: `${t.c.name || 'The teacher'} and ${who} have no language in common` };
  const subjects: Teachable[] = [];
  const blocked: { label: string; why: string }[] = [];
  if (s.d.isMagus)
    for (const a of ARTS) {
      const ts = t.d.arts[a].score;
      const ss = s.d.arts[a].score;
      if (ts >= 5 && ts > ss) subjects.push({ key: `art:${a}`, label: ART_NAMES[a], isArt: true, teacherScore: ts, studentScore: ss, studentKey: `art:${a}` });
    }
  for (const ta of t.c.abilities) {
    const da = t.d.abilityByUid.get(ta.uid);
    if (!da || da.score < 2) continue;
    const mine = s.c.abilities.find((x) => x.abilityId === ta.abilityId && (x.param ?? '').trim().toLowerCase() === (ta.param ?? '').trim().toLowerCase());
    const ss = mine ? s.d.abilityByUid.get(mine.uid)?.score ?? 0 : 0;
    if (da.score <= ss) continue;
    const why = mine ? undefined : mayLearn(s, data, ta.abilityId);
    if (why) blocked.push({ label: da.name, why });
    else subjects.push({ key: `ability:${ta.uid}`, label: da.name, isArt: false, teacherScore: da.score, studentScore: ss, studentKey: mine ? `ability:${mine.uid}` : undefined, newAbility: mine ? undefined : { abilityId: ta.abilityId, param: ta.param } });
  }
  for (const sp of t.c.spells) {
    const ts = masteryScore(sp);
    if (ts < 2) continue;
    const mine = s.c.spells.find((x) => sameSpell(x, sp));
    if (!mine) continue;
    const ss = masteryScore(mine);
    if (ts > ss) subjects.push({ key: `mastery:${sp.uid}`, label: `${sp.spell.name} (Mastery)`, isArt: false, teacherScore: ts, studentScore: ss, studentKey: `mastery:${mine.uid}` });
  }
  return { subjects, blocked, language };
}

/** The teacher's part of a lesson's Source Quality. */
export function teacherParts(t: Learner): { com: number; teaching: number; goodTeacher: boolean } {
  return { com: t.d.characteristics.Com.value, teaching: t.d.abilities.find((a) => a.abilityId === 'teaching')?.score ?? 0, goodTeacher: t.d.virtues.some((v) => v.cv.defId === 'good-teacher') };
}

/** How many students the teacher can take at once: five for each point of Teaching, or one. */
export function maxStudents(t: Learner): number {
  const teaching = teacherParts(t).teaching;
  return teaching > 0 ? teaching * 5 : 1;
}

/** What one student learns from a lesson on this subject with so many students. */
export function lessonStudy(t: Learner, s: Learner, sub: Teachable, students: number, labTeaching = 0): StudyResult {
  const tp = teacherParts(t);
  const k = sub.studentKey ?? '';
  const target = k.startsWith('art:')
    ? { art: k.slice(4) as Art }
    : k.startsWith('ability:')
      ? { abilityUid: k.slice(8) }
      : k.startsWith('mastery:')
        ? { currentXp: xpOf(s.c.spells.find((x) => x.uid === k.slice(8))?.masteryXp ?? {}) }
        : {};
  return computeStudy(s.d, { kind: 'teacher', ...tp, teacherScore: sub.teacherScore, students, isArt: sub.isArt, subject: sub.label, labTeaching }, target);
}

export interface LessonPlan {
  /** the subject on the teacher's sheet */
  key: string;
  label: string;
  students: { s: Learner; sub: Teachable; result: StudyResult }[];
  total: number;
}

/**
 * The lesson that teaches the most experience in all: the subject, and the students taught it among
 * those who would gain from it. One student adds 6 to the Source Quality and two add 3, so a lesson
 * for one or two can teach more than one for many. A student who asked for a subject is taught only
 * that one; a teacher set on a subject teaches only it.
 */
export function bestLesson(t: Learner, pool: Learner[], data: GameData, o: { subject?: string; wants?: Map<string, string | undefined>; labTeaching?: number } = {}): { plan?: LessonPlan; why: Map<string, string> } {
  // why each student is left out, by id
  const why = new Map<string, string>();
  const options = new Map<string, { label: string; isArt: boolean; who: { s: Learner; sub: Teachable }[] }>();
  for (const s of pool) {
    const r = teachableSubjects(t, s, data);
    if (r.why) {
      why.set(s.c.id, `${r.why}.`);
      continue;
    }
    const want = o.wants?.get(s.c.id);
    const fit = r.subjects.filter((x) => (!o.subject || x.key === o.subject) && (!want || x.key === want));
    if (!fit.length) {
      const named = want ?? o.subject;
      const blockedWhy = r.blocked.find((b) => named && t.d.abilityByUid.get(named.slice(8))?.name === b.label)?.why;
      why.set(s.c.id, `${t.c.name || 'The teacher'} has nothing to teach ${s.c.name || 'the student'}${named ? ' in that' : ''}${blockedWhy ? `: ${blockedWhy}` : ' that they know less of'}.`);
      continue;
    }
    for (const sub of fit) {
      const opt = options.get(sub.key) ?? { label: sub.label, isArt: sub.isArt, who: [] };
      opt.who.push({ s, sub });
      options.set(sub.key, opt);
    }
  }
  const cap = maxStudents(t);
  let best: LessonPlan | undefined;
  for (const [key, opt] of options) {
    // an Art one to one; else one, two, or as many as the teacher can take
    const counts = opt.isArt ? [1] : [...new Set([1, 2, Math.min(cap, opt.who.length)])].filter((n) => n >= 1 && n <= Math.min(cap, opt.who.length));
    for (const n of counts) {
      const ranked = opt.who
        .map((w) => ({ ...w, result: lessonStudy(t, w.s, w.sub, n, o.labTeaching) }))
        .filter((w) => w.result.xp > 0)
        .sort((a, b) => b.result.xp - a.result.xp)
        .slice(0, n);
      if (!ranked.length) continue;
      // fewer students than counted for: their bonus is the larger one
      const students = ranked.length < n ? ranked.map((w) => ({ ...w, result: lessonStudy(t, w.s, w.sub, ranked.length, o.labTeaching) })) : ranked;
      const total = students.reduce((sum, w) => sum + w.result.xp, 0);
      // a tie goes to fewer students, then to the subject with more room to grow (the teacher's score above the students')
      const room = (x: { students: { sub: Teachable }[] }) => x.students.reduce((r, w) => r + w.sub.teacherScore - w.sub.studentScore, 0);
      const plan = { key, label: opt.label, students, total };
      if (!best || total > best.total || (total === best.total && (students.length < best.students.length || (students.length === best.students.length && room(plan) > room(best))))) best = plan;
    }
  }
  for (const s of pool) {
    if (why.has(s.c.id) || best?.students.some((w) => w.s.c.id === s.c.id)) continue;
    why.set(s.c.id, best ? `${t.c.name || 'The teacher'} taught ${best.label} to ${best.students.length > 1 ? 'others' : best.students[0].s.c.name || 'another'}, which teaches more in all.` : `${s.c.name || 'The student'} would gain nothing from ${t.c.name || 'the teacher'}'s lessons.`);
  }
  return { plan: best, why };
}

/**
 * Give the lesson: the teacher's season (Exposure in Teaching) and each student's, logged and
 * applied. An Ability new to a student is added to its sheet. Returns the lines for each.
 */
export function giveLesson(t: Learner, plan: LessonPlan, year: number, season: Season, o: { extra?: boolean; asked?: boolean } = {}): { who: Character; text: string }[] {
  const out: { who: Character; text: string }[] = [];
  const tName = t.c.name || 'The teacher';
  const names = plan.students.map((w) => w.s.c.name || 'a student');
  const teaching = ensureAbility(t.c, 'teaching', {});
  const ex = computeStudy(t.d, { kind: 'exposure', subject: 'Teaching' }, { abilityUid: teaching.uid });
  const mark = (e: SeasonLogEntry) => {
    if (o.extra) {
      e.extra = true;
      e.summary = `Extra season (needs no sleep): ${e.summary}`;
    }
    return e;
  };
  const te = mark(newSeasonEntry(year, season, 'teach', `Taught ${plan.label} to ${names.join(', ')} (Exposure: Teaching +${ex.xp} xp)`, ex.xp ? { [`ability:${teaching.uid}`]: ex.xp } : {}));
  applySeason(t.c, te, 1);
  t.c.seasonLog.push(te);
  out.push({ who: t.c, text: `${o.extra ? 'Extra season: ' : ''}Taught ${plan.label} to ${names.join(' and ')}${o.asked ? ' (as asked)' : ''}: ${plan.total} xp in all; Exposure in Teaching +${ex.xp} xp.${!ex.xp && t.d.magicChar ? ` Its Might ${t.d.magicChar.might} comes off its own Advancement Totals.` : ''}` });
  for (const w of plan.students) {
    let key = w.sub.studentKey;
    if (!key && w.sub.newAbility) key = `ability:${ensureAbility(w.s.c, w.sub.newAbility.abilityId, {}, w.sub.newAbility.param).uid}`;
    if (!key) continue;
    const e = newSeasonEntry(year, season, 'taught', `Taught by ${tName}: ${plan.label} (+${w.result.xp} xp)`, w.result.xp ? { [key]: w.result.xp } : {});
    e.sourceQuality = w.result.sourceQuality;
    applySeason(w.s.c, e, 1);
    w.s.c.seasonLog.push(e);
    out.push({ who: w.s.c, text: `Taught ${plan.label} by ${tName}${plan.students.length > 1 ? ` with ${plan.students.length - 1} other${plan.students.length > 2 ? 's' : ''}` : ''}: Quality ${w.result.sourceQuality}, +${w.result.xp} xp${w.result.capped ? ' (as far as the teacher knows)' : ''}${w.sub.newAbility ? `, a new Ability` : ''}.` });
  }
  return out;
}

/**
 * A familiar's own sheet, linked from its magus's Familiar card and bound, learns as a human does;
 * one whose bond is gone is a magic character again (it keeps what it learned).
 */
export function bindFamiliarSheets(chars: Character[]): void {
  const bound = new Map<string, string>();
  for (const m of chars) if (m.familiar?.characterId && m.familiar.bindingLabTotal > 0) bound.set(m.familiar.characterId, m.id);
  for (const x of chars) {
    if (!x.creature) continue;
    const m = bound.get(x.id);
    if (m) x.creature.familiarOf = m;
    else if (x.creature.familiarOf) x.creature.familiarOf = undefined;
  }
}
