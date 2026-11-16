// The Vitkir (Hedge Magic, Revised Edition, Chapter Seven): the Casting Total (stress die + Stamina +
// the lowest rune of the script + aura) against the script's level, with the inscription variations and
// the vitkar Virtues and Flaws; the Lab Total (lowest rune + Intelligence + Rune Magic + aura), which
// gives that many levels of scripts a season; and Nátt-thel, the loss of The Gift, in place of Twilight.

import { DESCRIPTION_PENALTY, NAME_PENALTY, NATT_THEL_DURATIONS, RUNES, runeByName, type Inscription, type Rune } from '../data/hedgeVitkir';
import type { DerivedCharacter } from './character/derive';
import { languageScore, tradeScore } from './books';
import { charmOutcome, type CharmOutcome } from './learnedMagic';
import { auraModifier, type AuraState, type Part } from './magic';
import { addMagnitudes } from './spellDesign';
import type { Character } from './types';

const score = (d: DerivedCharacter, id: string) => d.abilities.filter((a) => a.abilityId === id).reduce((m, a) => Math.max(m, a.total), 0);
const virtues = (c: Pick<Character, 'virtues'>, id: string) => c.virtues.filter((v) => v.defId === id);
const has = (c: Pick<Character, 'virtues'>, id: string) => c.virtues.some((v) => v.defId === id);
/** A Virtue's chosen rune (or runes, or aett) names this rune. */
const names = (param: string | undefined, rune: Rune) => {
  const p = (param ?? '').toLowerCase();
  return !!p && (new RegExp(`\\b${rune.name.toLowerCase()}\\b`).test(p) || new RegExp(`\\b${rune.aett.toLowerCase()}('s)? aett\\b`).test(p));
};

export interface RuneScore extends Rune {
  score: number;
}

/** The runes a vitki may use: those on the sheet, and for a Gifted vitki all 24. */
export function vitkirRunes(c: Character, d: DerivedCharacter): RuneScore[] {
  const all = has(c, 'vitki') && d.hasGift;
  return RUNES.filter((x) => all || d.abilities.some((a) => a.abilityId === x.id)).map((x) => ({ ...x, score: score(d, x.id) }));
}

export const isVitki = (c: Character, d: DerivedCharacter) => vitkirRunes(c, d).length > 0;

/** Rune Magic, Craft: Runes and Old Norse, the Abilities a vitki needs (Craft: Runes 2, Old Norse 3, Rune Magic 1 at least). */
export function vitkiAbilities(c: Character, d: DerivedCharacter) {
  return { runeMagic: score(d, 'rune-magic'), craftRunes: tradeScore(c, d, /rune/i), oldNorse: languageScore(c, d, 'Old Norse') };
}

export interface VitkiTotal {
  total: number;
  parts: Part[];
  notes: string[];
  auraBotch: number;
  /** the lowest rune's score, which also caps the pawns of vis */
  lowest: number;
  /** a Magical Deficiency halves the whole Casting Total, die included */
  halved: boolean;
  /** a rune the vitki cannot use (a grave deficiency, or not opened) */
  unusable: string[];
}

/** The script's lowest rune, with a focus doubling the runes it covers. */
function lowestRune(c: Character, d: DerivedCharacter, runes: string[], focus: boolean): { score: number; label: string; unusable: string[]; notes: string[] } {
  const known = vitkirRunes(c, d);
  const notes: string[] = [];
  const unusable = runes.filter((n) => !known.some((k) => k.name === n));
  const minor = virtues(c, 'minor-rune-focus');
  const scored = runes.map((n) => {
    const k = known.find((x) => x.name === n);
    const s = k?.score ?? 0;
    const rune = runeByName(n)!;
    const doubled = focus && (has(c, 'major-rune-focus') || minor.some((v) => names(v.param, rune)));
    return { n, s: doubled ? 2 * s : s, doubled };
  });
  if (!scored.length) return { score: 0, label: 'Rune', unusable, notes };
  const low = scored.reduce((m, x) => (x.s < m.s ? x : m));
  if (focus && !scored.some((x) => x.doubled)) notes.push('No rune focus covers these runes.');
  return { score: low.s, label: `${low.n}${low.doubled ? ' (doubled by the focus)' : ''}${scored.length > 1 ? ', the lowest rune' : ''}`, unusable, notes };
}

export interface CastingOptions {
  name?: Inscription;
  description?: Inscription;
  /** coloring the runes, an intricate pattern, the whole futhark first: +1, twice as long */
  extraEffort?: boolean;
  /** the effect's or target's runes repeated, colored or larger: +1, but they cannot be hidden */
  emphasis?: boolean;
  /** pawns of vis (makt), +2 each, no more than the rune's score */
  vis?: number;
  /** the runes are cut into the focus's material for its purpose */
  focus?: boolean;
}

/** Casting Total (without the die): Stamina + the lowest rune + aura, with the variations. */
export function vitkiCastingTotal(c: Character, d: DerivedCharacter, runes: string[], aura: AuraState | undefined, o: CastingOptions = {}): VitkiTotal {
  const low = lowestRune(c, d, runes, !!o.focus);
  const notes = [...low.notes];
  const script = runes.map((n) => runeByName(n)!).filter(Boolean);
  const deft = virtues(c, 'deft-rune').some((v) => script.some((r) => names(v.param, r)));
  const mastered = virtues(c, 'mastered-rune').some((v) => script.some((r) => names(v.param, r)));
  const secret = virtues(c, 'secret-runes').length;
  const a = auraModifier('Magic', aura);
  const parts: Part[] = [
    { label: 'Stamina', value: d.characteristics.Sta.value },
    { label: low.label, value: low.score },
  ];
  if (a.mod) parts.push({ label: a.note ?? 'Magic aura', value: a.mod });
  const name = o.name ?? 'written';
  const desc = o.description ?? 'written';
  let namePen = NAME_PENALTY[name];
  let descPen = DESCRIPTION_PENALTY[desc];
  if (namePen && (deft || has(c, 'nameless-runes'))) {
    notes.push(deft ? 'Deft Rune: no penalty for leaving off the name.' : 'Nameless Runes: no penalty for leaving off the name.');
    namePen = 0;
  }
  if (descPen && deft) {
    notes.push('Deft Rune: no penalty for leaving off the description.');
    descPen = 0;
  } else if (descPen && secret) {
    descPen = secret >= 2 || desc === 'hidden' ? 0 : -5;
    notes.push(`Secret Runes: ${descPen ? 'only −5 for no description' : 'no penalty for the description'}.`);
  }
  if (mastered && (namePen || descPen)) {
    namePen = Math.trunc(namePen / 2);
    descPen = Math.trunc(descPen / 2);
    notes.push('Mastered Rune: penalties halved.');
  }
  if (namePen) parts.push({ label: name === 'hidden' ? 'Hidden name' : 'No name', value: namePen });
  if (descPen) parts.push({ label: desc === 'hidden' ? 'Hidden description' : 'No description', value: descPen });
  if (o.extraEffort) parts.push({ label: 'Extra effort', value: 1 });
  if (o.emphasis) {
    if (desc !== 'written') notes.push('Emphasized runes cannot be hidden or left off.');
    else parts.push({ label: 'Emphasis', value: 1 });
  }
  const vis = Math.max(0, o.vis ?? 0);
  // vis is held to the rune's own score, not the focus's doubling
  const rawLow = lowestRune(c, d, runes, false).score;
  if (vis) {
    const used = Math.min(vis, rawLow);
    if (used < vis) notes.push(`Vis is held to the rune's score: ${rawLow} pawns.`);
    if (used) parts.push({ label: `Vis (${used} pawn${used === 1 ? '' : 's'})`, value: 2 * used });
  }
  const halved = c.virtues.some((v) => (v.defId === 'minor-magical-deficiency-flaw' || v.defId === 'major-magical-deficiency-flaw') && script.some((r) => names(v.param, r)));
  if (halved) notes.push('Magical Deficiency: the Casting Total is halved (or, for a grave deficiency, the rune cannot be used at all).');
  if (low.unusable.length) notes.push(`Not opened: ${low.unusable.join(', ')}.`);
  if (has(c, 'short-lived-runes-flaw')) notes.push('Short-Lived Runes: the storyguide rolls the effect’s duration on the Nátt-thel chart (a stress die, no botch, +1 a pawn or Confidence Point spent).');
  return { total: parts.reduce((s, p) => s + p.value, 0), parts, notes, auraBotch: a.botch, lowest: rawLow, halved, unusable: low.unusable };
}

/** Botch dice: one, a die a pawn of vis and the aura's; Mastered Rune takes off three, to at least one. */
export function vitkiBotchDice(c: Character, runes: string[], vis: number, auraBotch = 0): number {
  const dice = 1 + Math.max(0, vis) + auraBotch;
  const mastered = virtues(c, 'mastered-rune').some((v) => runes.some((n) => names(v.param, runeByName(n)!)));
  return mastered ? Math.max(1, dice - 3) : dice;
}

/** The roll: (total + die), halved for a deficiency. At or above the level it works; within 10 below, for a Fatigue level; further, it fails for one. */
export function runeCast(t: Pick<VitkiTotal, 'total' | 'halved'>, die: number, level: number): { total: number; outcome: CharmOutcome } {
  const total = t.halved ? Math.floor((t.total + die) / 2) : t.total + die;
  return { total, outcome: charmOutcome(total, level) };
}

/** Penetration: Casting Total − level + Penetration (the Arcane Connection multiplier as for Hermetic magic). */
export const runePenetration = (castingTotal: number, level: number, penetration: number, multiplier = 1) => castingTotal - level + penetration * multiplier;

// ------------------------------------------------------------------------------------------------
// Inventing and learning scripts

/** Lab Total: the lowest rune + Intelligence + Rune Magic + aura; no laboratory is needed. */
export function vitkiLabTotal(c: Character, d: DerivedCharacter, runes: string[], aura: AuraState | undefined): VitkiTotal {
  const low = lowestRune(c, d, runes, false);
  const a = auraModifier('Magic', aura);
  const parts: Part[] = [
    { label: low.label, value: low.score },
    { label: 'Intelligence', value: d.characteristics.Int.value },
    { label: 'Rune Magic', value: score(d, 'rune-magic') },
  ];
  if (a.mod) parts.push({ label: a.note ?? 'Magic aura', value: a.mod });
  const notes = low.unusable.length ? [`Not opened: ${low.unusable.join(', ')}.`] : [];
  return { total: parts.reduce((s, p) => s + p.value, 0), parts, notes, auraBotch: a.botch, lowest: low.score, halved: false, unusable: low.unusable };
}

/** A season inventing scripts gives levels equal to the Lab Total, a third for each month of it. */
export const inventedLevels = (labTotal: number, months = 3) => Math.max(0, Math.floor((labTotal * Math.max(0, Math.min(3, months))) / 3));

/** Taught: levels equal to the teacher's Lab Total for the highest script taught; no script above the student's own Lab Total for its runes. */
export const taughtLevels = (teacherLabTotal: number, studentLabTotal: number) => ({ levels: Math.max(0, teacherLabTotal), maxLevel: Math.max(0, studentLabTotal) });

/** A Hermetic effect done with the runes: its base level and four magnitudes. */
export const runeLevelFromHermetic = (base: number) => addMagnitudes(base, 4);

/** Rune spells of level 30 or more warp their target (not the vitki casting on themself), a Warping Point a season. */
export const runeWarps = (level: number, onSelf: boolean) => level >= 30 && !onSelf;

/** Secondary Insight for a vitki: the other runes of the studied rune's aett gain a point each. */
export const aettPartners = (runeName: string) => {
  const r = runeByName(runeName);
  return r ? RUNES.filter((x) => x.aett === r.aett && x.name !== r.name) : [];
};

// ------------------------------------------------------------------------------------------------
// Nátt-thel

/** Two or more Warping Points from one event call for the roll; a Nátt-thel Prone vitki rolls on any supernatural botch. */
export const nattThelFollows = (c: Pick<Character, 'virtues'>, gained: number, fromBotch = false) => gained >= 2 || (fromBotch && gained >= 1 && has(c, 'natt-thel-prone-flaw'));

/** Avoiding it: Stamina + Concentration + stress die against Warping Score × 3 (the new score, the points added first). */
export function nattThelAvoid(d: DerivedCharacter, warpingScore: number): { total: number; ease: number } {
  return { total: d.characteristics.Sta.value + score(d, 'concentration'), ease: 3 * warpingScore };
}

/** Its length: simple die + Warping Score gives the unit, times the Warping Points gained (each effect kept alive adds one more point). */
export function nattThelDuration(roll: number, gained: number): { unit: string; count: number; text: string } {
  const row = [...NATT_THEL_DURATIONS].reverse().find((x) => roll >= x.roll) ?? NATT_THEL_DURATIONS[0];
  const unknown = row.roll >= 15;
  return { unit: row.unit, count: gained, text: unknown ? `Unknown: the storyguide chooses a time longer than a year (× ${gained}).` : `${gained} ${gained === 1 ? row.unit.replace(/s$/, '') : row.unit}` };
}
