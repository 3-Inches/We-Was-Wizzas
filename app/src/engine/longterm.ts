// Long-term events (DE Chapter 10): seasonal advancement, aging, Twilight.

import type { Art, GameData } from '../data';
import type { Character, SeasonLogEntry, XpSource } from './types';
import type { DerivedCharacter } from './character/derive';
import { stressDie, simpleDie, type Rng, defaultRng } from './dice';
import { abilityScoreFromXp, withAffinity } from './xp';
import { uid } from '../util/id';

export type StudySource =
  | { kind: 'summa'; quality: number; level: number; isArt: boolean; subject: string }
  | { kind: 'tractatus'; quality: number; isArt: boolean; subject: string }
  | { kind: 'teacher'; com: number; teaching: number; teacherScore: number; students: number; goodTeacher: boolean; isArt: boolean; subject: string }
  | { kind: 'training'; masterScore: number; subject: string }
  | { kind: 'practice'; quality: number; subject: string }
  | { kind: 'exposure'; subject: string }
  | { kind: 'adventure'; quality: number; subject: string }
  | { kind: 'vis'; art: Art; dieRoll: number; aura: number };

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
export function computeStudy(d: DerivedCharacter, src: StudySource, target: { art?: Art; abilityUid?: string }): StudyResult {
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
  }
  const sq = parts.reduce((s, p) => s + p.value, 0);
  for (const m of sqMods(d, kindKey)) parts.push(m);
  let total = parts.reduce((s, p) => s + p.value, 0);
  if (kindKey === 'teaching' || kindKey === 'book') {
    // Poor Student: -3, but never below 1 (already in sqMods as negative)
    total = Math.max(1, total);
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
    const current = isArt ? d.arts[target.art!].effectiveXp : d.abilityByUid.get(target.abilityUid!)?.effectiveXp ?? 0;
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

export function agingRoll(age: number, livingConditions: number, longevity: number, extra: number, rng: Rng = defaultRng, underLongevityYoung = false): AgingResult {
  const sd = stressDie(0, rng, true);
  const mods = [
    { label: 'Age / 10 (round up)', value: Math.ceil(age / 10) },
    { label: 'Living Conditions', value: -livingConditions },
    { label: 'Longevity Ritual', value: -longevity },
  ];
  if (extra) mods.push({ label: 'Other modifiers', value: extra });
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
    return `${char} drops to ${v - 1}.`;
  }
  return `${char} aging points: ${c.agingPoints[char]}.`;
}

export function decrepitudeScore(points: number): number {
  return abilityScoreFromXp(points);
}

// ------------------------------------------------------------------ Twilight

export const TWILIGHT_TIME = ['Moment', 'Diameter (2 minutes)', 'Two hours', 'Sun', 'Day (24 hours)', 'Moon', 'Season', 'Year', 'Seven years', 'Seven + stress die years', 'Final Twilight'];

export function twilightAvoidance(d: DerivedCharacter, warpingGained: number, aura: number, rng: Rng = defaultRng) {
  const conc = d.abilities.find((a) => a.abilityId === 'concentration')?.total ?? 0;
  const ew = d.abilities.find((a) => a.abilityId === 'enigmatic-wisdom')?.total ?? 0;
  const vimBonus = Math.ceil(d.arts.Vi.value / 5);
  const mine = stressDie(1, rng);
  const theirs = stressDie(0, rng, true);
  const my = d.characteristics.Sta.value + conc + vimBonus + mine.value;
  const tw = d.warpingScore + warpingGained + ew + aura + theirs.value;
  return { my, tw, success: !mine.botches && my > tw, botch: mine.botches > 0, detail: `Sta ${d.characteristics.Sta.value} + Concentration ${conc} + Vim bonus ${vimBonus} + die ${mine.value} vs Warping ${d.warpingScore} + gained ${warpingGained} + Enigmatic Wisdom ${ew} + aura ${aura} + die ${theirs.value}` };
}

export function twilightComprehension(d: DerivedCharacter, warpingGained: number, rng: Rng = defaultRng) {
  const ew = d.abilities.find((a) => a.abilityId === 'enigmatic-wisdom')?.total ?? 0;
  const botchDice = 1 + warpingGained;
  const mine = stressDie(botchDice, rng);
  const theirs = stressDie(botchDice, rng);
  const int = d.characteristics.Int.value;
  const my = int + ew + mine.value;
  const tw = theirs.botches ? 0 : d.warpingScore + theirs.value;
  const success = !mine.botches && my > tw;
  let steps = 0;
  if (success) steps = Math.max(0, int + mine.value - tw);
  let idx = Math.min(10, Math.max(1, d.warpingScore));
  if (mine.botches) idx = Math.min(10, idx + mine.botches);
  idx = Math.max(0, idx - steps);
  return { my, tw, success, botch: mine.botches > 0, duration: TWILIGHT_TIME[idx], extraWarping: simpleDie(rng).value };
}

export function formBonus(score: number): number {
  return Math.ceil(score / 5);
}

export type { XpSource, GameData };
