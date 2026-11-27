// The saga's clock: one place where seasons and years pass for everyone at once. A season applies
// what each character did (logged on their sheet, or their standing activity), then the season's
// passing; the turn of the year closes each covenant's books, pays allowances, renews wards, ages
// everyone, and adds the year's Warping.

import { ART_NAMES, type Art, type GameData } from '../data';
import { deriveCharacter, type DerivedCharacter } from './character/derive';
import { characterContext, covenantAura, covenantOf, labAuraFor, type CharacterContext } from './context';
import { deriveCovenant } from './covenant';
import { covenfolkYearEnd } from './covenfolk';
import { deriveLab } from './lab';
import { specAbilities, specChar } from './covenantRules';
import { DEFAULT_YEAR_END, applyYearEnd, planYearEnd, rollIncomeYear, type YearEndOptions } from './covenantYear';
import { seasonTelling, writeChronicle, type ChronicleFacts } from './chronicle';
import { agentReports } from './agency';
import { defaultRng, describeStress, stressDie, type Rng } from './dice';
import { payAllowance } from './economy';
import { expireEffects, nextSeason, seasonIndex } from './effects';
import { applySeason, computeStudy, newSeasonEntry, visForStudy } from './longterm';
import { begunUndo, labUndo } from './unlog';
import { hopedHoroscope, planProject, visShort, workProject } from './projects';
import { auraOf } from './aura';
import { optionOn } from './optional';
import { hooksComeDue } from './hookEvents';
import { hardshipYearEnd } from './hardship';
import { magicalImprovement } from './livingEconomy';
import { faceTrouble, troublesYearEnd } from './calamity';
import { extraSeasonHere, seasonsOf, seasonsUsed } from './seasons';
import { WORSHIP_AURA, resolveStanding, workAbility, worshipAbility } from './standing';
export { describeStanding, resolveStanding } from './standing';
import { ensureAbility } from './character/factory';
import type { Character, Covenant, LabProject, Saga, Season, SeasonLogEntry, StandingActivity, TimeReport } from './types';
import { bookTarget, libraryYearEnd, scriptoriumYear, studyProblem, workWriting, writingFor } from './books';
import { purseOf, takeVis } from './vis';
import { bestStudy, choosePriority, focusArts, priorityLabel } from './priorities';
import { gatheringIn, gatheringNews, houseGatheringIn, livingIds, livingYearEnd } from './living';
import { redcapYearEnd } from './generate/items';
import { apprenticesYearEnd, tribunalGathering, wanderersSeasonStart, wanderersYearEnd } from './tribunalLife';
import { workshopSeason, workshopYearEnd } from './workshop';
import { holySeason } from './holy';
import { oweSeasonEndRolls } from './seasonRolls';
import { seasonWarping } from './warping';
import { twilightYear } from './livingTwilight';
import { livingSeasonEnd } from './livingReactions';
import { uid } from '../util/id';
import { bestLesson, bindFamiliarSheets, giveLesson } from './teaching';
import { cannotHelp, helpValue, maxHelpers, type LabHelper } from './labHelp';
import { learnsArts } from './firstChoice';
import { gatheringTold, helperTold, labTold } from './seasonTold';
import { ageCharacter, auraYearEnd, covenantAttendants, covenfolkWarpingYearEnd, hookReminders, hungerSeason, inPlay, renewCovenantEffects } from './yearEnd';

export interface SagaState {
  saga: Saga;
  characters: Character[];
  covenants: Covenant[];
}

export interface AdvanceOptions {
  /** what characters do in a season nobody logged: their standing activity, or nothing */
  fillUnplanned: boolean;
  rollAging: boolean;
  yearEnd: YearEndOptions;
  rng?: Rng;
}

export const DEFAULT_ADVANCE: AdvanceOptions = { fillUnplanned: true, rollAging: true, yearEnd: DEFAULT_YEAR_END };

/** The season reports the Seasons page shows in full; older ones keep only the players' own lines. */
export const REPORTS_IN_FULL = 12;

/**
 * The saga's season reports, newest first: twenty years of them, the latest in full and the older
 * ones without the Tribunal's lines (a whole Tribunal writes some two hundred lines a season, which
 * the page no longer shows).
 */
export function keepReports(reports: TimeReport[]): TimeReport[] {
  return reports.slice(0, 80).map((r, i) => (i < REPORTS_IN_FULL || !r.lines.some((l) => l.tribunal) ? r : { ...r, lines: r.lines.filter((l) => !l.tribunal) }));
}

type Line = TimeReport['lines'][number];

export function loggedThisSeason(c: Character, year: number, season: Season): SeasonLogEntry[] {
  return c.seasonLog.filter((e) => e.year === year && e.season === season);
}

/** What already fills the season: anything logged but an adventure, which can share a season with other work (DE), and an extra season of one who needs no sleep. */
export function seasonTaken(c: Character, year: number, season: Season): SeasonLogEntry[] {
  return loggedThisSeason(c, year, season).filter((e) => e.activity !== 'adventure' && !e.extra);
}


// Worked out for the season before its work is done (advanceSeason): those helping each magus in the
// lab, and why a lesson or help planned did not happen.
const LAB_HELP = new WeakMap<Character, LabHelper[]>();
const NO_LESSON = new WeakMap<Character, string>();
const NO_HELP = new WeakMap<Character, string>();

/** The season is taken already: logged by hand, or by a lesson given before the season's other work. An adventure shares a season (DE). */
export function seasonBusy(c: Character, year: number, season: Season): boolean {
  return loggedThisSeason(c, year, season).some((e) => !e.extra && e.activity !== 'adventure');
}

/** One of the year's extra seasons (a character who needs no sleep) falls in this season and is not yet used. */
export function extraFree(c: Character, d: DerivedCharacter, year: number, season: Season): boolean {
  const plan = seasonsOf(c, d);
  return !!plan.extra && extraSeasonHere(plan, season) && !loggedThisSeason(c, year, season).some((e) => e.extra) && seasonsUsed(c, year).extra < plan.extra;
}

/** Why a magic character learned nothing: its Might comes off every Advancement Total (RoP: Magic). */
function mightNote(d: DerivedCharacter, xp: number): string {
  if (xp || !d.magicChar || d.magicChar.might <= 0) return '';
  return ` Its Might ${d.magicChar.might} comes off the Advancement Total; eating vis (2 off for each pawn) lets it learn: plan the season on its sheet.`;
}

/** Log and apply a season of a character's standing activity. Returns what happened. */
export function runStanding(c: Character, d: DerivedCharacter, ctx: CharacterContext, cov: Covenant | undefined, data: GameData, year: number, season: Season, rng: Rng, chars?: Character[]): string[] {
  const s = resolveStanding(c, d, year);
  // left to the clock, a free season goes to the covenant's best book or teacher when it teaches more than the usual practice, or a magus's lab Exposure with no project
  if ((c.standing?.kind ?? 'auto') === 'auto' && !c.creature && (s.kind === 'practice' || (s.kind === 'lab' && !s.projectUid))) {
    const best = bestStudy(c, d, cov, year, season, chars ?? [], d.isMagus ? focusArts(d) : [], data);
    if (best && best.xp >= 5 && best.xp > (s.kind === 'practice' ? 4 : 2)) return runActivity(c, d, ctx, cov, data, year, season, rng, best.standing, chars);
  }
  return runActivity(c, d, ctx, cov, data, year, season, rng, s, chars);
}

/**
 * One of the extra seasons a character who needs no sleep has: what was chosen for them (practice
 * of the work Ability unless set), never lab work. Logged as an extra season.
 */
export function runExtraSeason(c: Character, d: DerivedCharacter, ctx: CharacterContext, cov: Covenant | undefined, data: GameData, year: number, season: Season, rng: Rng, chars?: Character[]): string[] {
  const want = c.seasons?.extra;
  // a lesson or lab help is worked out before the season's other work; here it did not happen
  const missed = want?.kind === 'teach' ? `No lesson: ${NO_LESSON.get(c) ?? 'no student had the season free'}` : want?.kind === 'assist' ? `No lab help: ${NO_HELP.get(c) ?? 'the magus did no lab work'}` : '';
  const s: StandingActivity = missed || !want || want.kind === 'auto' || want.kind === 'lab' || want.kind === 'work' ? { kind: 'practice', target: (!missed && want?.target) || workAbility(d) } : want;
  // a magic character learns nothing by practice while its Might comes off the total (RoP: Magic): the season is not wasted on it
  if (s.kind === 'practice' && d.magicChar && d.magicChar.might > 0 && !c.creature?.familiarOf) {
    const t = s.target?.split(':')[1];
    if (!t || !computeStudy(d, { kind: 'practice', quality: 4, subject: '' }, { abilityUid: t }).xp)
      return [`Extra season: ${missed ? `${missed}. ` : ''}nothing it could learn by practice (its Might ${d.magicChar.might} comes off every Advancement Total). Set its extra seasons to teach or to help in a lab, or plan one that eats vis.`];
  }
  if (s.kind === 'none') return missed ? [`Extra season: ${missed}.`] : [];
  const before = c.seasonLog.length;
  const out = runActivity(c, d, ctx, cov, data, year, season, rng, s, chars);
  if (missed) out.unshift(`${missed}.`);
  for (const e of c.seasonLog.slice(before)) {
    e.extra = true;
    e.summary = `Extra season (needs no sleep): ${e.summary}`;
  }
  return out.map((l) => `Extra season: ${l}`);
}

function runActivity(c: Character, d: DerivedCharacter, ctx0: CharacterContext, cov: Covenant | undefined, data: GameData, year: number, season: Season, rng: Rng, s: StandingActivity, chars?: Character[]): string[] {
  // lab work and study from vis under the covenant's laboratory aura (the magestones), when one is free
  const labWork = (s.kind === 'lab' && (!!s.projectUid || !!c.projects?.some((p) => !p.done))) || s.kind === 'vis';
  const stone = labWork ? labAuraFor(c, cov, ctx0, year, season, { take: true, faerieMagic: d.virtues.some((v) => v.cv.defId === 'faerie-magic') }) : undefined;
  const ctx = stone ?? ctx0;
  if (stone && cov?.labAura) {
    const out = runActivityIn(c, d, ctx, cov, data, year, season, rng, s, chars);
    return out.map((l, i) => (i === 0 ? `${l} (Under ${cov.labAura!.name}: a ${cov.labAura!.realm} aura of ${cov.labAura!.strength}.)` : l));
  }
  return runActivityIn(c, d, ctx, cov, data, year, season, rng, s, chars);
}

function runActivityIn(c: Character, d: DerivedCharacter, ctx: CharacterContext, cov: Covenant | undefined, data: GameData, year: number, season: Season, rng: Rng, s: StandingActivity, chars?: Character[]): string[] {
  // an Ability the season begins (Worship's Church Lore) is kept on its entry, for Unlog
  const had = { abilities: [...c.abilities] };
  const log = (activity: SeasonLogEntry['activity'], summary: string, gains: Record<string, number>, warping = 0, undo?: SeasonLogEntry['undo']) => {
    const e = newSeasonEntry(year, season, activity, summary, gains);
    if (warping) e.warpingPoints = warping;
    if (undo || begunUndo(had, c).abilities) e.undo = { ...undo, ...begunUndo(had, c) };
    applySeason(c, e, 1);
    c.seasonLog.push(e);
    return e;
  };
  const target = (t?: string) => {
    if (!t) return null;
    const [k, id] = t.split(':');
    if (k === 'art') return { art: id as Art, label: ART_NAMES[id as Art] };
    // an Ability added this season (Intrigue for politics) is not in the derived character yet
    const own = c.abilities.find((x) => x.uid === id);
    const fallback = own ? [data.abilityById.get(own.abilityId)?.name, own.param].filter(Boolean).join(': ') : '';
    return { abilityUid: id, label: d.abilityByUid.get(id)?.name ?? (fallback || 'an Ability') };
  };
  const theory = d.abilities.find((a) => a.abilityId === d.theoryAbility);
  // nothing as planned this season: it goes to what it would have been unplanned, rather than nothing
  const instead = (why: string, target?: string) => {
    const was = c.standing;
    c.standing = { kind: 'auto', target };
    const out = runStanding(c, d, ctx, cov, data, year, season, rng, chars);
    c.standing = was;
    return out.length ? [`${why} Instead: ${out[0]}`, ...out.slice(1)] : [why];
  };
  // only a magus learns the Hermetic Arts (Hedge Magic, line 433): a study of an Art set for anyone else
  // (by an older version, or a magus who is one no longer) goes to what they would do unplanned
  const studied = s.target;
  if (studied?.startsWith('art:') && !learnsArts(d) && ['exposure', 'read', 'vis', 'taught', 'practice'].includes(s.kind)) {
    return instead(`${c.name || 'They'} cannot study ${ART_NAMES[studied.slice(4) as Art] ?? 'an Art'}: only a magus learns the Hermetic Arts.`);
  }
  switch (s.kind) {
    case 'none':
      return [];
    case 'teach':
      // a lesson is given before the season's other work (advanceSeason): here there was none
      return instead(`No lesson this season: ${NO_LESSON.get(c) ?? 'no student had the season free'}.`);
    case 'assist': {
      const m = chars?.find((x) => x.id === s.helps);
      return instead(`No help in the lab this season: ${NO_HELP.get(c) ?? cannotHelp(c, d, m) ?? `${m?.name || 'the magus'} did no lab work`}.`);
    }
    case 'exposure': {
      const t = target(s.target);
      if (!t) return [];
      const r = computeStudy(d, { kind: 'exposure', subject: t.label }, 'art' in t ? { art: t.art } : { abilityUid: t.abilityUid });
      log('exposure', `Exposure: ${t.label} (+${r.xp} xp)`, r.xp ? { [s.target!]: r.xp } : {});
      return [`Exposure in ${t.label}: +${r.xp} xp.${mightNote(d, r.xp)}`];
    }
    case 'priorities': {
      const { choice, tried } = choosePriority(c, d, ctx, cov, data, year, season, rng, chars);
      if (!choice) return [`Priorities: nothing on the list can be done (${tried.map((t) => `${priorityLabel(t.kind)}: ${t.why}`).join('; ') || 'the list is empty'}).`];
      const before = c.seasonLog.length;
      // lab work is done on the project chosen, as if it were the standing activity
      const was = c.standing;
      if (choice.standing.kind === 'lab') c.standing = choice.standing;
      const out = runActivity(c, d, ctx, cov, data, year, season, rng, choice.standing, chars);
      if (choice.after === 'face-trouble' && cov && choice.troubleUid) out.push(...faceTrouble(cov, c, choice.troubleUid, year, season));
      if (choice.after === 'improve-income' && cov) out.push(...magicalImprovement(cov, c, (chars ?? []).filter((m) => cov.memberIds.includes(m.id)), year));
      c.standing = was;
      for (const e of c.seasonLog.slice(before)) e.priority = choice.kind;
      return [`${priorityLabel(choice.kind)}: ${choice.what}.`, ...out];
    }
    case 'read': {
      const b = cov?.library.find((x) => x.uid === s.bookUid);
      if (!b || (b.kind !== 'summa' && b.kind !== 'tractatus')) return ['Read: the book is not in the covenant’s library.'];
      if (b.kind === 'tractatus' && b.readBy?.includes(c.id)) return [`${b.title} has been read already: a tractatus teaches once.`];
      // the same rule as Plan a season's: a book in a language the reader cannot read, or on an Ability
      // they cannot study, is passed over (DE line 16191)
      const why = studyProblem(c, d, data, b);
      if (why) return instead(`${c.name || 'The character'} cannot study ${b.title}: ${why}.`);
      // the book's own Art or Ability, begun at 0 when the character has none (as Plan a season does)
      const had = { abilities: [...c.abilities] };
      const key = bookTarget(c, data, b, true);
      const t = target(key);
      if (!key || !t) return ['Read: the book is not in the covenant’s library.'];
      const src = b.kind === 'summa' ? { kind: 'summa' as const, quality: b.quality, level: b.level, isArt: 'art' in t, subject: b.title } : { kind: 'tractatus' as const, quality: b.quality, isArt: 'art' in t, subject: b.title };
      const r = computeStudy(d, src, 'art' in t ? { art: t.art } : d.abilityByUid.has(t.abilityUid) ? { abilityUid: t.abilityUid } : { newAbility: { abilityId: b.subject, param: b.param } });
      const e = newSeasonEntry(year, season, 'study-book', `Read ${b.title}: ${t.label} (+${r.xp} xp)`, r.xp ? { [key]: r.xp } : {});
      e.bookId = b.uid;
      e.sourceQuality = r.advancementTotal;
      if (b.kind === 'tractatus' && cov) e.undo = { tractatus: { covenantId: cov.id, bookUid: b.uid } };
      if (begunUndo(had, c).abilities) e.undo = { ...e.undo, ...begunUndo(had, c) };
      applySeason(c, e, 1);
      c.seasonLog.push(e);
      if (b.kind === 'tractatus') b.readBy = [...(b.readBy ?? []), c.id];
      return [`Read ${b.title} (${b.kind === 'summa' ? `summa, Level ${b.level}` : 'tractatus'}, Quality ${b.quality}): ${t.label} +${r.xp} xp.${mightNote(d, r.xp)}`];
    }
    case 'practice': {
      if (!s.target) {
        // one with no Ability yet has nothing to practice (and asking again would never end)
        const work = workAbility(d);
        if (!work) return [`${c.name || 'They'} has no Ability to practice yet: give them one, or set another standing activity.`];
        return runActivity(c, d, ctx, cov, data, year, season, rng, { kind: 'practice', target: work }, chars);
      }
      const t = target(s.target);
      if (!t || 'art' in t) return t ? [`Arts cannot be practiced; set another standing activity.`] : [];
      const r = computeStudy(d, { kind: 'practice', quality: 4, subject: t.label }, { abilityUid: t.abilityUid });
      log('practice', `Practice: ${t.label} (+${r.xp} xp)`, r.xp ? { [s.target!]: r.xp } : {});
      return [`Practiced ${t.label}: +${r.xp} xp.${mightNote(d, r.xp)}`];
    }
    case 'vis': {
      const t = target(s.target);
      if (!t || !('art' in t)) return ['Study from vis needs an Art.'];
      const art = t.art as Art;
      const pawns = visForStudy(d.arts[art].score);
      const fromCov = s.visFrom === 'covenant' && !!cov;
      const from = fromCov ? cov!.visStocks : purseOf(c).vis;
      const paid = takeVis(from, [art], pawns);
      if (!paid.ok) return [`No ${pawns} pawn${pawns > 1 ? 's' : ''} of ${ART_NAMES[art]} vis in ${fromCov ? 'the covenant’s stores' : 'the purse'} to study.`];
      const r = stressDie(pawns, rng);
      const aura = ctx.aura.realm === 'Magic' ? ctx.aura.strength : 0;
      const spent = { vis: { from: fromCov ? ('covenant' as const) : ('purse' as const), covenantId: fromCov ? cov!.id : undefined, taken: paid.taken } };
      if (r.botches) {
        const e = log('study-vis', `Studied ${ART_NAMES[art]} vis: ${describeStress(r)}: botch`, {}, r.botches, spent);
        // a double botch: Twilight, owed in Resolve (warping.ts)
        const follows = seasonWarping(c, d, e, 'from studying vis', !!cov?.living || !!c.wanderer);
        return [`Studied ${ART_NAMES[art]} vis (${pawns} pawns): BOTCH, ${r.botches} Warping Point${r.botches > 1 ? 's' : ''}.${follows ? ` ${follows}` : ''}`];
      }
      const res = computeStudy(d, { kind: 'vis', art, dieRoll: r.value, aura }, { art });
      const e = newSeasonEntry(year, season, 'study-vis', `Studied ${ART_NAMES[art]} vis: ${describeStress(r)} (+${res.xp} xp)`, { [`art:${art}`]: res.xp });
      e.visUsed = [{ art, pawns }];
      e.undo = spent;
      applySeason(c, e, 1);
      c.seasonLog.push(e);
      return [`Studied ${ART_NAMES[art]} from ${pawns} pawn${pawns > 1 ? 's' : ''} of vis: ${describeStress(r)} + aura ${aura}, +${res.xp} xp.`];
    }
    case 'taught': {
      // a lesson from another character is given before the season's other work (advanceSeason): here there was none
      if (s.teacher?.startsWith('char:')) {
        const who = chars?.find((x) => x.id === s.teacher!.slice(5));
        return instead(`Not taught this season: ${NO_LESSON.get(c) ?? `${who?.name || 'the teacher'} had no season free to teach`}.`);
      }
      const t = target(s.target);
      const sp = s.teacher?.startsWith('spec:') ? cov?.specialists.find((x) => x.uid === s.teacher!.slice(5)) : undefined;
      const keep = t && !('art' in t) ? s.target : undefined;
      if (!t || !sp) return instead('Taught: choose the teacher and the subject.', keep);
      if ('art' in t) return instead(`${sp.name || 'The teacher'} cannot teach a Hermetic Art (teachers have no Gift).`, keep);
      // the drill sergeant drills the whole turb together, one season a year (Grogs); a teacher teaches two seasons a year (DE p.180)
      const drill = sp.role === 'drill-sergeant';
      const sameLesson = drill && sp.taught?.year === year && sp.taught.season === season;
      const limit = drill ? 1 : 2;
      if (!sameLesson && sp.taught?.year === year && sp.taught.seasons >= limit) return instead(`${sp.name || 'The teacher'} has taught ${drill ? 'the turb one season' : 'two seasons'} this year already (${drill ? 'Grogs' : 'DE p.180'}).`, keep);
      const mine = c.abilities.find((a) => a.uid === t.abilityUid);
      const theirs = specAbilities(sp).find((a) => a.id === mine?.abilityId && (a.param ?? '') === (mine?.param ?? ''));
      if (!theirs) return instead(`${sp.name || 'The teacher'} does not know ${t.label}.`, keep);
      // a lab's Teaching Specialization adds to teaching done there, at most +3 (Covenants ch.9)
      const lab = sp.teachIn ? cov?.labs.find((l) => l.uid === sp.teachIn) : undefined;
      const labTeaching = lab ? Math.min(3, deriveLab(lab, data).specializations.Teaching ?? 0) : 0;
      const r = computeStudy(d, { kind: 'teacher', com: specChar(sp, 'Com'), teaching: sp.teaching ?? 0, teacherScore: theirs.score, students: drill ? 3 : 1, goodTeacher: !!sp.goodTeacher, isArt: false, subject: t.label, labTeaching }, { abilityUid: t.abilityUid });
      if (!r.xp && r.capped) return instead(`${sp.name || 'The teacher'} knows no more ${t.label} than ${c.name || 'the student'} does.`, keep);
      log('taught', `Taught by ${sp.name || 'a teacher'}: ${t.label} (+${r.xp} xp)`, r.xp ? { [s.target!]: r.xp } : {}, 0, sameLesson ? undefined : { specialist: { covenantId: cov!.id, uid: sp.uid, taught: sp.taught && { ...sp.taught } } });
      if (!sameLesson) sp.taught = { year, seasons: (sp.taught?.year === year ? sp.taught.seasons : 0) + 1, season };
      return [`Taught ${t.label} by ${sp.name || 'a teacher'}: Quality ${r.sourceQuality}, +${r.xp} xp${r.capped ? ' (as far as the teacher knows)' : ''}.${mightNote(d, r.xp)}`];
    }
    case 'worship': {
      const key = worshipAbility(c, d);
      const uidOf = key.split(':')[1];
      const label = d.abilityByUid.get(uidOf)?.name ?? 'Church Lore';
      const dominion = ctx.aura.realm === 'Divine' ? ctx.aura.strength : WORSHIP_AURA;
      const r = computeStudy(d, { kind: 'worship', quality: dominion, subject: label }, { abilityUid: uidOf });
      log('worship', `Worship: ${label} (+${r.xp} xp)`, r.xp ? { [key]: r.xp } : {});
      return [`A season of Worship: ${label} +${r.xp} xp (a Dominion of ${dominion}).${mightNote(d, r.xp)}`];
    }
    case 'work': {
      if (!c.workshop) return runActivity(c, d, ctx, cov, data, year, season, rng, { kind: 'exposure', target: workAbility(d) }, chars);
      return workshopSeason(c, d, year, season, { rng });
    }
    case 'write': {
      const p = writingFor(c, s.projectUid);
      if (!p) {
        // nothing left to write: the season goes to what it would have been unplanned
        const was = c.standing;
        c.standing = { kind: 'auto' };
        const out = runStanding(c, d, ctx, cov, data, year, season, rng, chars);
        c.standing = was;
        return ['No writing to work on.', ...out];
      }
      return workWriting(c, d, cov, p, year, season, data);
    }
    case 'lab': {
      const lines: string[] = [];
      const open = (c.projects ?? []).filter((x) => !x.done);
      let p = open.find((x) => x.uid === s.projectUid);
      // left to the clock, or once the project set for every season is done, a magus works the first project the lab and the vis allow
      if (c.standing?.kind !== 'lab' || !p) {
        const workable = (x: LabProject) => {
          const plan = planProject(x, c, d, ctx, { subject: chars?.find((y) => y.id === x.subjectId), data, horoscope: hopedHoroscope(c, x) });
          return !plan.problems.length && !visShort(x, c, ctx, plan);
        };
        // vis extraction only by choice (a priority, or the project set): never left to the clock
        p = open.find((x) => x.kind !== 'extract' && workable(x)) ?? p;
      }
      const helpers = LAB_HELP.get(c);
      // what Unlog would take back: the project as it was, the vis spent, the Warping
      const before = p ? structuredClone(c) : undefined;
      const covBefore = p && cov ? structuredClone(cov) : undefined;
      if (p) lines.push(...workProject(c, d, ctx, cov, p.uid, data, year, { rng, chars, season, helpers }));
      const helped = (helpers ?? []).filter((h) => h.used);
      if (helped.length) lines.push(`Helped by ${helped.map((h) => `${h.c.name || 'an assistant'} (+${h.value})`).join(' and ')}.`);
      const gains: Record<string, number> = theory ? { [`ability:${theory.uid}`]: 2 } : {};
      log('other', p ? `Lab: ${p.name}` : 'Lab work', gains, 0, p && before ? labUndo(before, c, p.uid, covBefore, cov) : undefined);
      if (p) {
        const e = c.seasonLog[c.seasonLog.length - 1];
        e.labKind = p.kind;
        e.told = labTold(c.projects?.find((y) => y.uid === p!.uid) ?? p, c);
      }
      lines.push(theory ? `Lab work: +2 xp Exposure in ${theory.name}.` : 'Lab work.');
      return lines;
    }
    default:
      return [];
  }
}

/** What the Chronicle needs to know of a covenant: its aura and its road. */
function chronicleCovenant(cov: Covenant): ChronicleFacts['covenants'][number] {
  const hook = (re: RegExp, size?: string) => cov.hooksBoons.some((h) => re.test(h.name) && (!size || h.size === size));
  return {
    name: cov.name || 'The covenant',
    realm: auraOf(cov).realm,
    road: hook(/^road$/i, 'Major') ? 'major' : hook(/^road$/i) ? 'minor' : undefined,
    urban: hook(/^urban$/i),
    remote: hook(/isolated|remote|hidden/i),
  };
}

/** A living covenant's magus at a Tribunal gathering: the season goes to it (Exposure in Intrigue), as politics. */
function attendGathering(c: Character, d: DerivedCharacter, ctx: CharacterContext, cov: Covenant | undefined, data: GameData, year: number, season: Season, rng: Rng, g: { name: string; at: string }): string[] {
  const a = ensureAbility(c, 'intrigue', {});
  const before = c.seasonLog.length;
  const out = runActivity(c, d, ctx, cov, data, year, season, rng, { kind: 'exposure', target: `ability:${a.uid}` });
  for (const e of c.seasonLog.slice(before)) {
    e.priority = 'politics';
    e.summary = `Attended ${g.name} at ${g.at}: ${e.summary}`;
    e.told = gatheringTold(g.name, g.at);
  }
  return [`Attended ${g.name} at ${g.at}.`, ...out];
}

type Passes = { derive: (c: Character) => DerivedCharacter; ctxOf: (c: Character) => CharacterContext; tribunalOf: (c: Character) => string | undefined; data: GameData; year: number; season: Season };

/** Standing activities a student's request may take a teacher's season from: nothing set that matters more. */
const FREE_FOR_LESSON: StandingActivity['kind'][] = ['auto', 'practice', 'exposure', 'none'];

/**
 * Lessons between characters, before the season's other work: a teacher set to teach (in its season,
 * or an extra one when it needs no sleep), or asked by students set to be taught by it, teaches the
 * lesson that teaches the most to those free this season. Those taught have spent their season.
 */
function seasonLessons(chars: Character[], x: Passes): Line[] {
  const { year, season, data } = x;
  const lines: Line[] = [];
  const playing = chars.filter(inPlay);
  const ds = new Map<string, DerivedCharacter>();
  const D = (c: Character) => ds.get(c.id) ?? ds.set(c.id, x.derive(c)).get(c.id)!;
  const free = (c: Character) => !seasonBusy(c, year, season);
  // only those set to teach, to be taught by a character, or asked by one, need a look (the Tribunal's magi follow their lists)
  const askers = playing.filter((s) => s.standing?.kind === 'taught' && s.standing.teacher?.startsWith('char:'));
  const askedOf = new Set(askers.map((s) => s.standing!.teacher!.slice(5)));
  for (const t of playing.filter((y) => y.standing?.kind === 'teach' || y.seasons?.extra?.kind === 'teach' || askedOf.has(y.id))) {
    // one who needs no sleep may teach in an extra season and in its own
    for (const slot of ['extra', 'main'] as const) {
      const td = D(t);
      const own = free(t) ? resolveStanding(t, td, year) : undefined;
      const extra = extraFree(t, td, year, season) ? t.seasons?.extra ?? { kind: 'auto' as const } : undefined;
      const asked = askers.filter((s) => s.id !== t.id && free(s) && ((st) => st.kind === 'taught' && st.teacher === `char:${t.id}`)(resolveStanding(s, D(s), year)));
      const here = slot === 'extra' ? extra : own;
      // set to teach in this season, or asked by students with nothing else set for it
      const st = here?.kind === 'teach' ? here : undefined;
      if (!here || (!st && (!asked.length || !FREE_FOR_LESSON.includes(here.kind)))) {
        if (slot === 'main') for (const s of asked) NO_LESSON.set(s, `${t.name || 'the teacher'} has ${free(t) ? 'other work set for' : 'spent'} the season`);
        continue;
      }
      const named = (st?.students ?? []).map((id) => playing.find((y) => y.id === id)).filter((y): y is Character => !!y && y.id !== t.id && free(y));
      const pool = [...new Map([...named, ...asked].map((y) => [y.id, y])).values()];
      if (!pool.length) {
        NO_LESSON.set(t, st?.students?.length ? 'none of the students chosen has the season free' : 'choose the students');
        continue;
      }
      const wants = new Map(asked.map((s) => [s.id, resolveStanding(s, D(s), year).target]));
      const labTeaching = Math.min(3, x.ctxOf(t).lab?.specializations.Teaching ?? 0);
      // students the teacher named are all taught (up to what Teaching allows), not only those who gain most
      const r = bestLesson({ c: t, d: td }, pool.map((y) => ({ c: y, d: D(y) })), data, { subject: st?.target, wants, labTeaching, all: named.length > 0 });
      for (const [id, why] of r.why) {
        const s = playing.find((y) => y.id === id);
        if (s) NO_LESSON.set(s, why.replace(/\.$/, ''));
      }
      if (!r.plan) {
        NO_LESSON.set(t, [...r.why.values()].join(' ').replace(/\.$/, '') || 'no student would gain from it');
        continue;
      }
      for (const l of giveLesson({ c: t, d: td }, r.plan, year, season, { extra: slot === 'extra', asked: !st })) lines.push({ who: l.who.name || 'Unnamed', kind: 'season', text: l.text, tribunal: x.tribunalOf(l.who) });
      for (const c of [t, ...r.plan.students.map((w) => w.s.c)]) ds.set(c.id, x.derive(c));
    }
  }
  return lines;
}

/**
 * Who helps whom in the lab this season, worked out before the season's work: those set to help (in
 * their season or an extra one), and a familiar's extra seasons left to the clock, which go to its
 * magus. A magus takes as many as Leadership allows. Returns the helpers whose seasons wait on the
 * magus's lab work.
 */
function seasonHelpers(chars: Character[], x: Passes): Map<Character, LabHelper> {
  const { year, season } = x;
  const playing = chars.filter(inPlay);
  const byMagus = new Map<Character, LabHelper[]>();
  // only those set to help, and familiars with extra seasons, need a look
  for (const h of playing.filter((y) => y.standing?.kind === 'assist' || y.seasons?.extra?.kind === 'assist' || y.creature?.familiarOf)) {
    const hd = x.derive(h);
    const own = seasonBusy(h, year, season) ? undefined : resolveStanding(h, hd, year);
    const extra = extraFree(h, hd, year, season) ? h.seasons?.extra ?? { kind: 'auto' as const } : undefined;
    let slot: 'main' | 'extra' | undefined;
    let helps: string | undefined;
    if (own?.kind === 'assist') [slot, helps] = ['main', own.helps];
    else if (extra?.kind === 'assist') [slot, helps] = ['extra', extra.helps];
    else if (extra?.kind === 'auto' && h.creature?.familiarOf) [slot, helps] = ['extra', h.creature.familiarOf];
    if (!slot) continue;
    const m = playing.find((y) => y.id === helps);
    const spent = m && seasonBusy(m, year, season) ? loggedThisSeason(m, year, season).find((e) => !e.extra && e.activity !== 'adventure') : undefined;
    const why = cannotHelp(h, hd, m) ?? (spent ? `${m!.name || 'the magus'}’s season is spent otherwise (${spent.summary})` : undefined);
    if (why || !m) {
      if (own?.kind === 'assist' || extra?.kind === 'assist') NO_HELP.set(h, why ?? 'choose the magus to help');
      continue;
    }
    byMagus.set(m, [...(byMagus.get(m) ?? []), { c: h, d: hd, value: helpValue(hd), familiar: h.creature?.familiarOf === m.id, extra: slot === 'extra' }]);
  }
  const waiting = new Map<Character, LabHelper>();
  for (const [m, all] of byMagus) {
    const ranked = [...all].sort((a, b) => Number(b.familiar) - Number(a.familiar) || b.value - a.value);
    const cap = maxHelpers(x.derive(m), ranked.some((h) => h.familiar));
    const kept = ranked.slice(0, cap);
    for (const h of ranked.slice(cap)) NO_HELP.set(h.c, `${m.name || 'the magus'} can use ${cap} helper${cap > 1 ? 's' : ''} a season (Leadership)`);
    LAB_HELP.set(m, kept);
    for (const h of kept) waiting.set(h.c, h);
  }
  return waiting;
}

/** Move the saga on by one season. Returns the new state (the input is left as it was) and what happened. */
export function advanceSeason(input: SagaState, data: GameData, o: AdvanceOptions = DEFAULT_ADVANCE): { state: SagaState; report: TimeReport } {
  const state: SagaState = structuredClone(input);
  const rng = o.rng ?? defaultRng;
  const { saga } = state;
  const year = saga.currentYear;
  const season = saga.currentSeason;
  const lines: Line[] = [];
  const derive = (c: Character) => deriveCharacter(c, data, saga.houseRules);
  const ctxOf = (c: Character) => characterContext(c, state.covenants, data);

  // the living covenants of the Tribunal (built from its book): their lines are kept apart in the report
  const living = livingIds(state.covenants, state.characters);
  const tribunalOf = (c: Character) => (living.members.has(c.id) ? covenantOf(c, state.covenants)?.id ?? state.covenants.find((x) => x.memberIds.includes(c.id))?.id ?? 'wanderers' : undefined);
  const gathering = gatheringIn(saga, year, season);
  const houseGathering = houseGatheringIn(saga, year, season);
  const g = { data, saga, rules: saga.houseRules };
  // the wanderers who winter at a covenant and summer on the road move first
  for (const l of wanderersSeasonStart(state, year, season, rng)) lines.push({ ...l, kind: 'season' });
  // a familiar's own sheet learns as a human does while it is bound
  bindFamiliarSheets(state.characters);

  // lessons between characters, and who helps whom in the lab, are settled before the season's work
  const passes: Passes = { derive, ctxOf, tribunalOf, data, year, season };
  if (o.fillUnplanned) lines.push(...seasonLessons(state.characters, passes));
  const helping = o.fillUnplanned ? seasonHelpers(state.characters, passes) : new Map<Character, LabHelper>();

  // the season's work: what each character logged, or its standing activity; and an extra season for one who needs no sleep
  for (const c of state.characters.filter(inPlay)) {
    if (!o.fillUnplanned) continue;
    const d = derive(c);
    const ctx = ctxOf(c);
    const cov = covenantOf(c, state.covenants);
    const tribunal = tribunalOf(c);
    const helper = helping.get(c);
    // an adventure shares the season with other work (DE): only other logged activities fill it
    if (!seasonBusy(c, year, season) && !(helper && !helper.extra)) {
      // a living covenant's magi spend a gathering's season at the Tribunal
      // and its magi of a House at their House's own gathering
      const meets = gathering ?? (houseGathering && c.house === houseGathering.house ? houseGathering : undefined);
      const out = meets && tribunal && d.isMagus && c.standing?.kind !== 'none' ? attendGathering(c, d, ctx, cov, data, year, season, rng, meets) : runStanding(c, d, ctx, cov, data, year, season, rng, state.characters);
      for (const t of out) lines.push({ who: c.name || 'Unnamed', kind: 'season', text: t, tribunal });
    }
    if (extraFree(c, d, year, season) && !helper?.extra)
      for (const t of runExtraSeason(c, d, ctx, cov, data, year, season, rng, state.characters)) lines.push({ who: c.name || 'Unnamed', kind: 'season', text: t, tribunal });
  }
  // the helpers' seasons, once the magi's lab work is done: Exposure in Magic Theory, or their own work if there was none to help with
  for (const [c, h] of helping) {
    const d = derive(c);
    const tribunal = tribunalOf(c);
    const out: string[] = [];
    const magus = [...state.characters].find((m) => LAB_HELP.get(m)?.includes(h));
    if (h.used) {
      const had = { abilities: [...c.abilities] };
      const mt = ensureAbility(c, 'magic-theory', {});
      const r = computeStudy(d, { kind: 'exposure', subject: 'Magic Theory' }, { abilityUid: mt.uid });
      const e = newSeasonEntry(year, season, 'other', `${h.extra ? 'Extra season (needs no sleep): ' : ''}Helped ${magus?.name || 'a magus'} in the lab: ${h.used} (+${r.xp} xp Exposure in Magic Theory)`, r.xp ? { [`ability:${mt.uid}`]: r.xp } : {});
      if (h.extra) e.extra = true;
      if (begunUndo(had, c).abilities) e.undo = begunUndo(had, c);
      // logged with the magus's lab season: Unlog takes back both (owner.md, Decided)
      const lab = magus?.seasonLog.find((x) => x.year === year && x.season === season && !!x.labKind && !x.extra);
      if (lab) e.link = lab.link ??= uid();
      e.told = helperTold(magus?.name || 'a magus');
      applySeason(c, e, 1);
      c.seasonLog.push(e);
      out.push(`${h.extra ? 'Extra season: ' : ''}Helped ${magus?.name || 'a magus'} in the lab (${h.used}): +${h.value} to the Lab Total; Exposure in Magic Theory +${r.xp} xp.${mightNote(d, r.xp)}`);
    } else {
      NO_HELP.set(c, `${magus?.name || 'the magus'} did no lab work this season`);
      out.push(...(h.extra ? runExtraSeason(c, d, ctxOf(c), covenantOf(c, state.covenants), data, year, season, rng, state.characters) : runStanding(c, d, ctxOf(c), covenantOf(c, state.covenants), data, year, season, rng, state.characters)));
    }
    for (const t of out) lines.push({ who: c.name || 'Unnamed', kind: 'season', text: t, tribunal });
  }
  if (houseGathering && living.covenants.size)
    saga.tribunalNews = [
      { uid: uid(), year, season, kind: 'gathering', text: `${houseGathering.name} meets at ${houseGathering.at} this ${season}: the followers of ${houseGathering.house.replace(/^./, (x) => x.toUpperCase())} gather there, and its living magi spend the season at it.` },
      ...(saga.tribunalNews ?? []),
    ];
  const gatheringItem = gatheringNews(saga, year, season);
  if (gatheringItem && living.covenants.size) {
    saga.tribunalNews = [gatheringItem, ...(saga.tribunalNews ?? [])];
    // the gathering's business: promotions, the motions due, certamen between magi at odds
    const r = tribunalGathering(state, g, year, season, rng);
    for (const l of r.lines) lines.push({ ...l, kind: 'covenant' });
    if (r.news.length) saga.tribunalNews = [...r.news, ...saga.tribunalNews];
  }

  // what the Chronicle tells of the players' covenants' year
  const yearFacts = new Map<string, NonNullable<ChronicleFacts['covenants'][number]>>();
  const owedBefore = new Map(state.characters.map((c) => [c.id, c.owed?.length ?? 0]));
  // the turn of the year (after Winter): covenants, then each character's year
  if (season === 'Winter') {
    const wasAlive = new Set(state.characters.filter(inPlay).map((c) => c.id));
    const yearStart = lines.length;
    for (const cov of state.covenants) {
      const members = state.characters.filter((c) => cov.memberIds.includes(c.id));
      // each source of income has its year: a stress die on the Income Modification table, unless the storyguide set it
      const incomes = !cov.living && o.yearEnd.rollIncome ? rollIncomeYear(cov, rng) : undefined;
      for (const i of incomes?.filter((x) => x.mod !== 'Status Quo') ?? []) lines.push({ who: cov.name, kind: 'money', text: `${i.name}: ${i.mod} this year (Income Modification).` });
      const dc = deriveCovenant(cov, data, state.characters);
      const ye = { ...o.yearEnd, inflation: o.yearEnd.inflation && optionOn(saga, 'inflation') };
      const skip = [...(o.yearEnd.skipVis ?? []), ...(cov.yearEnd?.skipVis ?? [])];
      const plan = planYearEnd(cov, dc, { ...ye, skipVis: skip });
      applyYearEnd(cov, plan, year, ye);
      if (!cov.living)
        yearFacts.set(cov.id, {
          ...chronicleCovenant(cov),
          incomes,
          vis: ye.harvestVis ? cov.visSources.filter((s) => !skip.includes(s.uid) && s.pawnsPerYear > 0).map((s) => ({ name: s.name, art: s.art, pawns: s.pawnsPerYear })) : [],
          balance: plan.balance,
          treasury: cov.finances.treasury,
          feasts: plan.feasts,
        });
      lines.push({ who: cov.name, kind: 'covenant', text: plan.lines.join(' ') });
      for (const t of payAllowance(cov, members, plan.balance, plan.vis, year, season)) lines.push({ who: cov.name, kind: 'money', text: t });
      lines.push(...hookReminders(cov, year));
      // hard times: bills left unpaid, and the spending left unpaid brings its trouble
      lines.push(...hardshipYearEnd(cov, data, year, members));
      // calamities' troubles pass a year; a living covenant hires new covenfolk for those lost
      for (const t of troublesYearEnd(cov, plan.balance >= 0 && cov.finances.treasury > 0)) lines.push({ who: cov.name, kind: 'covenant', text: t });
      for (const t of covenfolkYearEnd(cov, year)) lines.push({ who: cov.name, kind: 'covenant', text: t });
      for (const t of [...scriptoriumYear(cov, data), ...libraryYearEnd(cov, year, data)]) lines.push({ who: cov.name, kind: 'covenant', text: t });
      for (const s of cov.specialists.filter((x) => x.hired && x.hired.until <= year)) lines.push({ who: cov.name, kind: 'covenant', text: `${s.name || 'The hired teacher'} has taught the time paid for, and leaves.` });
      cov.specialists = cov.specialists.filter((x) => !x.hired || x.hired.until > year);
      lines.push(...auraYearEnd(cov, members, saga, year, rng, derive));
      for (const t of covenfolkWarpingYearEnd(cov, year)) lines.push({ who: cov.name, kind: 'warping', text: t });
    }
    // each covenant's best hand at Medicine tends its people through a crisis
    const attendants = new Map(state.covenants.map((cov) => [cov.id, covenantAttendants(cov, state.characters, derive)]));
    for (const c of state.characters.filter(inPlay)) {
      const d = derive(c);
      const home = covenantOf(c, state.covenants);
      const doc = home ? attendants.get(home.id)?.find((a) => a.id !== c.id) : undefined;
      const tribunal = tribunalOf(c);
      // a magus's body in Twilight "is completely immune to magic, mundane damage, aging, and hunger" (DE line
      // 9806): a year spent wholly in it is not aged
      if (twilightYear(c, year)) lines.push({ who: c.name || 'Unnamed', kind: 'year', text: `${c.name || 'The magus'} spent ${year} in Wizard’s Twilight, and did not age (DE, Wizard’s Twilight).`, tribunal });
      else lines.push(...ageCharacter(c, d, ctxOf(c), year, rng, o.rollAging, doc).map((l) => ({ ...l, tribunal })));
      for (const t of workshopYearEnd(c, d, year)) lines.push({ who: c.name || 'Unnamed', kind: 'year', text: t, tribunal });
      for (const t of redcapYearEnd(c, data, rng)) lines.push({ who: c.name || 'Unnamed', kind: 'year', text: t, tribunal });
    }
    // a living covenant's year-end lines go with the Tribunal's
    for (const l of lines.slice(yearStart)) if (!l.tribunal && state.covenants.some((x) => x.living && x.name === l.who)) l.tribunal = state.covenants.find((x) => x.living && x.name === l.who)!.id;
    if (living.covenants.size) {
      const r = livingYearEnd(state, g, year, rng, wasAlive);
      const a = apprenticesYearEnd(state, g, year, rng);
      const w = wanderersYearEnd(state, year, rng);
      for (const l of [...r.lines, ...a.lines, ...w.lines]) lines.push({ ...l, kind: 'covenant' });
      const items = [...r.news, ...a.news, ...w.news];
      if (items.length) saga.tribunalNews = [...items, ...(saga.tribunalNews ?? [])];
    }
    if (saga.tribunalNews && saga.tribunalNews.length > 150) saga.tribunalNews = saga.tribunalNews.slice(0, 150);
  }

  // into the next season: effects run out, wards are renewed, the Might pool and Fatigue recover
  const next = nextSeason(year, season);
  for (const cov of state.covenants) {
    lines.push(...renewCovenantEffects(cov, state.characters, next.year, next.season));
    // a Natural Disaster or a Flawed Resource whose time has come
    lines.push(...hooksComeDue(cov, next.year, next.season));
    // a change to the aura for one season lasts only that season
    const temp = cov.auraTrack?.temp;
    if (temp && seasonIndex(temp.year, temp.season) < seasonIndex(next.year, next.season)) cov.auraTrack!.temp = undefined;
  }
  for (const c of state.characters.filter(inPlay)) {
    for (const t of expireEffects(c, next.year, next.season)) lines.push({ who: c.name || 'Unnamed', kind: 'effect', text: t });
    for (const t of hungerSeason(c)) lines.push({ who: c.name || 'Unnamed', kind: 'warping', text: t, tribunal: tribunalOf(c) });
    for (const t of holySeason(c, next.year, next.season)) lines.push({ who: c.name || 'Unnamed', kind: 'effect', text: t });
    // the rolls this season's work left (a curse woven, a ring first recited, a search): made in Resolve
    oweSeasonEndRolls(c, year, season);
    // a living covenant's people roll what their Warping owes (Twilight, the Witch Moon, Nátt-thel, a Calling): nobody plays them to settle it in Resolve
    const lr = tribunalOf(c) ? livingSeasonEnd(c, derive, ctxOf(c).aura.strength, tribunalOf(c) === 'wanderers' ? undefined : tribunalOf(c), year, season, rng) : undefined;
    for (const t of lr?.lines ?? []) lines.push({ who: c.name || 'Unnamed', kind: 'warping', text: t, tribunal: tribunalOf(c) });
    if (lr?.news.length) saga.tribunalNews = [...lr.news, ...(saga.tribunalNews ?? [])];
    c.fatigueLost = 0;
    c.longTermFatigueLost = 0;
    if (c.creature) {
      c.creature.poolSpent = 0;
      // lost Might Score: a season's rest in a Magic aura of at least a fifth of it brings a point back (RoP: Magic, the book's example)
      const cov = covenantOf(c, state.covenants);
      if (c.creature.mightLost && cov) {
        const aura = covenantAura(cov);
        const score = (deriveCharacter(c, data, saga.houseRules).might?.score ?? 0) + c.creature.mightLost;
        if (aura.realm === 'Magic' && aura.strength >= Math.ceil(score / 5)) {
          c.creature.mightLost -= 1;
          lines.push({ who: c.name || 'Unnamed', kind: 'effect', text: `A season's rest in the aura restores a point of Might Score (${c.creature.mightLost} still lost).` });
        }
      }
    }
  }
  saga.currentYear = next.year;
  saga.currentSeason = next.season;
  const report: TimeReport = { id: uid(), year, season, lines };
  // the season told as a story, for the players' covenants
  const own = state.covenants.filter((c) => !c.living);
  if (own.length) {
    const people = state.characters.filter((c) => c.creation.finalized && own.some((cov) => cov.memberIds.includes(c.id) || c.covenantId === cov.id));
    // what the players' agents heard: the Tribunal's covenants' own business, or their walk of life's
    const reports = agentReports(
      people.filter((c) => inPlay(c) && c.agents?.length).map((c) => ({ id: c.id, name: c.name || 'Unnamed', agents: c.agents! })),
      lines.filter((l) => l.tribunal).map((l) => ({ who: l.who, text: l.text, covenant: state.covenants.find((x) => x.id === l.tribunal)?.name })),
      year,
      season,
      rng,
    );
    if (reports.length) saga.tribunalNews = [...reports, ...(saga.tribunalNews ?? [])].slice(0, 150);
    const names = (kind: Line['kind']) => [...new Set(lines.filter((l) => l.kind === kind && !l.tribunal && people.some((p) => (p.name || 'Unnamed') === l.who)).map((l) => l.who!))];
    const facts: ChronicleFacts = {
      year,
      season,
      covenants: own.map((cov) => yearFacts.get(cov.id) ?? chronicleCovenant(cov)),
      people: people
        .filter((c) => !c.wounds.dead || lines.some((l) => l.who === c.name && l.kind === 'crisis'))
        .map((c) => ({ name: c.name || 'Unnamed', type: c.type, ...seasonTelling(c.seasonLog.find((e) => e.year === year && e.season === season && !e.extra), c.owed), away: c.auraTime === 'away' })),
      ...(season === 'Winter'
        ? {
            aged: names('aging').filter((n) => lines.some((l) => l.who === n && l.kind === 'aging' && /Aging roll/.test(l.text) && !/No apparent aging/.test(l.text))),
            crises: names('crisis'),
            died: people.filter((c) => c.wounds.dead && lines.some((l) => l.who === c.name && l.kind === 'crisis')).map((c) => c.name),
            warped: people.filter((c) => (c.owed?.length ?? 0) > (owedBefore.get(c.id) ?? 0) && c.owed!.some((x) => x.kind === 'warping')).map((c) => c.name),
          }
        : {}),
      news: (saga.tribunalNews ?? []).filter((n) => n.year === year && n.season === season),
      reports: reports.map((r) => r.text),
    };
    report.story = writeChronicle(facts, rng);
  }
  saga.timeLog = keepReports([report, ...(saga.timeLog ?? [])]);
  return { state, report };
}

/** Move the saga on by several seasons, one after another. */
/**
 * When the saga began, and whether time has moved since: the start set on the Saga Overview, else
 * (for a saga from before it was kept) the season of the oldest report, else where the clock is now.
 */
export function sagaStart(s: Saga): { year: number; season: Season; begun: boolean } {
  const oldest = (s.timeLog ?? []).at(-1);
  const year = s.startYear ?? oldest?.year ?? s.currentYear;
  const season = s.startSeason ?? oldest?.season ?? s.currentSeason;
  return { year, season, begun: (s.timeLog?.length ?? 0) > 0 || year !== s.currentYear || season !== s.currentSeason };
}

export function advanceSeasons(input: SagaState, data: GameData, seasons: number, o: AdvanceOptions = DEFAULT_ADVANCE): { state: SagaState; reports: TimeReport[] } {
  // the first season to pass fixes when the saga began
  if (input.saga.startYear === undefined && seasons > 0) {
    const st = sagaStart(input.saga);
    input = { ...input, saga: { ...input.saga, startYear: st.year, startSeason: st.season } };
  }
  let state = input;
  const reports: TimeReport[] = [];
  for (let i = 0; i < seasons; i++) {
    const r = advanceSeason(state, data, o);
    state = r.state;
    reports.push(r.report);
  }
  return { state, reports };
}

export { describeStress };
// what moved to yearEnd.ts that the clock's callers still ask it for
export { inPlay } from './yearEnd';
