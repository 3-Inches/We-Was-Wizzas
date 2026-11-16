// The Gruagachan (Hedge Magic, Revised Edition, Chapter Four): casting a Formulaic spell (Casting
// Score + die against its level, Fatigue within 10 below) or a spontaneous one ((score + stress die)
// ÷ 2, always tiring; Cailleach Magic doubles the lowest Art), varying a known spell by two magnitudes,
// the Geas and Limit Durations, Pictish's cap on the Arts, tattoos as lesser enchantments, and
// transformation, the Curse of Gruagach, in place of Twilight.

import { GEAS_MAGNITUDES, GRUAGACH_FORMS, GRUAGACH_PARAMS, GRUAGACH_TECHNIQUES, LIMIT_MAGNITUDES, type GruagachArts, type GruagachForm, type GruagachTechnique, type Prohibition } from '../data/hedgeGruagach';
import type { DerivedCharacter } from './character/derive';
import { languageScore } from './books';
import { auraModifier, type AuraState, type Part } from './magic';
import { addMagnitudes } from './spellDesign';
import type { Character } from './types';

const score = (d: DerivedCharacter, id: string) => d.abilities.filter((a) => a.abilityId === id).reduce((m, a) => Math.max(m, a.total), 0);
const has = (c: Pick<Character, 'virtues'>, id: string) => c.virtues.some((v) => v.defId === id);

export interface GruagachArtScore {
  abbr: GruagachTechnique | GruagachForm;
  id: string;
  name: string;
  score: number;
}

/** The Arts a gruagach may use: those on the sheet, and for a Gifted gruagach all six. */
export function gruagachArts(c: Character, d: DerivedCharacter): { techniques: GruagachArtScore[]; forms: GruagachArtScore[] } {
  const all = has(c, 'gruagach') && d.hasGift;
  const pick = <T extends { abbr: GruagachTechnique | GruagachForm; id: string; name: string }>(list: T[]) =>
    list.filter((x) => all || d.abilities.some((a) => a.abilityId === x.id)).map((x) => ({ abbr: x.abbr, id: x.id, name: x.name, score: score(d, x.id) }));
  return { techniques: pick(GRUAGACH_TECHNIQUES), forms: pick(GRUAGACH_FORMS) };
}

export const isGruagach = (c: Character, d: DerivedCharacter) => {
  const a = gruagachArts(c, d);
  return a.techniques.length > 0 && a.forms.length > 0;
};

/** Pictish, the tradition's sacred tongue and its Magic Theory. */
export const pictish = (c: Character, d: DerivedCharacter) => languageScore(c, d, 'Pictish');

/** The highest an Art may be: 5 at Pictish 1, 15 at 2, 30 at 3, no limit at 4 (0 without Pictish). */
export function gruagachArtCap(pictishScore: number): number {
  if (pictishScore >= 4) return Infinity;
  return [0, 5, 15, 30][Math.max(0, pictishScore)];
}

/** Known spells vary by 2 magnitudes, 3 with Flexible Gruagach Magic, 1 with Inflexible Magic, +1 for each 5 points of Mastery (Flexible Casting). */
export function gruagachFlex(c: Pick<Character, 'virtues'>, mastery = 0): number {
  const base = has(c, 'flexible-gruagach-magic') ? 3 : has(c, 'inflexible-magic-flaw') ? 1 : 2;
  return base + Math.floor(mastery / 5);
}

const artPair = (c: Character, d: DerivedCharacter, tf: GruagachArts) => {
  const a = gruagachArts(c, d);
  return { t: a.techniques.find((x) => x.abbr === tf.slice(0, 2)), f: a.forms.find((x) => x.abbr === tf.slice(2)) };
};

export interface GruagachTotal {
  total: number;
  parts: Part[];
  notes: string[];
  auraBotch: number;
}

/** Casting Score: Technique + Form + Stamina + aura; for a spontaneous spell with Cailleach Magic, the lowest Art doubled. */
export function gruagachCastingScore(c: Character, d: DerivedCharacter, tf: GruagachArts, aura: AuraState | undefined, o: { spontaneous?: boolean } = {}): GruagachTotal {
  const { t, f } = artPair(c, d, tf);
  const notes: string[] = [];
  if (!t || !f) notes.push('The gruagach lacks this Technique or Form.');
  if (c.virtues.some((v) => v.defId === 'incompatible-hedge-arts-flaw' && (v.param ?? '').toLowerCase().includes((t?.name ?? '').toLowerCase()) && (v.param ?? '').toLowerCase().includes((f?.name ?? '').toLowerCase()))) {
    notes.push('Incompatible Hedge Arts: this gruagach cannot use these two Arts together.');
  }
  const a = auraModifier('Magic', aura);
  const ts = t?.score ?? 0;
  const fs = f?.score ?? 0;
  const parts: Part[] = [
    { label: t?.name ?? tf.slice(0, 2), value: ts },
    { label: f?.name ?? tf.slice(2), value: fs },
    { label: 'Stamina', value: d.characteristics.Sta.value },
  ];
  if (o.spontaneous && has(c, 'cailleach-magic')) parts.push({ label: 'Cailleach Magic (the lowest Art again)', value: Math.min(ts, fs) });
  if (a.mod) parts.push({ label: a.note ?? 'Magic aura', value: a.mod });
  return { total: parts.reduce((s, p) => s + p.value, 0), parts, notes, auraBotch: a.botch };
}

/** A spontaneous spell: (Casting Score + stress die) ÷ 2, always for a Fatigue level. */
export const spontaneousTotal = (castingScore: number, die: number) => (castingScore + die) / 2;

/** A spell's level from its base and parameters; Blessing and Curse take their base at Conversation, and the Geas and Limit Durations add by their prohibitions. */
export function gruagachLevel(
  tf: GruagachArts,
  base: number,
  p: { range: string; duration: string; target: string; geas?: Prohibition; limit?: Prohibition; extra?: number },
): { level: number; design: string } {
  const blessCurse = tf.endsWith('Bl') || tf.endsWith('Cu');
  const parts = [`Base ${base}`];
  let mags = 0;
  const add = (n: number, label: string) => {
    if (!n) return;
    mags += n;
    parts.push(`+${n} ${label}`);
  };
  const r = GRUAGACH_PARAMS.ranges.find((x) => x.name === p.range);
  add(r ? (blessCurse ? (r.blessCurse ?? r.magnitude) : r.magnitude) : 0, p.range);
  if (p.duration === 'Geas') {
    // only the larger of the geas's and the limit's magnitudes counts
    const g = GEAS_MAGNITUDES[p.geas ?? 'general'];
    const l = p.limit ? LIMIT_MAGNITUDES[p.limit] : 0;
    add(Math.max(g, l), `Geas (${p.geas ?? 'general'})${p.limit ? `, Limit (${p.limit})` : ''}`);
  } else if (p.duration === 'Limit') add(LIMIT_MAGNITUDES[p.limit ?? 'general'], `Limit (${p.limit ?? 'general'})`);
  else add(GRUAGACH_PARAMS.durations.find((x) => x.name === p.duration)?.magnitude ?? 0, p.duration);
  add(GRUAGACH_PARAMS.targets.find((x) => x.name === p.target)?.magnitude ?? 0, p.target);
  add(p.extra ?? 0, 'more');
  return { level: addMagnitudes(base, mags), design: `(${parts.join(', ')})` };
}

/** Blessing and Curse spells must use the Limit (or Geas) Duration; Geas suits only Give Curse, Take Blessing and Take Shape. */
export function durationProblem(tf: GruagachArts, duration: string): string | undefined {
  if ((tf.endsWith('Bl') || tf.endsWith('Cu')) && duration !== 'Limit' && duration !== 'Geas') return 'Blessing and Curse spells take the Limit (or Geas) Duration.';
  if (duration === 'Geas' && !['GvCu', 'TaBl', 'TaSh'].includes(tf)) return 'The Geas Duration suits only Give Curse, Take Blessing and Take Shape.';
  return undefined;
}

// ------------------------------------------------------------------------------------------------
// The laboratory: spells, tattoos, vis

/** Lab Total: Technique + Form + Intelligence + Pictish + aura (+ a tattoo's shape bonus, held to Pictish; halved for tattoos with Weak Tattoo Magic). */
export function gruagachLabTotal(c: Character, d: DerivedCharacter, tf: GruagachArts, aura: AuraState | undefined, o: { tattoo?: boolean; shape?: number; similar?: number; other?: number } = {}): GruagachTotal {
  const { t, f } = artPair(c, d, tf);
  const a = auraModifier('Magic', aura);
  const pi = pictish(c, d);
  const notes: string[] = [];
  const parts: Part[] = [
    { label: t?.name ?? tf.slice(0, 2), value: t?.score ?? 0 },
    { label: f?.name ?? tf.slice(2), value: f?.score ?? 0 },
    { label: 'Intelligence', value: d.characteristics.Int.value },
    { label: 'Pictish', value: pi },
  ];
  if (a.mod) parts.push({ label: a.note ?? 'Magic aura', value: a.mod });
  if (o.similar) parts.push({ label: 'A similar spell (its magnitude)', value: o.similar });
  if (o.tattoo && o.shape) parts.push({ label: `The tattoo's shape${o.shape > pi ? ` (held to Pictish ${pi})` : ''}`, value: Math.min(o.shape, pi) });
  if (o.other) parts.push({ label: 'Other bonuses', value: o.other });
  let total = parts.reduce((s, p) => s + p.value, 0);
  if (o.tattoo && has(c, 'weak-tattoo-magic-flaw')) {
    total = Math.floor(total / 2);
    notes.push('Weak Tattoo Magic: the Lab Total is halved.');
  }
  if (o.tattoo && has(c, 'no-tattoo-magic-flaw')) notes.push('No Tattoo Magic: this gruagach makes no tattoos.');
  return { total, parts, notes, auraBotch: a.botch };
}

/** A tattoo is a lesser enchantment: its effect (with any uses a day) no higher than half the Lab Total; vis a pawn for each 10 levels, Tattoo Mastery taking Pictish off (never below half). */
export function tattoo(labTotal: number, level: number, pictishScore: number, mastery: boolean): { ok: boolean; maxLevel: number; vis: number } {
  const base = Math.max(1, Math.ceil(level / 10));
  const vis = mastery ? Math.max(Math.ceil(base / 2), base - pictishScore) : base;
  return { ok: labTotal >= 2 * level, maxLevel: Math.floor(labTotal / 2), vis };
}

/** Vis in a season: twice Pictish. Extracted from an aura: the Take Vision Lab Total ÷ 10. */
export const gruagachVisLimit = (pictishScore: number) => 2 * pictishScore;
export const gruagachExtraction = (takeVisionLabTotal: number) => Math.max(0, Math.floor(takeVisionLabTotal / 10));

// ------------------------------------------------------------------------------------------------
// Transformation

/** A double botch (a single one when Transformation Prone) may bring transformation. */
export const transformationFollows = (c: Pick<Character, 'virtues'>, botches: number) => botches >= 2 || (botches >= 1 && has(c, 'transformation-prone-flaw'));

/** Avoiding it: Stamina + Concentration + the Vision Magic Defense bonus + stress die, against Warping Score + the points gained + aura + stress die. */
export function transformationAvoid(d: DerivedCharacter, warpingScore: number, gained: number, aura: AuraState | undefined, visionDefense = 0): { total: number; against: number } {
  return { total: d.characteristics.Sta.value + score(d, 'concentration') + visionDefense, against: warpingScore + gained + (aura && aura.realm !== 'None' ? aura.strength : 0) };
}

/** Understanding it: Intelligence + stress die against Warping Score + stress die; good if it succeeds. At Warping Score 10 the gruagach is a troll. */
export const understandingTransformation = (d: DerivedCharacter) => d.characteristics.Int.value;

export const TRANSFORMATION_GOOD = 'Good: a gruagach Art or a magic Virtue (Major or Minor Magical Focus, Secondary Insight, Affinity, Puissant Art…), a troll’s Virtue (Large, Sharp Ears, Giant Blood, Tough, Reserves of Strength), or experience in an Art (Warping Score + simple die).';
export const TRANSFORMATION_BAD = 'Bad: a magic Flaw (Blatant Gift, Deficient Technique, Necessary Condition…), a troll’s Flaw (Disfigured, Magical Air, Nocturnal, Greedy, Wrathful, Offensive to Animals, Repellent), or experience lost in an Art (Warping Score + simple die).';
