// The saga's clock: one place where seasons and years pass for everyone at once. A season applies
// what each character did (logged on their sheet, or their standing activity), then the season's
// passing; the turn of the year closes each covenant's books, pays allowances, renews wards, ages
// everyone, and adds the year's Warping.

import { ART_NAMES, CHARACTERISTICS, type Art, type Characteristic, type GameData } from '../data';
import { deriveCharacter, type DerivedCharacter } from './character/derive';
import { characterContext, covenantAura, covenantOf, type CharacterContext } from './context';
import { deriveCovenant } from './covenant';
import { specAbilities, specChar } from './covenantRules';
import { DEFAULT_YEAR_END, applyYearEnd, planYearEnd, type YearEndOptions } from './covenantYear';
import { defaultRng, describeStress, stressDie, type Rng } from './dice';
import { payAllowance } from './economy';
import { constantWarping, effectExpiry, expireEffects, nextSeason, seasonIndex } from './effects';
import { agingRoll, applyAgingPoint, applySeason, computeStudy, crisisRoll, decrepitudeScore, newSeasonEntry, visForStudy } from './longterm';
import { workProject } from './projects';
import { routineYear } from './labRoutines';
import type { ActiveEffect, Character, Covenant, Saga, Season, SeasonLogEntry, StandingActivity, TimeReport } from './types';
import { purseOf, takeVis, visText } from './vis';
import { workshopSeason, workshopYearEnd } from './workshop';
import { abilityXpForScore, warpingScoreFromPoints } from './xp';
import { uid } from '../util/id';

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

type Line = TimeReport['lines'][number];

/** Characters the clock moves: finished, alive. */
export function inPlay(c: Character): boolean {
  return c.creation.finalized && !c.wounds.dead;
}

export function loggedThisSeason(c: Character, year: number, season: Season): SeasonLogEntry[] {
  return c.seasonLog.filter((e) => e.year === year && e.season === season);
}

/** Living Conditions for the aging roll (DE p.391 with the covenant's finances, Virtues and half the lab's Health). */
export function livingConditions(d: DerivedCharacter, ctx: CharacterContext): number {
  const cov = ctx.covenant;
  const base = cov ? (cov.season === 'Summer' || cov.season === 'Autumn' ? (d.isMagus ? 2 : 1) : d.isMagus ? 1 : 0) : 0;
  const labHealth = ctx.lab ? Math.floor(ctx.lab.characteristics.Health / 2) : 0;
  return base + (cov?.finances.livingConditions ?? 0) + d.livingConditionsMod + labHealth;
}

/** Seasons a character spends working for a living in a year: four less its free seasons (DE p.163). */
function workSeason(d: DerivedCharacter, season: Season): boolean {
  const free = d.effects.filter((e) => e.type === 'freeSeasons').reduce((m, e) => Math.max(m, (e as { amount: number }).amount), 2);
  return ['Spring', 'Summer', 'Autumn', 'Winter'].indexOf(season) < Math.max(0, 4 - free);
}

/** The Ability a character works with: its Craft or Profession, else its best Ability. */
function workAbility(d: DerivedCharacter): string | undefined {
  const trade = d.abilities.filter((a) => a.abilityId.startsWith('craft') || a.abilityId.startsWith('profession')).sort((a, b) => b.total - a.total)[0];
  if (trade) return `ability:${trade.uid}`;
  const best = d.abilities.filter((a) => a.abilityId !== 'living-language' && a.abilityId !== 'dead-language').sort((a, b) => b.total - a.total)[0];
  return best ? `ability:${best.uid}` : undefined;
}

/** What a character does when nobody planned the season: its standing activity, with 'auto' worked out. */
export function resolveStanding(c: Character, d: DerivedCharacter, season: Season): StandingActivity {
  const s = c.standing ?? { kind: 'auto' };
  if (s.kind !== 'auto') return s;
  if (c.creature) return { kind: 'none' };
  if (d.isMagus) {
    const p = c.projects?.find((x) => !x.done);
    return { kind: 'lab', projectUid: p?.uid };
  }
  if (workSeason(d, season)) return c.workshop ? { kind: 'work' } : { kind: 'exposure', target: workAbility(d) };
  return { kind: 'practice', target: s.target ?? workAbility(d) };
}

export function describeStanding(c: Character, d: DerivedCharacter, s: StandingActivity): string {
  const name = (t?: string) => {
    if (!t) return 'nothing chosen';
    const [k, id] = t.split(':');
    return k === 'art' ? ART_NAMES[id as Art] : d.abilityByUid.get(id)?.name ?? 'an Ability';
  };
  switch (s.kind) {
    case 'exposure': return `Exposure in ${name(s.target)} (2 xp)`;
    case 'practice': return `Practice ${name(s.target)} (Quality 4)`;
    case 'vis': return `Study ${name(s.target)} from vis`;
    case 'work': return 'Work in the workshop';
    case 'taught': return `Taught ${name(s.target)}`;
    case 'lab': {
      const p = c.projects?.find((x) => x.uid === s.projectUid && !x.done);
      return p ? `Lab: ${p.name}` : 'Lab work (Exposure in Magic Theory)';
    }
    case 'none': return 'Nothing';
    default: return 'Automatic';
  }
}

/** Why a magic character learned nothing: its Might comes off every Advancement Total (RoP: Magic). */
function mightNote(d: DerivedCharacter, xp: number): string {
  if (xp || !d.magicChar || d.magicChar.might <= 0) return '';
  return ` Its Might ${d.magicChar.might} comes off the Advancement Total; eating vis (2 off for each pawn) lets it learn: plan the season on its sheet.`;
}

/** Log and apply a season of a character's standing activity. Returns what happened. */
export function runStanding(c: Character, d: DerivedCharacter, ctx: CharacterContext, cov: Covenant | undefined, data: GameData, year: number, season: Season, rng: Rng): string[] {
  const s = resolveStanding(c, d, season);
  const log = (activity: SeasonLogEntry['activity'], summary: string, gains: Record<string, number>, warping = 0) => {
    const e = newSeasonEntry(year, season, activity, summary, gains);
    if (warping) e.warpingPoints = warping;
    applySeason(c, e, 1);
    c.seasonLog.push(e);
  };
  const target = (t?: string) => {
    if (!t) return null;
    const [k, id] = t.split(':');
    return k === 'art' ? { art: id as Art, label: ART_NAMES[id as Art] } : { abilityUid: id, label: d.abilityByUid.get(id)?.name ?? 'an Ability' };
  };
  const theory = d.abilities.find((a) => a.abilityId === d.theoryAbility);
  switch (s.kind) {
    case 'none':
      return [];
    case 'exposure': {
      const t = target(s.target);
      if (!t) return [];
      const r = computeStudy(d, { kind: 'exposure', subject: t.label }, 'art' in t ? { art: t.art } : { abilityUid: t.abilityUid });
      log('exposure', `Exposure: ${t.label} (+${r.xp} xp)`, r.xp ? { [s.target!]: r.xp } : {});
      return [`Exposure in ${t.label}: +${r.xp} xp.${mightNote(d, r.xp)}`];
    }
    case 'practice': {
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
      const from = purseOf(c).vis;
      const paid = takeVis(from, [art], pawns);
      if (!paid.ok) return [`No ${pawns} pawn${pawns > 1 ? 's' : ''} of ${ART_NAMES[art]} vis in the purse to study.`];
      const r = stressDie(pawns, rng);
      const aura = ctx.aura.realm === 'Magic' ? ctx.aura.strength : 0;
      if (r.botches) {
        log('study-vis', `Studied ${ART_NAMES[art]} vis: ${describeStress(r)}: botch`, {}, r.botches);
        return [`Studied ${ART_NAMES[art]} vis (${pawns} pawns): BOTCH, ${r.botches} Warping Point${r.botches > 1 ? 's' : ''}.${r.botches >= 2 ? " A double botch: roll for Wizard's Twilight." : ''}`];
      }
      const res = computeStudy(d, { kind: 'vis', art, dieRoll: r.value, aura }, { art });
      const e = newSeasonEntry(year, season, 'study-vis', `Studied ${ART_NAMES[art]} vis: ${describeStress(r)} (+${res.xp} xp)`, { [`art:${art}`]: res.xp });
      e.visUsed = [{ art, pawns }];
      applySeason(c, e, 1);
      c.seasonLog.push(e);
      return [`Studied ${ART_NAMES[art]} from ${pawns} pawn${pawns > 1 ? 's' : ''} of vis: ${describeStress(r)} + aura ${aura}, +${res.xp} xp.`];
    }
    case 'taught': {
      const t = target(s.target);
      const sp = s.teacher?.startsWith('spec:') ? cov?.specialists.find((x) => x.uid === s.teacher!.slice(5)) : undefined;
      // no lesson this season: the character does what it would have done unplanned, rather than nothing
      const instead = (why: string) => {
        const was = c.standing;
        c.standing = { kind: 'auto', target: t && !('art' in t) ? s.target : undefined };
        const out = runStanding(c, d, ctx, cov, data, year, season, rng);
        c.standing = was;
        return out.length ? [`${why} Instead: ${out[0]}`, ...out.slice(1)] : [why];
      };
      if (!t || !sp) return instead('Taught: choose the teacher and the subject.');
      if ('art' in t) return instead(`${sp.name || 'The teacher'} cannot teach a Hermetic Art (teachers have no Gift).`);
      if (sp.taught?.year === year && sp.taught.seasons >= 2) return instead(`${sp.name || 'The teacher'} has taught two seasons this year already (DE p.180).`);
      const mine = c.abilities.find((a) => a.uid === t.abilityUid);
      const theirs = specAbilities(sp).find((a) => a.id === mine?.abilityId && (a.param ?? '') === (mine?.param ?? ''));
      if (!theirs) return instead(`${sp.name || 'The teacher'} does not know ${t.label}.`);
      const r = computeStudy(d, { kind: 'teacher', com: specChar(sp, 'Com'), teaching: sp.teaching ?? 0, teacherScore: theirs.score, students: 1, goodTeacher: !!sp.goodTeacher, isArt: false, subject: t.label }, { abilityUid: t.abilityUid });
      if (!r.xp && r.capped) return instead(`${sp.name || 'The teacher'} knows no more ${t.label} than ${c.name || 'the student'} does.`);
      sp.taught = { year, seasons: (sp.taught?.year === year ? sp.taught.seasons : 0) + 1 };
      log('taught', `Taught by ${sp.name || 'a teacher'}: ${t.label} (+${r.xp} xp)`, r.xp ? { [s.target!]: r.xp } : {});
      return [`Taught ${t.label} by ${sp.name || 'a teacher'}: Quality ${r.sourceQuality}, +${r.xp} xp${r.capped ? ' (as far as the teacher knows)' : ''}.${mightNote(d, r.xp)}`];
    }
    case 'work': {
      if (!c.workshop) return runStanding({ ...c, standing: { kind: 'exposure', target: workAbility(d) } } as Character, d, ctx, cov, data, year, season, rng);
      return workshopSeason(c, d, year, season, { rng });
    }
    case 'lab': {
      const lines: string[] = [];
      const p = c.projects?.find((x) => x.uid === s.projectUid && !x.done);
      if (p) lines.push(...workProject(c, d, ctx, cov, p.uid, data, year));
      const gains: Record<string, number> = theory ? { [`ability:${theory.uid}`]: 2 } : {};
      log('other', p ? `Lab: ${p.name}` : 'Lab work', gains);
      lines.push(theory ? `Lab work: +2 xp Exposure in ${theory.name}.` : 'Lab work.');
      return lines;
    }
    default:
      return [];
  }
}

/** The Characteristic that takes an Aging Point "in any Characteristic" with the least harm: the one furthest from dropping. */
function sparestCharacteristic(c: Character): Characteristic {
  return [...CHARACTERISTICS].sort((a, b) => Math.abs(c.characteristics[b]) - (c.agingPoints[b] ?? 0) - (Math.abs(c.characteristics[a]) - (c.agingPoints[a] ?? 0)))[0];
}

/** A character's year: a year older, the aging roll, and the year's Warping. */
export function ageCharacter(c: Character, d: DerivedCharacter, ctx: CharacterContext, year: number, rng: Rng, roll: boolean): Line[] {
  const who = c.name || 'Unnamed';
  const lines: Line[] = [];
  if (!c.creature?.magicCharacter) c.age += 1;
  // a magic character does not age (RoP: Magic); others roll from 35, or earlier with a Longevity Ritual
  // lab routines (Covenants) worsen the year's Living Conditions, and overtime can add Aging rolls; a
  // character under 35 then rolls too
  const routine = routineYear(c, year);
  const ages = !c.creature?.magicCharacter && (c.age >= d.agingStartAge || !!c.longevity || routine.living < 0 || routine.extraRolls > 0);
  const due = roll && ages && c.lastAgedYear !== year;
  if (due) {
    if (routine.from.length) lines.push({ who, kind: 'aging', text: `Lab routines this year (${routine.from.join(', ')}): Living Conditions ${routine.living}${routine.extraRolls ? `, ${routine.extraRolls} extra Aging roll${routine.extraRolls > 1 ? 's' : ''}` : ''}.` });
    for (let i = 0; i < 1 + routine.extraRolls; i++) ageOnce(c, d, ctx, rng, routine.living, who, lines);
    c.lastAgedYear = year;
  }
  // Warping: constant effects (and a Longevity Ritual), and living in a strong aura not of one's own realm
  const cw = constantWarping(c);
  const aura = auraWarping(c, d, ctx, year);
  const wp = cw.points + aura;
  if (wp) {
    c.warpingPoints += wp;
    const where = `${{ always: 'living in', half: 'half the time in', visits: 'frequent visits to', away: '' }[c.auraTime ?? 'always']} a ${ctx.aura.realm} aura of ${ctx.aura.strength}`;
    lines.push({ who, kind: 'warping', text: `+${wp} Warping Point${wp > 1 ? 's' : ''} for the year (${[...cw.from, ...(aura ? [where] : [])].join(', ')}).` });
  }
  // a non-magus changes as its Warping Score rises; Hermetic magi are drawn to Twilight instead (DE, Effects of Warping)
  if (!d.isMagus && !d.might) {
    const now = warpingScoreFromPoints(c.warpingPoints);
    const noted = c.warpingNoted ?? warpingScoreFromPoints(c.warpingPoints - wp);
    const from = aura ? `the ${ctx.aura.realm} aura` : cw.from.length ? cw.from.join(', ') : 'the magic that warped it';
    for (let n = noted + 1; n <= now; n++) {
      const what =
        n === 1 ? `a Minor Flaw that reflects ${from}` :
        n === 3 ? `a second Minor Flaw, again from ${from}` :
        n === 5 ? `a supernatural Minor Virtue attuned to ${from}${aura ? `; an aura of ${ctx.aura.realm} no longer warps it` : ''}` :
        n >= 6 ? `a Major Flaw fitting ${from}` : '';
      if (what) lines.push({ who, kind: 'warping', text: `Warping Score ${n}: the character gains ${what}. Add it on the sheet; the storyguide picks it (DE, Effects of Warping).` });
      if (n === 5 && aura && ctx.aura.realm !== 'None') c.warpingAttuned = ctx.aura.realm;
    }
    c.warpingNoted = Math.max(noted, now);
  }
  return lines;
}

/** One Aging roll and what it brings (DE, Aging). */
function ageOnce(c: Character, d: DerivedCharacter, ctx: CharacterContext, rng: Rng, livingMod: number, who: string, lines: Line[]): void {
  const lr = c.longevity?.bonus ?? 0;
  const r = agingRoll(c.age, livingConditions(d, ctx) + livingMod, lr, d.agingRollParts, rng, !!c.longevity && c.age < 35);
  const notes: string[] = [];
  if (r.apparentAging) c.apparentAge = (c.apparentAge ?? c.age - 1) + 1;
  for (const p of r.agingPoints) notes.push(applyAgingPoint(c, p.char as Characteristic, p.points));
  if (r.anyChar) {
    const ch = sparestCharacteristic(c);
    notes.push(applyAgingPoint(c, ch, r.anyChar));
  }
  lines.push({ who, kind: 'aging', text: `Aging roll ${r.roll}: ${r.text}${notes.length ? ' ' + notes.join(' ') : ''}` });
  if (r.crisis) {
    const need = Math.max(1, abilityXpForScore(decrepitudeScore(c.decrepitudePoints) + 1) - c.decrepitudePoints);
    for (let i = 0; i < need; i++) applyAgingPoint(c, sparestCharacteristic(c), 1);
    const crisis = crisisRoll(c.age, decrepitudeScore(c.decrepitudePoints), rng);
    let text = `Crisis ${crisis.roll}: ${crisis.text}`;
    if (crisis.ease !== undefined) {
      const save = stressDie(0, rng).value + (c.characteristics.Sta ?? 0);
      text += save >= crisis.ease ? ` Survived (Stamina roll ${save} against ${crisis.ease}).` : ` Stamina roll ${save} against ${crisis.ease}: the character dies unless a Creo Corpus ${crisis.crco} ritual saves them (the storyguide decides).`;
    } else if (crisis.roll >= 19) text += ' The character dies unless magic saves them (the storyguide decides).';
    if (c.longevity) {
      c.longevity = undefined;
      text += ' The crisis ends the Longevity Ritual.';
    }
    lines.push({ who, kind: 'crisis', text });
  }
  if (decrepitudeScore(c.decrepitudePoints) >= 5) lines.push({ who, kind: 'crisis', text: 'Decrepitude 5: the character dies of old age.' });
}

/** Warping Points a year from an aura of 6 to 10 by time spent in it: always within, half time, frequent visits (DE table). */
const AURA_WARPING: Record<number, [number, number, number]> = { 6: [1, 0, 0], 7: [1, 0.5, 0], 8: [2, 1, 0], 9: [4, 2, 1], 10: [12, 4, 2] };

/**
 * DE, Living in Strong Auras: an aura over 5 warps those who live in it, by its strength and the time
 * spent there (half a point a year is one every other year); magi in a Magic aura (and beings of its
 * realm) are spared.
 */
export function auraWarping(c: Character, d: DerivedCharacter, ctx: CharacterContext, year = 0): number {
  if (!ctx.covenant) return 0;
  const { realm, strength } = ctx.aura;
  const time = c.auraTime ?? 'always';
  if (strength < 6 || time === 'away' || c.warpingAttuned === realm) return 0;
  const sameRealm = (d.isMagus && realm === 'Magic') || d.might?.realm === realm || (c.creature && c.creature.realm === realm);
  if (sameRealm) return 0;
  const n = AURA_WARPING[Math.min(10, strength)][time === 'always' ? 0 : time === 'half' ? 1 : 2];
  return n === 0.5 ? (year % 2 === 0 ? 1 : 0) : n;
}

export const AURA_TIME: Record<NonNullable<Character['auraTime']>, string> = {
  always: 'lives, works and sleeps there',
  half: 'half the time (sleeps there, works elsewhere)',
  visits: 'frequent visits (a quarter of the time)',
  away: 'rarely there',
};

/** Hooks whose stories come round with the years (Covenants ch.2). */
const HOOK_REMINDERS: { match: RegExp; every: number; text: string }[] = [
  { match: /indiscreet resource/i, every: 5, text: 'a story to keep the resource quiet (one every five years or so), or it is lost' },
  { match: /dark secret/i, every: 3, text: 'the secret crops up again as a potential problem' },
  { match: /itinerants/i, every: 1, text: 'the mobile community visits this year' },
  { match: /flickering aura/i, every: 1, text: "the yearly task, or the aura falls by one for the rest of the year" },
  { match: /faerie aura/i, every: 1, text: 'the faerie courts play their game twice a year' },
  { match: /contested resource/i, every: 1, text: 'getting the contested resource takes a story' },
];

function hookReminders(cov: Covenant, year: number): Line[] {
  const lines: Line[] = [];
  for (const h of cov.hooksBoons) {
    if (h.kind !== 'hook') continue;
    const r = HOOK_REMINDERS.find((x) => x.match.test(h.name));
    if (!r) continue;
    const last = cov.hookStories?.[h.uid] ?? cov.foundedYear ?? year;
    if (year + 1 - last >= r.every) lines.push({ who: cov.name, kind: 'reminder', text: `${h.name}: ${r.text}. Mark the story played on the Seasons page.` });
  }
  // Dwindling Resource: a tenth of the original value a year
  for (const h of cov.hooksBoons) {
    if (h.kind !== 'hook' || !/dwindling resource/i.test(h.name) || !h.target) continue;
    const inc = cov.income.find((s) => s.uid === h.target);
    const vis = cov.visSources.find((s) => s.uid === h.target);
    if (inc) {
      inc.factor = Math.max(0, Math.round(((inc.factor ?? 1) - 0.1) * 1000) / 1000);
      lines.push({ who: cov.name, kind: 'covenant', text: `Dwindling Resource: ${inc.name} falls to ${Math.round((inc.factor ?? 0) * 100)}% of its value.` });
    } else if (vis) {
      const orig = (h as { original?: number }).original ?? vis.pawnsPerYear;
      (h as { original?: number }).original = orig;
      const years = ((h as { years?: number }).years ?? 0) + 1;
      (h as { years?: number }).years = years;
      vis.pawnsPerYear = Math.max(0, Math.round(orig * (1 - 0.1 * years)));
      lines.push({ who: cov.name, kind: 'covenant', text: `Dwindling Resource: ${vis.name} now gives ${vis.pawnsPerYear} pawns a year.` });
    }
  }
  return lines;
}

/** Wards and other covenant effects whose Year runs out: cast again from the covenant's vis when set to renew. */
function renewCovenantEffects(cov: Covenant, chars: Character[], year: number, season: Season): Line[] {
  const lines: Line[] = [];
  const now = seasonIndex(year, season);
  for (const e of [...(cov.effects ?? [])]) {
    const end = effectExpiry(e);
    if (!end || seasonIndex(end.year, end.season) > now) continue;
    cov.effects = (cov.effects ?? []).filter((x) => x.uid !== e.uid);
    if (!e.renew) {
      lines.push({ who: cov.name, kind: 'effect', text: `${e.name} ends.` });
      continue;
    }
    const caster = chars.find((c) => c.id === e.renew!.casterId);
    const pawns = Math.max(1, Math.ceil(e.renew.level / 5));
    const arts: Art[] = e.renew.art ? [e.renew.art] : ['Re', 'Vi'];
    const paid = takeVis(cov.visStocks, arts, pawns);
    if (!paid.ok || (e.renew.casterId && !caster)) {
      lines.push({ who: cov.name, kind: 'reminder', text: `${e.name} ends and could not be cast again: ${!paid.ok ? `it needs ${pawns} pawns of ${arts.map((a) => ART_NAMES[a]).join(' or ')} vis` : 'its caster is gone'}.` });
      continue;
    }
    const next: ActiveEffect = { ...e, uid: uid(), year, season };
    cov.effects = [...(cov.effects ?? []), next];
    lines.push({ who: cov.name, kind: 'effect', text: `${e.name} cast again${caster ? ` by ${caster.name}` : ''} (${visText(paid.taken)} vis).` });
  }
  return lines;
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

  // the season's work: what each character logged, or its standing activity
  for (const c of state.characters.filter(inPlay)) {
    if (loggedThisSeason(c, year, season).length || !o.fillUnplanned) continue;
    const d = derive(c);
    const ctx = ctxOf(c);
    const cov = covenantOf(c, state.covenants);
    for (const t of runStanding(c, d, ctx, cov, data, year, season, rng)) lines.push({ who: c.name || 'Unnamed', kind: 'season', text: t });
  }

  // the turn of the year (after Winter): covenants, then each character's year
  if (season === 'Winter') {
    for (const cov of state.covenants) {
      const members = state.characters.filter((c) => cov.memberIds.includes(c.id));
      const dc = deriveCovenant(cov, data, state.characters);
      const plan = planYearEnd(cov, dc, { ...o.yearEnd, skipVis: [...(o.yearEnd.skipVis ?? []), ...(cov.yearEnd?.skipVis ?? [])] });
      applyYearEnd(cov, plan, year, o.yearEnd);
      lines.push({ who: cov.name, kind: 'covenant', text: plan.lines.join(' ') });
      for (const t of payAllowance(cov, members, plan.balance, plan.vis, year, season)) lines.push({ who: cov.name, kind: 'money', text: t });
      lines.push(...hookReminders(cov, year));
      for (const s of cov.specialists.filter((x) => x.hired && x.hired.until <= year)) lines.push({ who: cov.name, kind: 'covenant', text: `${s.name || 'The hired teacher'} has taught the time paid for, and leaves.` });
      cov.specialists = cov.specialists.filter((x) => !x.hired || x.hired.until > year);
    }
    for (const c of state.characters.filter(inPlay)) {
      const d = derive(c);
      lines.push(...ageCharacter(c, d, ctxOf(c), year, rng, o.rollAging));
      for (const t of workshopYearEnd(c, d)) lines.push({ who: c.name || 'Unnamed', kind: 'year', text: t });
    }
  }

  // into the next season: effects run out, wards are renewed, the Might pool and Fatigue recover
  const next = nextSeason(year, season);
  for (const cov of state.covenants) lines.push(...renewCovenantEffects(cov, state.characters, next.year, next.season));
  for (const c of state.characters.filter(inPlay)) {
    for (const t of expireEffects(c, next.year, next.season)) lines.push({ who: c.name || 'Unnamed', kind: 'effect', text: t });
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
  saga.timeLog = [report, ...(saga.timeLog ?? [])].slice(0, 80);
  return { state, report };
}

/** Move the saga on by several seasons, one after another. */
export function advanceSeasons(input: SagaState, data: GameData, seasons: number, o: AdvanceOptions = DEFAULT_ADVANCE): { state: SagaState; reports: TimeReport[] } {
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
