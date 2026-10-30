// Long-term events (DE Chapter 10): seasonal advancement, aging, Twilight.

import { CHARACTERISTICS, type Art, type Characteristic, type GameData } from '../data';
import type { Character, SeasonLogEntry, XpSource } from './types';
import { paramValues, type DerivedCharacter } from './character/derive';
import { abilityAvailability } from './character/restrictions';
import { stressDie, simpleDie, type Rng, defaultRng } from './dice';
import { abilityScoreFromXp, abilityXpForScore, warpingScoreFromPoints, withAffinity } from './xp';
import { uid } from '../util/id';

export type StudySource =
  | { kind: 'summa'; quality: number; level: number; isArt: boolean; subject: string }
  | { kind: 'tractatus'; quality: number; isArt: boolean; subject: string }
  | { kind: 'teacher'; com: number; teaching: number; teacherScore: number; students: number; goodTeacher: boolean; isArt: boolean; subject: string; labTeaching?: number }
  | { kind: 'training'; masterScore: number; subject: string; labTeaching?: number }
  | { kind: 'practice'; quality: number; subject: string }
  | { kind: 'exposure'; subject: string }
  | { kind: 'adventure'; quality: number; subject: string }
  | { kind: 'vis'; art: Art; dieRoll: number; aura: number }
  | { kind: 'worship'; quality: number; subject: string };

export interface StudyResult {
  sourceQuality: number;
  advancementTotal: number;
  xp: number;
  parts: { label: string; value: number }[];
  gainLimit?: number;
  notes: string[];
  capped: boolean;
}

function sqMods(d: DerivedCharacter, when: string): { label: string; value: number }[] {
  const out: { label: string; value: number }[] = [];
  for (const e of d.effects) {
    if (e.type === 'sourceQuality' && (e.when as string[]).includes(when)) out.push({ label: e.fromName, value: e.amount });
  }
  return out;
}

/** Compute xp from a season of study for a given target (art code or ability uid). */
export function computeStudy(d: DerivedCharacter, src: StudySource, target: { art?: Art; abilityUid?: string; monthsLost?: number; visEaten?: number; currentXp?: number }): StudyResult {
  const parts: { label: string; value: number }[] = [];
  const notes: string[] = [];
  let gainLimit: number | undefined;
  let kindKey = 'book';
  switch (src.kind) {
    case 'summa':
      parts.push({ label: `Summa quality`, value: src.quality });
      gainLimit = src.level;
      kindKey = 'book';
      break;
    case 'tractatus':
      parts.push({ label: 'Tractatus quality', value: src.quality });
      kindKey = 'book';
      break;
    case 'teacher': {
      parts.push({ label: 'Teacher Communication', value: src.com });
      parts.push({ label: 'Teacher Teaching', value: src.teaching });
      parts.push({ label: 'Base', value: 3 });
      const bonus = src.students <= 1 ? 6 : src.students === 2 ? 3 : 0;
      if (bonus) parts.push({ label: src.students <= 1 ? 'One student' : 'Two students', value: bonus });
      if (src.goodTeacher) parts.push({ label: 'Good Teacher', value: 5 });
      gainLimit = src.teacherScore;
      kindKey = 'teaching';
      if (src.isArt && src.students > 1) notes.push('Hermetic Arts can only be taught one-on-one.');
      break;
    }
    case 'training':
      parts.push({ label: "Master's score + 3", value: src.masterScore + 3 });
      gainLimit = src.masterScore;
      kindKey = 'training';
      break;
    case 'practice':
      parts.push({ label: 'Practice', value: src.quality });
      kindKey = 'practice';
      break;
    case 'exposure':
      parts.push({ label: 'Exposure', value: 2 });
      kindKey = 'exposure';
      break;
    case 'adventure':
      parts.push({ label: 'Adventure', value: src.quality });
      kindKey = 'adventure';
      if (src.quality > 5) notes.push('At most 5 points of adventure Source Quality may go to a single Ability or Art.');
      break;
    case 'vis':
      parts.push({ label: 'Stress die', value: src.dieRoll });
      if (src.aura) parts.push({ label: 'Aura', value: src.aura });
      kindKey = 'vis';
      break;
    case 'worship':
      // the Divine aura of the church worshipped in (The Church, Worship)
      parts.push({ label: 'Worship: the church’s Divine aura', value: src.quality });
      kindKey = 'worship';
      break;
  }
  // a lab's Teaching Specialization adds to teaching and training done in it, at most +3 (DE Laboratory)
  if ((src.kind === 'teacher' || src.kind === 'training') && src.labTeaching) parts.push({ label: 'Lab Teaching Specialization', value: Math.min(3, src.labTeaching) });
  const sq = parts.reduce((s, p) => s + p.value, 0);
  for (const m of sqMods(d, kindKey)) parts.push(m);
  let total = parts.reduce((s, p) => s + p.value, 0);
  if (kindKey === 'teaching' || kindKey === 'book') {
    // Poor Student: -3, but never below 1 (already in sqMods as negative)
    total = Math.max(1, total);
  }
  // a magic character subtracts its Might Score from all Advancement Totals; each pawn of vis it eats
  // (any Art) lessens that by two, without raising the total (RoP: Magic, Advancement)
  // a familiar bound to a Hermetic magus learns as a human does (DE, Familiars; RoP: Magic, Advancement)
  if (d.magicChar && d.magicChar.might > 0 && d.char.creature?.familiarOf) notes.push('A bound familiar learns as a human does: its Might is not subtracted (RoP: Magic).');
  else if (d.magicChar && d.magicChar.might > 0) {
    const eaten = Math.max(0, Math.floor(target.visEaten ?? 0));
    const penalty = Math.max(0, d.magicChar.might - 2 * eaten);
    parts.push({ label: `Magic Might ${d.magicChar.might} (a magic character's Might is subtracted)${eaten ? `, less ${Math.min(d.magicChar.might, 2 * eaten)} for ${eaten} pawn${eaten > 1 ? 's' : ''} of vis eaten` : ''}`, value: -penalty });
    total = Math.max(0, total - penalty);
    if (!total) notes.push(`A magic character with this much Might learns nothing from this source unless it eats vis: each pawn, of any Art, takes 2 off the penalty (RoP: Magic, Advancement).`);
  }
  // DE Distractions: each full month of the season lost takes a third of the original total (fractions rounded up)
  const months = Math.min(3, Math.max(0, Math.floor(target.monthsLost ?? 0)));
  if (months) {
    const left = Math.ceil((total * (3 - months)) / 3);
    parts.push({ label: `${months} month${months > 1 ? 's' : ''} lost to distraction`, value: left - total });
    total = left;
  }
  // Affinity
  let xp = total;
  const isArt = !!target.art;
  if (isArt) {
    if (d.arts[target.art!].affinity) xp = withAffinity(total);
  } else if (target.abilityUid) {
    const a = d.abilityByUid.get(target.abilityUid);
    if (a?.affinity) xp = withAffinity(total);
  }
  for (const e of d.effects) {
    if (e.type === 'advancementMultiplier' && (e.when === 'all' || (e.when as string[]).includes(kindKey))) {
      xp = Math.floor(xp * e.multiplier);
      notes.push(`${e.fromName}: ×${e.multiplier}`);
    }
  }
  let capped = false;
  if (gainLimit !== undefined) {
    // a Spell Mastery, kept on the spell, gives its own experience
    const current = target.currentXp ?? (isArt ? d.arts[target.art!].effectiveXp : d.abilityByUid.get(target.abilityUid!)?.effectiveXp ?? 0);
    const maxXp = isArt ? (gainLimit * (gainLimit + 1)) / 2 : (5 * gainLimit * (gainLimit + 1)) / 2;
    const room = Math.max(0, maxXp - current);
    if (xp > room) {
      xp = room;
      capped = true;
      notes.push(`Gain limited by source level ${gainLimit}.`);
    }
  }
  return { sourceQuality: sq, advancementTotal: total, xp, parts, gainLimit, notes, capped };
}

export interface LinkedGain {
  abilityId: string;
  name: string;
  /** the character's Ability, if it already has it */
  uid?: string;
  xp: number;
  /** why it gets nothing (no access to a Supernatural Ability, say) */
  blocked?: string;
}

/**
 * Major Magian Lineage (DE, Magian Lineage): studying one of the three connected Abilities from
 * a source dedicated to it also gives half the Source Quality (rounded up) in each of the other
 * two, if the character has access to them.
 */
export function magianLinkedGains(d: DerivedCharacter, data: GameData, src: StudySource, abilityUid: string | undefined, sourceQuality: number): LinkedGain[] {
  if (!abilityUid || src.kind === 'exposure' || src.kind === 'adventure' || src.kind === 'vis') return [];
  const ml = d.virtues.find((v) => v.cv.defId === 'magian-lineage' && v.cv.size === 'Major');
  const linked = paramValues(ml?.cv.param);
  const studied = d.abilityByUid.get(abilityUid);
  if (!ml || !studied || !linked.includes(studied.abilityId)) return [];
  const half = Math.ceil(sourceQuality / 2);
  return linked
    .filter((id) => id !== studied.abilityId)
    .map((id) => {
      const have = d.abilities.find((a) => a.abilityId === id);
      const name = have?.name ?? data.abilityById.get(id)?.name ?? id;
      const access = have && have.effectiveXp > 0 ? { ok: true } : abilityAvailability(d, data, id);
      if (!access.ok) return { abilityId: id, name, uid: have?.uid, xp: 0, blocked: access.reason ?? 'No access' };
      return { abilityId: id, name, uid: have?.uid, xp: have?.affinity ? withAffinity(half) : half };
    });
}

/** Pawns of vis needed to study an Art: 1 per 5 levels (or part), minimum 1. */
export function visForStudy(score: number): number {
  return Math.max(1, Math.ceil(score / 5));
}

/** Apply a season log entry's gains to the character ('play' xp). */
export function applySeason(c: Character, entry: SeasonLogEntry, sign: 1 | -1 = 1) {
  for (const [key, xp] of Object.entries(entry.gains)) {
    const [kind, id] = key.split(':');
    if (kind === 'art') {
      const a = id as Art;
      const alloc = c.arts[a] ?? (c.arts[a] = {});
      alloc.play = Math.max(0, (alloc.play ?? 0) + sign * xp);
    } else if (kind === 'ability') {
      const ab = c.abilities.find((x) => x.uid === id);
      if (ab) ab.xp.play = Math.max(0, (ab.xp.play ?? 0) + sign * xp);
    } else if (kind === 'mastery') {
      const s = c.spells.find((x) => x.uid === id);
      if (s) s.masteryXp.play = Math.max(0, (s.masteryXp.play ?? 0) + sign * xp);
    }
  }
  if (entry.warpingPoints) c.warpingPoints = Math.max(0, c.warpingPoints + sign * entry.warpingPoints);
  entry.applied = sign === 1;
}

export function newSeasonEntry(year: number, season: SeasonLogEntry['season'], activity: SeasonLogEntry['activity'], summary: string, gains: Record<string, number> = {}): SeasonLogEntry {
  return { uid: uid(), year, season, activity, summary, gains, applied: false };
}

// ------------------------------------------------------------------ Aging

export interface AgingResult {
  roll: number;
  die: number;
  mods: { label: string; value: number }[];
  apparentAging: boolean;
  agingPoints: { char: string; points: number }[];
  anyChar: number; // points in any Characteristic (player chooses)
  crisis: boolean;
  text: string;
}

const AGING_TABLE: Record<number, string[]> = {
  14: ['Qik'], 15: ['Sta'], 16: ['Per'], 17: ['Pre'], 18: ['Str', 'Sta'], 19: ['Dex', 'Qik'], 20: ['Com', 'Pre'], 21: ['Int', 'Per'],
};

export function agingRoll(age: number, livingConditions: number, longevity: number, extra: number | { label: string; value: number }[], rng: Rng = defaultRng, underLongevityYoung = false): AgingResult {
  const sd = stressDie(0, rng, true);
  const mods = [
    { label: 'Age / 10 (round up)', value: Math.ceil(age / 10) },
    { label: 'Living Conditions', value: -livingConditions },
    { label: 'Longevity Ritual', value: -longevity },
  ];
  if (typeof extra === 'number') {
    if (extra) mods.push({ label: 'Other modifiers', value: extra });
  } else mods.push(...extra.filter((m) => m.value));
  let roll = sd.value + mods.reduce((s, m) => s + m.value, 0);
  if (underLongevityYoung && age < 35 && roll >= 10) roll = 9;
  const res: AgingResult = { roll, die: sd.value, mods, apparentAging: roll >= 3, agingPoints: [], anyChar: 0, crisis: false, text: '' };
  if (roll <= 2) res.text = 'No apparent aging.';
  else if (roll <= 9) res.text = 'Apparent age increases by one year.';
  else if (roll <= 12) {
    res.anyChar = 1;
    res.text = 'Apparent age +1; 1 Aging Point in any Characteristic.';
  } else if (roll === 13 || roll >= 22) {
    res.crisis = true;
    res.text = 'Gain enough Aging Points to reach the next Decrepitude level, and Crisis!';
  } else {
    const chars = AGING_TABLE[roll] ?? [];
    res.agingPoints = chars.map((c) => ({ char: c, points: 1 }));
    res.text = `Apparent age +1; 1 Aging Point in ${chars.join(' and ')}.`;
  }
  return res;
}

export function crisisRoll(age: number, decrepitude: number, rng: Rng = defaultRng): { roll: number; text: string; ease?: number; crco: number } {
  const die = simpleDie(rng).value;
  const roll = die + Math.ceil(age / 10) + decrepitude;
  if (roll <= 8) return { roll, text: 'Bedridden for a week.', crco: 0 };
  if (roll <= 14) return { roll, text: 'Bedridden for a month.', crco: 0 };
  if (roll === 15) return { roll, text: 'Minor illness: Stamina stress roll vs 3 (or CrCo 20) to survive.', ease: 3, crco: 20 };
  if (roll === 16) return { roll, text: 'Serious illness: Stamina stress roll vs 6 (or CrCo 25) to survive.', ease: 6, crco: 25 };
  if (roll === 17) return { roll, text: 'Major illness: Stamina stress roll vs 9 (or CrCo 30) to survive.', ease: 9, crco: 30 };
  if (roll === 18) return { roll, text: 'Critical illness: Stamina stress roll vs 12 (or CrCo 35) to survive.', ease: 12, crco: 35 };
  return { roll, text: 'Terminal illness: only CrCo 40 can save the character.', crco: 40 };
}

/** Apply aging points: characteristic drops by 1 when points exceed |value|. */
export function applyAgingPoint(c: Character, char: keyof Character['characteristics'], points = 1): string {
  c.agingPoints[char] = (c.agingPoints[char] ?? 0) + points;
  c.decrepitudePoints += points;
  const v = c.characteristics[char];
  if ((c.agingPoints[char] ?? 0) > Math.abs(v)) {
    c.characteristics[char] = v - 1;
    c.agingPoints[char] = 0;
    c.agingLoss = { ...(c.agingLoss ?? {}), [char]: (c.agingLoss?.[char] ?? 0) + 1 };
    return `${char} drops to ${v - 1}.`;
  }
  return `${char} aging points: ${c.agingPoints[char]}.`;
}

/** The Characteristics each kind of character can best spare, least needed first. */
const SPARE_ORDER: Record<Character['type'], Characteristic[]> = {
  magus: ['Str', 'Dex', 'Qik', 'Pre', 'Com', 'Per', 'Sta', 'Int'],
  grog: ['Int', 'Com', 'Pre', 'Per', 'Qik', 'Dex', 'Str', 'Sta'],
  companion: ['Str', 'Qik', 'Dex', 'Sta', 'Int', 'Per', 'Com', 'Pre'],
  mythic: ['Com', 'Int', 'Pre', 'Dex', 'Qik', 'Per', 'Str', 'Sta'],
};

/**
 * Where a player puts an Aging Point "in any Characteristic": where it lowers nothing yet (fewer
 * points than the Characteristic's size), the one the character needs least first; when every one
 * would drop, the least needed that is not already low, so no single Characteristic tumbles.
 */
export function sparestCharacteristic(c: Character): Characteristic {
  const order = SPARE_ORDER[c.type] ?? CHARACTERISTICS;
  const safe = order.find((k) => (c.agingPoints[k] ?? 0) + 1 <= Math.abs(c.characteristics[k]));
  if (safe) return safe;
  return order.find((k) => c.characteristics[k] > -2) ?? [...order].sort((a, b) => c.characteristics[b] - c.characteristics[a])[0];
}

export function decrepitudeScore(points: number): number {
  return abilityScoreFromXp(points);
}

export interface AgingPlan {
  /** total Living Conditions modifier */
  livingConditions: number;
  /** Longevity Ritual bonus (used while the character has a ritual) */
  longevity: number;
  /** other modifiers to the roll (Virtues and Flaws, a bronze cord) */
  extra: number | { label: string; value: number }[];
  /** where Aging Points "in any Characteristic" go: one Characteristic, or each where it can best be spared */
  anyChar: keyof Character['characteristics'] | 'sparest';
  /** re-perform the Longevity Ritual after a crisis (magi re-invest vis before play) */
  renewLongevity: boolean;
}

export interface AgingYear {
  age: number;
  text: string;
}

/**
 * Aging before play (DE p.50): one aging roll for each year of age from `from` to `to`, applied
 * to the character. A crisis adds Aging Points up to the next Decrepitude level and rolls on the
 * crisis table; the Stamina roll to survive an illness is made for the character. The book lets a
 * player who dies of old age go back a year, so a fatal year is not applied: rolling stops there
 * and that year can be rolled again.
 */
export function ageYears(c: Character, from: number, to: number, plan: AgingPlan, rng: Rng = defaultRng): { years: AgingYear[]; died?: AgingYear } {
  const years: AgingYear[] = [];
  for (let age = from; age <= to; age++) {
    const before = structuredClone(c);
    const lr = c.longevity ? plan.longevity : 0;
    const r = agingRoll(age, plan.livingConditions, lr, plan.extra, rng, !!c.longevity && age < 35);
    const notes: string[] = [];
    if (r.apparentAging) c.apparentAge = (c.apparentAge ?? age) + 1;
    for (const p of r.agingPoints) notes.push(applyAgingPoint(c, p.char as keyof Character['characteristics'], p.points));
    const any = () => (plan.anyChar === 'sparest' ? sparestCharacteristic(c) : plan.anyChar);
    if (r.anyChar) notes.push(applyAgingPoint(c, any(), r.anyChar));
    let dead = '';
    if (r.crisis) {
      const need = Math.max(1, abilityXpForScore(decrepitudeScore(c.decrepitudePoints) + 1) - c.decrepitudePoints);
      for (let i = 0; i < need; i++) notes.push(applyAgingPoint(c, any(), 1));
      const crisis = crisisRoll(age, decrepitudeScore(c.decrepitudePoints), rng);
      notes.push(`Crisis ${crisis.roll}: ${crisis.text}`);
      if (crisis.roll >= 19) dead = 'a terminal illness';
      else if (crisis.ease !== undefined) {
        const save = stressDie(0, rng).value + (c.characteristics.Sta ?? 0);
        if (save < crisis.ease) dead = `an illness (Stamina roll ${save} against ${crisis.ease})`;
        else notes.push(`Survived (Stamina roll ${save} against ${crisis.ease}).`);
      }
      if (c.longevity && !dead) {
        if (plan.renewLongevity) notes.push('Longevity Ritual renewed after the crisis.');
        else {
          lapseLongevity(c);
          notes.push('The crisis ended the Longevity Ritual.');
        }
      }
    }
    if (!dead && decrepitudeScore(c.decrepitudePoints) >= 5) dead = 'Decrepitude 5';
    if (dead) {
      for (const k of Object.keys(c)) if (!(k in before)) delete (c as unknown as Record<string, unknown>)[k];
      Object.assign(c, before);
      return { years, died: { age, text: `Age ${age}: roll ${r.roll}. The character would die of ${dead}. That year was not applied; roll it again, or stop here.` } };
    }
    c.creation.agedThrough = age;
    const line = `Age ${age}: roll ${r.roll} (${r.die} on the die). ${r.text}${notes.length ? ' ' + notes.join(' ') : ''}`;
    years.push({ age, text: line });
    c.creation.agingLog = [...(c.creation.agingLog ?? []), line];
  }
  return { years };
}

// ------------------------------------------------------------------ Twilight

export const TWILIGHT_TIME = ['Moment', 'Diameter (2 minutes)', 'Two hours', 'Sun', 'Day (24 hours)', 'Moon', 'Season', 'Year', 'Seven years', 'Seven + stress die years', 'Final Twilight'];

/** Whether gaining these Warping Points at once means checking for Twilight (2+, or 1 with Twilight Prone). */
export function twilightTriggered(d: DerivedCharacter, warpingGained: number): boolean {
  return warpingGained >= 2 || (warpingGained >= 1 && d.twilightProne);
}

/** The Warping Score once the points from this event are added (DE: add them, then roll). */
export function warpingScoreWith(d: DerivedCharacter, warpingGained: number, alreadyAdded: boolean): number {
  return warpingScoreFromPoints(d.warpingPoints + (alreadyAdded ? 0 : warpingGained));
}

const enigmaticWisdom = (d: DerivedCharacter) => d.abilities.find((a) => a.abilityId === 'enigmatic-wisdom');

export function twilightAvoidance(d: DerivedCharacter, warpingGained: number, aura: number, rng: Rng = defaultRng, alreadyAdded = false) {
  const conc = d.abilities.find((a) => a.abilityId === 'concentration')?.total ?? 0;
  const ew = enigmaticWisdom(d)?.total ?? 0;
  const vimBonus = Math.ceil(d.arts.Vi.value / 5);
  const score = warpingScoreWith(d, warpingGained, alreadyAdded);
  const mine = stressDie(1, rng);
  const theirs = stressDie(0, rng, true);
  const my = d.characteristics.Sta.value + conc + vimBonus + mine.value;
  const tw = score + warpingGained + ew + aura + theirs.value;
  return {
    my, tw, success: !mine.botches && my > tw, botch: mine.botches > 0,
    detail: `Sta ${d.characteristics.Sta.value} + Concentration ${conc} + Vim bonus ${vimBonus} + die ${mine.value} vs Warping Score ${score} + gained ${warpingGained} + Enigmatic Wisdom ${ew} + aura ${aura} + die ${theirs.value}`,
  };
}

export function twilightComprehension(d: DerivedCharacter, warpingGained: number, rng: Rng = defaultRng, alreadyAdded = false) {
  const ewAb = enigmaticWisdom(d);
  // an Enigmatic Wisdom specialty in Twilight applies to comprehending it
  const ew = (ewAb?.total ?? 0) + (ewAb?.specialty && /twilight|comprehen/i.test(ewAb.specialty) ? 1 : 0);
  const score = warpingScoreWith(d, warpingGained, alreadyAdded);
  const botchDice = 1 + warpingGained;
  const mine = stressDie(botchDice, rng);
  const theirs = stressDie(botchDice, rng);
  const int = d.characteristics.Int.value;
  const my = int + ew + mine.value;
  const tw = theirs.botches ? 0 : score + theirs.value;
  const success = !mine.botches && my > tw;
  let steps = 0;
  if (success) steps = Math.max(0, int + mine.value - tw);
  let idx = Math.min(10, Math.max(1, score));
  if (mine.botches) idx = Math.min(10, idx + mine.botches);
  idx = Math.max(0, idx - steps);
  return {
    my, tw, success, botch: mine.botches > 0, duration: TWILIGHT_TIME[idx], extraWarping: simpleDie(rng).value,
    detail: `Int ${int} + Enigmatic Wisdom ${ew} + die ${mine.value} vs Warping Score ${score} + die ${theirs.botches ? '(botched: 0)' : theirs.value}`,
  };
}

/**
 * The size of Virtue or Flaw a Twilight can bring (DE Effects of Twilight): a Virtue is Minor at 7 to
 * 10 Warping Points and Major above 10; a Flaw is Minor at 7 to 10 and Major at 10 or more (the
 * book overlaps at 10, so either). Nothing below 7.
 */
export function twilightSizes(kind: 'virtue' | 'flaw', totalWarping: number): ('Minor' | 'Major')[] {
  if (totalWarping < 7) return [];
  if (kind === 'virtue') return totalWarping > 10 ? ['Major'] : ['Minor'];
  return totalWarping > 10 ? ['Major'] : totalWarping === 10 ? ['Minor', 'Major'] : ['Minor'];
}

/** What a Twilight can do to the maga (DE Effects of Twilight): good if she comprehended it, bad if not. */
export type TwilightEffect = 'knowledge' | 'virtue' | 'spell' | 'lost-knowledge' | 'flaw' | 'lost-spells';
export function twilightEffects(comprehended: boolean, totalWarping: number): { id: TwilightEffect; label: string; ok: boolean }[] {
  const size = totalWarping > 10 ? 'Major' : 'Minor';
  return comprehended
    ? [
        { id: 'knowledge', label: `Increased Knowledge: ${2 * totalWarping} xp in an Art, Magic Theory or Enigmatic Wisdom`, ok: true },
        { id: 'virtue', label: `New ${size} Hermetic or Supernatural Virtue`, ok: totalWarping >= 7 },
        { id: 'spell', label: `New spell of magnitude ${totalWarping}`, ok: true },
      ]
    : [
        { id: 'lost-knowledge', label: `Lost Knowledge: −${2 * totalWarping} xp in an Art, Magic Theory or Enigmatic Wisdom`, ok: true },
        { id: 'flaw', label: `New ${twilightSizes('flaw', totalWarping).join(' or ') || 'Minor'} Hermetic or Supernatural Flaw`, ok: totalWarping >= 7 },
        { id: 'lost-spells', label: `Lost spells totalling ${totalWarping} magnitudes`, ok: true },
      ];
}

export type { XpSource, GameData };

/** Keep a ritual an aging crisis has ended, so it can be performed again from its Laboratory Text (DE, Longevity Rituals). */
export function lapseLongevity(c: Character, year?: number): void {
  if (!c.longevity) return;
  c.longevityLapsed = { ...c.longevity, lapsedYear: year };
  c.longevity = undefined;
}
