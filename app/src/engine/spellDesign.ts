// Spell design (DE Chapter 9): Range/Duration/Target magnitudes, level arithmetic,
// Ritual requirements, and spell invention time.

import type { Art, Form, Technique } from '../data';

export interface RDTOption {
  name: string;
  magnitude: number;
  ritual?: boolean;
  requires?: string; // Virtue or mystery needed
  note?: string;
  kind?: 'object' | 'container' | 'sense';
}

export const RANGES: RDTOption[] = [
  { name: 'Personal', magnitude: 0 },
  { name: 'Touch', magnitude: 1 },
  { name: 'Eye', magnitude: 1 },
  { name: 'Voice', magnitude: 2 },
  { name: 'Road', magnitude: 2, requires: 'faerie-magic', note: 'Merinita Faerie Magic' },
  { name: 'Sight', magnitude: 3 },
  { name: 'Water-way', magnitude: 3, requires: 'atlantean-magic', note: 'Atlantean Magic' },
  { name: 'Arcane Connection', magnitude: 4 },
];

export const DURATIONS: RDTOption[] = [
  { name: 'Momentary', magnitude: 0 },
  { name: 'Concentration', magnitude: 1 },
  { name: 'Diameter', magnitude: 1 },
  { name: 'Storm', magnitude: 1, requires: 'atlantean-magic' },
  { name: 'Performance', magnitude: 1, requires: 'performance-magic' },
  { name: 'Held', magnitude: 1, requires: 'spell-timing', note: 'Spell Timing (Merinita mystery)' },
  { name: 'While (Condition)', magnitude: 1, requires: 'spell-timing' },
  { name: 'Sun', magnitude: 2 },
  { name: 'Ring', magnitude: 2 },
  { name: 'Midday/Midnight', magnitude: 2, requires: 'spell-timing' },
  { name: 'Not (Condition)', magnitude: 2, requires: 'spell-timing' },
  { name: 'Moon', magnitude: 3 },
  { name: 'Fire', magnitude: 3, requires: 'faerie-magic' },
  { name: 'Season', magnitude: 3, ritual: true, requires: 'spell-timing' },
  { name: 'Year', magnitude: 4, ritual: true },
  { name: 'Until (Condition)', magnitude: 4, ritual: true, requires: 'faerie-magic' },
  { name: 'Year + 1', magnitude: 4, ritual: true, requires: 'faerie-magic' },
];

export const TARGETS: RDTOption[] = [
  { name: 'Individual', magnitude: 0, kind: 'object' },
  { name: 'Circle', magnitude: 0, kind: 'container' },
  { name: 'Taste', magnitude: 0, kind: 'sense' },
  { name: 'Part', magnitude: 1, kind: 'object' },
  { name: 'Touch', magnitude: 1, kind: 'sense' },
  { name: 'Group', magnitude: 2, kind: 'object' },
  { name: 'Room', magnitude: 2, kind: 'container' },
  { name: 'Smell', magnitude: 2, kind: 'sense' },
  { name: 'Structure', magnitude: 3, kind: 'container' },
  { name: 'Hearing', magnitude: 3, kind: 'sense' },
  { name: 'Bloodline', magnitude: 3, kind: 'object', requires: 'faerie-magic' },
  { name: 'Body-of-water', magnitude: 3, kind: 'container', requires: 'atlantean-magic' },
  { name: 'Boundary', magnitude: 4, kind: 'container', ritual: true },
  { name: 'Vision', magnitude: 4, kind: 'sense' },
];

export function findOpt(list: RDTOption[], name: string): RDTOption | undefined {
  const n = name.toLowerCase();
  return list.find((o) => o.name.toLowerCase() === n) ?? list.find((o) => n.startsWith(o.name.toLowerCase().split(' ')[0]));
}

/** Add (or subtract) magnitudes to a level, honouring the "below level 5, one level per magnitude" rule. */
export function addMagnitudes(level: number, mags: number): number {
  let l = level;
  if (mags >= 0) {
    for (let i = 0; i < mags; i++) l = l < 5 ? l + 1 : l + 5;
  } else {
    for (let i = 0; i < -mags; i++) l = l > 5 ? l - 5 : Math.max(1, l - 1);
  }
  return l;
}

export interface SpellDesignInput {
  technique: Technique;
  form: Form;
  requisites: { art: Art; magnitudes: number }[];
  baseLevel: number;
  range: string;
  duration: string;
  target: string;
  sizeMagnitudes: number;
  otherMagnitudes: number; // extra effects, complexity, flexibility...
  forceRitual?: boolean;
  guidelineRitual?: boolean; // guideline says "Ritual"
  creoMomentaryLasting?: boolean;
  bargain?: boolean; // Merinita Bargain duration adds +3 magnitudes to the triggered spell
  recurring?: 'none' | 'decade' | 'year' | 'month' | 'day' | 'minute';
}

export interface SpellDesignResult {
  level: number;
  magnitude: number;
  ritual: boolean;
  ritualReasons: string[];
  designText: string;
  warnings: string[];
  totalMagnitudes: number;
}

const RECUR: Record<string, number> = { none: 0, decade: 1, year: 2, month: 3, day: 4, minute: 5 };

export function designSpell(i: SpellDesignInput): SpellDesignResult {
  const r = findOpt(RANGES, i.range);
  const d = findOpt(DURATIONS, i.duration);
  const t = findOpt(TARGETS, i.target);
  const parts: string[] = [`Base ${i.baseLevel}`];
  let mags = 0;
  const add = (n: number, label: string) => {
    if (!n) return;
    mags += n;
    parts.push(`${n > 0 ? '+' : ''}${n} ${label}`);
  };
  add(r?.magnitude ?? 0, i.range);
  add(d?.magnitude ?? 0, i.duration);
  add(t?.magnitude ?? 0, i.target);
  if (i.bargain) add(3, 'Bargain');
  add(i.sizeMagnitudes, 'size');
  for (const rq of i.requisites) add(rq.magnitudes, `${rq.art} requisite`);
  add(i.otherMagnitudes, 'other');
  add(RECUR[i.recurring ?? 'none'], 'recurring');
  let level = addMagnitudes(i.baseLevel, mags);
  const reasons: string[] = [];
  const warnings: string[] = [];
  if (d?.ritual) reasons.push(`${d.name} duration requires a Ritual`);
  if (t?.ritual) reasons.push('Boundary target requires a Ritual');
  if (level > 50) reasons.push('Level over 50');
  if (i.guidelineRitual) reasons.push('The guideline requires a Ritual');
  if (i.creoMomentaryLasting) reasons.push('Momentary Creo creating a lasting thing');
  if (i.forceRitual) reasons.push('Designated a Ritual (major effect / troupe ruling)');
  if (i.recurring && i.recurring !== 'none') reasons.push('Recurring spells must be Rituals');
  const ritual = reasons.length > 0;
  if (ritual && level < 20) {
    warnings.push('Ritual spells are always at least level 20.');
    level = 20;
  }
  if (r?.name === 'Personal' && t && (t.kind === 'container')) warnings.push('Personal range spells can never have a container Target.');
  if (i.technique === 'In' && i.sizeMagnitudes > 0) warnings.push('Intellego spells are not affected by Target size.');
  return {
    level,
    magnitude: Math.max(1, Math.ceil(level / 5)),
    ritual,
    ritualReasons: reasons,
    designText: `(${parts.join(', ')})`,
    warnings,
    totalMagnitudes: mags,
  };
}

/** Seasons to invent a spell: accumulate (Lab Total − level) per season until reaching the level. */
export function inventionSeasons(labTotal: number, level: number, opts: { fromText?: boolean } = {}): { possible: boolean; seasons: number; perSeason: number } {
  if (opts.fromText) return { possible: labTotal >= level, seasons: labTotal >= level ? 1 : Infinity, perSeason: level };
  const per = labTotal - level;
  if (per <= 0) return { possible: false, seasons: Infinity, perSeason: 0 };
  return { possible: true, seasons: Math.ceil(level / per), perSeason: per };
}

/** Spell Mastery special abilities (DE p.225-227). The Mastery score itself adds to the
 *  Casting Score of the spell and subtracts from its botch dice. */
export const MASTERY_ABILITIES = [
  { name: 'Adaptive Casting', text: 'Use this Mastery score and its special abilities when casting similar spells.' },
  { name: 'Ceremonial Casting', text: 'Apply Ceremonial Casting (+Artes Liberales +Philosophiae) to this spell. Not for Rituals.' },
  { name: 'Fast Casting', text: 'Fast Cast the mastered spell (–10 still applies; Mastery offsets botch dice). Not for Rituals.' },
  { name: 'Imperturbable Casting', text: 'Add Mastery score to Concentration rolls related to the spell.' },
  { name: 'Magic Resistance', text: 'Magic Resistance doubled against this spell and similar spells/powers.' },
  { name: 'Multiple Casting', text: 'Cast up to Mastery score extra copies at once; –1 aiming per target.' },
  { name: 'Obfuscated Casting', text: 'Others must roll to identify the Form, adding your Mastery score to the Ease Factor.' },
  { name: 'Penetration', text: 'Add Mastery score to Penetration Ability for this spell.' },
  { name: 'Precise Casting', text: '+1 Finesse rolls with the spell, –1 Finesse botch die. Repeatable.' },
  { name: 'Quick Casting', text: '+1 Initiative when casting (and +1 Fast Casting Speed with Fast Casting). Repeatable. Not for Rituals.' },
  { name: 'Quiet Casting', text: 'Quiet-casting penalty reduced by 5. Take twice to cast silently without penalty.' },
  { name: 'Rebuttal', text: 'Muto/Rego Vim vs foreign magic: +3 × Mastery to effective level.' },
  { name: 'Still Casting', text: 'Cast without gestures at no penalty.' },
  { name: 'Unravelling', text: 'Perdo Vim vs magic: +3 × Mastery to effective level.' },
];
