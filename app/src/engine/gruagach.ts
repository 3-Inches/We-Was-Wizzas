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
import type { Art } from '../data/types';
import type { Character, LearnedCharm } from './types';
import { GRUAGACH_SHAPES, TATTOO_SIZES } from '../data/hedgeGruagach';
import { GRUAGACH_SPELLS } from '../data/gruagachSpells';
import { FREQUENCY } from './enchant';
import { bestFirst, firstDoable } from './firstChoice';

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
export function tattoo(
  labTotal: number,
  level: number,
  pictishScore: number,
  mastery: boolean,
  o: { usesMod?: number; sizeMult?: number } = {},
): { ok: boolean; maxLevel: number; vis: number; level: number; capacity: number; problems: string[] } {
  // more uses a day add to the effect's level, as for a Hermetic lesser enchantment (ArM5 p. 99): the book's
  // boar tattoo spends its spare level on 2 uses a day
  const total = level + (o.usesMod ?? 0);
  const base = Math.max(1, Math.ceil(total / 10));
  const vis = mastery ? Math.max(Math.ceil(base / 2), base - pictishScore) : base;
  // the tattoo's material holds 2 pawns × its size; a season's work takes no more than twice Pictish
  const capacity = 2 * (o.sizeMult ?? 1);
  const problems: string[] = [];
  if (vis > capacity) problems.push(`It needs ${vis} pawns, but a tattoo this size holds ${capacity}: make it larger.`);
  if (vis > gruagachVisLimit(pictishScore)) problems.push(`It needs ${vis} pawns, more than the ${gruagachVisLimit(pictishScore)} a season allows (twice Pictish).`);
  return { ok: labTotal >= 2 * total && !problems.length, maxLevel: Math.floor(labTotal / 2), vis, level: total, capacity, problems };
}

/**
 * A season inventing a spell, "exactly as their Hermetic counterparts do" (HMRE, Learning and Inventing New
 * Spells; ArM5 p. 95): the Lab Total less the level is gained each season, and the spell is known when the
 * points reach its level (in one season when the Lab Total is twice the level). The work under way is kept
 * on the character, so a spell can take several seasons. Changes `c`; returns what happened.
 */
export function gruagachInventSeason(c: Character, labTotal: number, spell: LearnedCharm): string {
  const g = c.gruagach ?? {};
  const same = g.inventing && g.inventing.spell.name === spell.name && g.inventing.spell.level === spell.level && g.inventing.spell.tf === spell.tf;
  const inv = same ? { ...g.inventing! } : { spell, progress: 0, seasons: 0 };
  const gain = Math.max(0, labTotal - spell.level);
  if (!gain) return `${spell.name}: the Lab Total ${labTotal} does not beat its level ${spell.level}; nothing gained.`;
  inv.progress += gain;
  inv.seasons += 1;
  if (inv.progress >= spell.level) {
    c.gruagach = { ...g, spells: [...(g.spells ?? []), { ...spell, source: 'play' }], inventing: undefined };
    return `${spell.name} is invented (+${gain} this season, ${inv.progress} of ${spell.level}${inv.seasons > 1 ? ` after ${inv.seasons} seasons` : ''}).`;
  }
  c.gruagach = { ...g, inventing: inv };
  return `${spell.name}: +${gain} this season, ${inv.progress} of ${spell.level}. Another season will continue it.`;
}

/** Vis in a season: twice Pictish. Extracted from an aura: the Take Vision Lab Total ÷ 10. */
export const gruagachVisLimit = (pictishScore: number) => 2 * pictishScore;

/**
 * The Hermetic Arts whose vis serves a gruagach Art (HMRE, Vis, line 3101): Give with Rego or Creo, Take
 * with Intellego, Rego or Perdo; Blessing and Curse with Corpus, Mentem or the target's Form; Shape with
 * Muto and the Forms of the target and its new shape; Vision with Imaginem, or Vim for visions granted.
 * The book leaves the rest to the storyguide's common sense. Animal is listed for Blessing and Curse
 * because the book's own boar tattoo takes "two pawns of Animal or Corpus vis" (line 3063).
 */
const GRUAGACH_VIS: Record<string, Art[]> = { Gv: ['Cr', 'Re'], Ta: ['In', 'Re', 'Pe'], Bl: ['Co', 'Me', 'An'], Cu: ['Co', 'Me', 'An'], Sh: ['Mu', 'An', 'Co'], Vs: ['Im', 'Vi'] };

/** The vis a tattoo of this gruagach Art can take: its Technique's and its Form's. */
export const tattooVisArts = (tf: GruagachArts): Art[] => [...new Set([...(GRUAGACH_VIS[tf.slice(0, 2)] ?? []), ...(GRUAGACH_VIS[tf.slice(2)] ?? [])])];
export const gruagachExtraction = (takeVisionLabTotal: number) => Math.max(0, Math.floor(takeVisionLabTotal / 10));

// ------------------------------------------------------------------------------------------------
// Transformation

/** Warping Points from a botched spell: one for each 0, doubled for a Vision spell ("every Vision botch inflicts double the normal Warping Points", HMRE, Botches). */
export const botchWarpingPoints = (tf: GruagachArts, botches: number) => botches * (tf.endsWith('Vs') ? 2 : 1);

/**
 * Two or more Warping Points from a single botch may bring transformation; any botch does when
 * Transformation Prone (HMRE, Transformation). Takes the points gained, so a single Vision botch (2 points) counts.
 */
export const transformationFollows = (c: Pick<Character, 'virtues'>, points: number) => points >= 2 || (points >= 1 && has(c, 'transformation-prone-flaw'));

/** Avoiding it: Stamina + Concentration + the Vision Magic Defense bonus + stress die, against Warping Score + the points gained + aura + stress die. */
export function transformationAvoid(d: DerivedCharacter, warpingScore: number, gained: number, aura: AuraState | undefined, visionDefense = 0): { total: number; against: number } {
  return { total: d.characteristics.Sta.value + score(d, 'concentration') + visionDefense, against: warpingScore + gained + (aura && aura.realm !== 'None' ? aura.strength : 0) };
}

/** Understanding it: Intelligence + stress die against Warping Score + stress die; good if it succeeds. At Warping Score 10 the gruagach is a troll. */
export const understandingTransformation = (d: DerivedCharacter) => d.characteristics.Int.value;

export const TRANSFORMATION_GOOD = 'Good: a gruagach Art or a magic Virtue (Major or Minor Magical Focus, Secondary Insight, Affinity, Puissant Art…), a troll’s Virtue (Large, Sharp Ears, Giant Blood, Tough, Reserves of Strength), or experience in an Art (Warping Score + simple die).';
export const TRANSFORMATION_BAD = 'Bad: a magic Flaw (Blatant Gift, Deficient Technique, Necessary Condition…), a troll’s Flaw (Disfigured, Magical Air, Nocturnal, Greedy, Wrathful, Offensive to Animals, Repellent), or experience lost in an Art (Warping Score + simple die).';

// ------------------------------------------------------------------------------------------------
// A gruagach's season, as the Seasons page sets it

/** A season's work: a tattoo enchanted, a spell invented, vis drawn from the aura (HMRE, Gruagach Lab Activities). */
export type GruagachWork = 'tattoo' | 'invent' | 'vis';

/** The Technique and Form pairs a gruagach can work with: each Technique with each Form they have. */
export function gruagachPairs(c: Character, d: DerivedCharacter): GruagachArts[] {
  const a = gruagachArts(c, d);
  return a.techniques.flatMap((t) => a.forms.map((f) => `${t.abbr}${f.abbr}` as GruagachArts));
}

/** The works this gruagach can take up: a tattoo unless No Tattoo Magic, a spell, vis only with Take Vision. */
export function gruagachWorks(c: Character, pairs: GruagachArts[]): GruagachWork[] {
  return [...(has(c, 'no-tattoo-magic-flaw') ? [] : (['tattoo'] as const)), 'invent' as const, ...(pairs.includes('TaVs') ? (['vis'] as const) : [])];
}

/** The book's spells in this gruagach's Arts, which the card offers first. */
export const gruagachBookSpells = (pairs: GruagachArts[]) => GRUAGACH_SPELLS.filter((x) => pairs.includes(x.tf) && !x.general);

/** How a tattoo is set on the card: its shape, size and uses a day, and a similar spell's magnitude. The card opens on these. */
export interface GruagachSeasonSet { shape: number; size: number; uses: string; similar: number }
export const GRUAGACH_SEASON_SET: GruagachSeasonSet = { shape: 0, size: 1, uses: '1', similar: 0 };

export interface GruagachSeason {
  tf: GruagachArts;
  lt: GruagachTotal;
  usesMod: number;
  tat?: ReturnType<typeof tattoo>;
  /** pawns the tattoo takes; pawns of Vim drawn; points of a spell invented this season */
  need: number;
  drawn: number;
  gain: number;
  /** why it cannot be done: no effect designed, a tattoo beyond the Lab Total, no progress on the spell, too little vis to hand, no vis to draw */
  blocked?: 'design' | 'tattoo' | 'no-gain' | 'short' | 'no-vis';
}

/**
 * A gruagach's season, as set, with `have` pawns of the tattoo's vis to hand: the Lab Total, the tattoo,
 * the vis it takes or draws, a spell's progress, and why it cannot be done. The season itself is the card's to check.
 */
export function gruagachSeason(c: Character, d: DerivedCharacter, aura: AuraState | undefined, work: GruagachWork, spell: Pick<LearnedCharm, 'tf' | 'level'> | undefined, set: GruagachSeasonSet & { have: number }, pairs = gruagachPairs(c, d)): GruagachSeason {
  const tf = (work === 'vis' ? 'TaVs' : (spell?.tf ?? pairs[0])) as GruagachArts;
  const shape = GRUAGACH_SHAPES[set.shape] ? Number((GRUAGACH_SHAPES[set.shape].bonuses.match(/\+(\d+)/) ?? ['', '0'])[1]) : 0;
  const lt = gruagachLabTotal(c, d, tf, aura, { tattoo: work === 'tattoo', shape, similar: set.similar });
  const usesMod = FREQUENCY.find((f) => f.value === set.uses)?.mod ?? 0;
  const tat = work === 'tattoo' && spell ? tattoo(lt.total, spell.level, pictish(c, d), has(c, 'tattoo-mastery'), { usesMod, sizeMult: TATTOO_SIZES[set.size]?.mult }) : undefined;
  const need = tat?.ok ? tat.vis : 0;
  const drawn = work === 'vis' ? gruagachExtraction(lt.total) : 0;
  const gain = work === 'invent' && spell ? Math.max(0, lt.total - spell.level) : 0;
  // a Take Vision Lab Total under 10 draws no vis: a season spent for nothing is not offered (Hedge Magic, line 3103)
  const blocked = work !== 'vis' && !spell ? 'design' : work === 'tattoo' && !tat?.ok ? 'tattoo' : work === 'invent' && !gain ? 'no-gain' : work === 'vis' && !drawn ? 'no-vis' : need > set.have ? 'short' : undefined;
  return { tf, lt, usesMod, tat, need, drawn, gain, blocked };
}

/**
 * The work and book spell a gruagach's season opens on: a tattoo of the highest spell of the book they
 * can enchant with the vis to hand (`have`, the fuller of the purse and the covenant's stores), else a
 * spell they can make progress on, else vis drawn; the first of all when none can be done.
 */
export function firstGruagachWork(c: Character, d: DerivedCharacter, aura: AuraState | undefined, have: (arts: Art[]) => number): { work: GruagachWork; spell?: string } | undefined {
  const pairs = gruagachPairs(c, d);
  if (!pairs.length) return undefined;
  const spells = bestFirst(gruagachBookSpells(pairs), (s) => s.level);
  const options = gruagachWorks(c, pairs).flatMap((work): { work: GruagachWork; spell?: string }[] => (work === 'vis' ? [{ work }] : spells.map((s) => ({ work, spell: s.name }))));
  const pick = firstDoable(options, (o) => {
    const s = spells.find((x) => x.name === o.spell);
    return gruagachSeason(c, d, aura, o.work, s, { ...GRUAGACH_SEASON_SET, have: s ? have(tattooVisArts(s.tf)) : 0 }, pairs).blocked;
  });
  return pick ?? { work: gruagachWorks(c, pairs)[0] };
}

