// The Elementalists (Hedge Magic, Revised Edition, Chapter Two): the four Techniques' totals, the
// Summoning chart, the Elemental Traits that Warping and the Forms bring (Soak against the element,
// humoral illness), vis in elemental magic, and a season's Refining: the longevity potion, vis
// extracted or moved, Might restored or drained.

import { ELEMENTS, ELEMENTAL_MASTERY, ELEMENTAL_TECHNIQUES, REFINING_ABILITY, SUMMONING_CHART, TECHNIQUE_VIRTUE, type ElementId, type ElementalTechniqueId, type ElementalType } from '../data/hedgeElemental';
import type { DerivedCharacter } from './character/derive';
import { auraModifier, type AuraState, type Part } from './magic';
import type { Character } from './types';
import { warpingScoreFromPoints } from './xp';

const score = (d: DerivedCharacter, id: string) => d.abilities.filter((a) => a.abilityId === id).reduce((m, a) => Math.max(m, a.total), 0);
const has = (c: Pick<Character, 'virtues'>, id: string) => c.virtues.some((v) => v.defId === id);
const holds = (d: DerivedCharacter, id: string) => d.abilities.some((a) => a.abilityId === id);

export interface ElementalArts {
  techniques: { id: ElementalTechniqueId; name: string; score: number; types: ElementalType[] }[];
  forms: { id: ElementId; name: string; score: number }[];
}

/** The Techniques (with the types of target each Virtue opened) and the Forms a character holds. */
export function elementalArts(c: Character, d: DerivedCharacter): ElementalArts {
  const techniques = ELEMENTAL_TECHNIQUES.filter((t) => holds(d, t.ability)).map((t) => {
    const types = c.virtues.filter((v) => v.defId === TECHNIQUE_VIRTUE[t.id]).map((v) => v.param as ElementalType).filter((x) => x === 'Medicinal' || x === 'Philosophical' || x === 'Theurgical');
    return { id: t.id, name: t.name, score: score(d, t.ability), types: [...new Set(types)] };
  });
  const forms = ELEMENTS.filter((e) => holds(d, e.ability)).map((e) => ({ id: e.id, name: e.name, score: score(d, e.ability) }));
  return { techniques, forms };
}

export const isElementalist = (c: Character, d: DerivedCharacter) => {
  const a = elementalArts(c, d);
  return a.techniques.length > 0 && a.forms.length > 0;
};

/**
 * The Form score for one or more elements: the lowest of them, or with Elementalist Magic the highest;
 * with Elemental Medicine, Philosophiae or Theurgy the highest, held to that Ability.
 */
export function formFor(c: Character, d: DerivedCharacter, elements: ElementId[]): { value: number; label: string } {
  const scores = elements.map((e) => ({ e, s: score(d, ELEMENTS.find((x) => x.id === e)!.ability) }));
  if (!scores.length) return { value: 0, label: 'no Form' };
  const names = elements.map((e) => ELEMENTS.find((x) => x.id === e)!.name.replace('Elementalist ', '')).join(' + ');
  if (scores.length === 1) return { value: scores[0].s, label: ELEMENTS.find((x) => x.id === elements[0])!.name };
  const low = Math.min(...scores.map((x) => x.s));
  const high = Math.max(...scores.map((x) => x.s));
  if (has(c, 'elementalist-magic')) return { value: high, label: `${names} (the highest, Elementalist Magic)` };
  let best: { value: number; label: string } | undefined;
  for (const [virtue, ability] of Object.entries(ELEMENTAL_MASTERY)) {
    if (!ability || !has(c, virtue)) continue;
    const cap = virtue === 'elemental-theurgy' ? theurgyLore(c, d) : score(d, ability);
    const v = Math.max(low, Math.min(high, cap));
    if (!best || v > best.value) best = { value: v, label: `${names} (the highest, held to ${virtue === 'elemental-medicine' ? 'Medicine' : virtue === 'elemental-philosophiae' ? 'Philosophiae' : 'the realm’s Lore'})` };
  }
  return best ?? { value: low, label: `${names} (the lowest)` };
}

const LORE: Record<string, string> = { Magic: 'magic-lore', Faerie: 'faerie-lore', Divine: 'dominion-lore', Infernal: 'infernal-lore' };
const theurgyLore = (c: Character, d: DerivedCharacter) => score(d, LORE[c.virtues.find((v) => v.defId === 'elemental-theurgy')?.param ?? 'Magic'] ?? 'magic-lore');

/** Vis in elemental magic: +2 a pawn of the Form's own vis, up to the sum of the four Forms (no vis in Refining). */
export const elementalVisLimit = (d: DerivedCharacter) => ELEMENTS.reduce((t, e) => t + score(d, e.ability), 0);

export interface ElementalTotal {
  total: number;
  parts: Part[];
  /** botch dice from a foreign aura */
  auraBotch: number;
}

/** A Technique's total (without the die): Characteristic + Technique + Form + aura (+ vis; for Refining the type's Ability). */
export function elementalTotal(
  c: Character,
  d: DerivedCharacter,
  technique: ElementalTechniqueId,
  elements: ElementId[],
  aura: AuraState | undefined,
  o: { type?: ElementalType; vis?: number; realmLore?: string } = {},
): ElementalTotal {
  const t = ELEMENTAL_TECHNIQUES.find((x) => x.id === technique)!;
  const f = formFor(c, d, elements);
  const a = auraModifier('Magic', aura);
  const parts: Part[] = [
    { label: ({ Sta: 'Stamina', Pre: 'Presence', Per: 'Perception', Int: 'Intelligence' } as const)[t.char], value: d.characteristics[t.char].value },
    { label: t.name, value: score(d, t.ability) },
    { label: f.label, value: f.value },
  ];
  if (a.mod) parts.push({ label: a.note ?? 'Magic aura', value: a.mod });
  if (technique === 'refining' && o.type) {
    const ability = o.type === 'Theurgical' ? (o.realmLore ?? REFINING_ABILITY.Theurgical) : REFINING_ABILITY[o.type];
    parts.push({ label: d.abilities.find((x) => x.abilityId === ability)?.name ?? ability, value: score(d, ability) });
  }
  if (o.vis && technique !== 'refining') parts.push({ label: `${o.vis} pawns of vis`, value: 2 * o.vis });
  return { total: parts.reduce((s, p) => s + p.value, 0), parts, auraBotch: a.botch };
}

/**
 * What a total reaches on the Summoning chart: the target's greatest Might and Size. The chart's Might
 * column equals its Total, so a total reaches Might up to itself (7 reaches Might 7, as `summoningNeeds`
 * agrees); Size goes by the chart's rows (7 reaches only Size −6).
 */
export function summoningReach(total: number): { might: number; size: number; note: string } {
  const row = [...SUMMONING_CHART].reverse().find((r) => total >= r.total) ?? SUMMONING_CHART[0];
  return { might: Math.max(0, total), size: row.size, note: row.note };
}

/** The total a target needs on the chart: enough for both its Might and its Size. */
export function summoningNeeds(might: number, size: number): number {
  const bySize = SUMMONING_CHART.find((r) => r.size >= size)?.total ?? 50;
  return Math.max(Math.max(0, might), bySize);
}

// ------------------------------------------------------------------------------------------------
// Elemental Traits (Elemental Warping)

export interface ElementalTrait {
  element: ElementId;
  trait: string;
  score: number;
  /** +3 a Minor Personality Flaw, +6 a Major one, +10 the player loses control */
  weight: 'none' | 'minor' | 'major' | 'lost';
}

/** One Trait for each Form held: the Warping Score + the Form ÷ 5, rounded up. */
export function elementalTraits(c: Character, d: DerivedCharacter): ElementalTrait[] {
  const ws = warpingScoreFromPoints(c.warpingPoints);
  return ELEMENTS.filter((e) => holds(d, e.ability)).map((e) => {
    const s = ws + Math.ceil(score(d, e.ability) / 5);
    return { element: e.id, trait: e.trait, score: s, weight: s >= 10 ? 'lost' : s >= 6 ? 'major' : s >= 3 ? 'minor' : 'none' };
  });
}

/** Soak against the element: its Trait, unless Weak Elemental Resistance; less the opposing Trait when Vulnerable to that element's opposite. */
export function elementalSoak(c: Character, traits: ElementalTrait[], element: ElementId): number {
  if (has(c, 'weak-elemental-resistance-flaw')) return 0;
  return traits.find((t) => t.element === element)?.score ?? 0;
}

/** An illness of the element's humor: its Trait comes off Recovery, the opposing Trait adds. */
export function humoralRecovery(traits: ElementalTrait[], element: ElementId): number {
  const opp = ELEMENTS.find((e) => e.id === element)!.opposes;
  return (traits.find((t) => t.element === opp)?.score ?? 0) - (traits.find((t) => t.element === element)?.score ?? 0);
}

// ------------------------------------------------------------------------------------------------
// What a total does

/** Medicinal Controlling: an emotion as a Personality Trait of the total ÷ 10, rounded up. */
export const controlledEmotion = (total: number) => Math.ceil(Math.max(0, total) / 10);
/** Philosophical Controlling: the total ÷ 5 added to Soak against the material while concentrating. */
export const controlledSoak = (total: number) => Math.floor(Math.max(0, total) / 5);
/** Medicinal Divining over a recovery: the total ÷ 5 as magical aid. */
export const diviningAid = (total: number) => Math.floor(Math.max(0, total) / 5);

/** The longevity potion: the Refining Total (the lowest Form a requisite) ÷ 5 to Aging rolls until a crisis; vis of the age ÷ 5, rounded up. */
export const longevityPotion = (refiningTotal: number, age: number) => ({ bonus: Math.floor(Math.max(0, refiningTotal) / 5), vis: Math.ceil(age / 5) });

/** The Characteristics a physician's potion can raise with each element (HMRE, Medicinal). */
export const POTION_CHARACTERISTICS: Record<ElementId, ('Int' | 'Per' | 'Pre' | 'Com' | 'Str' | 'Sta' | 'Dex' | 'Qik')[]> = {
  air: ['Int', 'Per', 'Pre', 'Com'],
  earth: ['Str', 'Sta', 'Dex', 'Qik'],
  fire: ['Pre', 'Com', 'Dex', 'Qik'],
  water: ['Int', 'Per', 'Str', 'Sta'],
};

/**
 * Medicinal Refining's other potion: a year's boost to one Characteristic of the element, the Refining
 * Total ÷ 5, but never above half the elementalist's score in the Form used; vis as the longevity potion,
 * the drinker's age ÷ 5 (HMRE, Medicinal: a lowest Form of 4 and a total of 25 give "five levels, but no higher than +2").
 */
export function characteristicPotion(refiningTotal: number, formScore: number, current: number, age: number): { bonus: number; cap: number; result: number; vis: number } {
  const bonus = Math.floor(Math.max(0, refiningTotal) / 5);
  const cap = Math.floor(formScore / 2);
  return { bonus, cap, result: Math.max(current, Math.min(current + bonus, cap)), vis: Math.ceil(age / 5) };
}

/** Philosophical Refining: vis from an aura, the total ÷ 10. */
export const refiningExtraction = (total: number) => Math.floor(Math.max(0, total) / 10);

/**
 * Moving vis: the total must reach 5 × the pawns; vis of another Form changes to the element's and half is
 * lost. The book contradicts itself here (HMRE, Philosophical): its text says half "(rounded down) is lost",
 * which would leave 3 of 5 pawns, but its own example leaves 2 ("5 pawns of Vim vis … leaving 2 pawns of
 * Auram vis"). This follows the example: half arrive, rounded down.
 */
export function moveVis(total: number, pawns: number, sameForm: boolean): { ok: boolean; arrive: number } {
  return { ok: total >= 5 * pawns, arrive: sameForm ? pawns : Math.floor(pawns / 2) };
}

/** How the element of the Form used stands to the being's: the same, its opposite (air and earth, fire and water), or another. */
export type MightRelation = 'own' | 'opposed' | 'other';

export interface RefinedMight {
  /** the excess over the being's Might, halved (rounded down) for another element */
  points: number;
  /** whether the points come off its Might Pool */
  drain: boolean;
  /** points that change its Might Pool: all of a drain down to 0, or a restore up to its Might Score */
  changed: number;
  /** pawns of vis that form */
  vis: number;
}

/**
 * Theurgical Refining (and a philosopher's on supernatural animals), HMRE, Theurgical: the excess of the
 * Refining Total over the being's Might restores Might Points when the Form used is its own element,
 * drains them when it is the opposed one, and otherwise moves half (rounded down) either way, as the
 * elementalist chooses. Vis forms only when the being loses Might Points, or would gain more than its pool
 * holds: a pawn for 5 points, no more than its Might Score ÷ 5. The book's "1 pawn for every 5 Might
 * Points given" is read as the points lost, or the points beyond the pool.
 * `pool` is the Might Points it has now (full, its Might Score, unless given).
 */
export function refineMight(total: number, might: number, relation: MightRelation, o: { drain?: boolean; pool?: number } = {}): RefinedMight {
  const excess = Math.max(0, total - might);
  const points = relation === 'other' ? Math.floor(excess / 2) : excess;
  const drain = relation === 'opposed' || (relation === 'other' && !!o.drain);
  const pool = Math.max(0, Math.min(might, o.pool ?? might));
  const changed = drain ? Math.min(points, pool) : Math.min(points, might - pool);
  const toVis = drain ? changed : points - changed;
  return { points, drain, changed, vis: Math.min(Math.floor(toVis / 5), Math.floor(might / 5)) };
}

/** The Lore a theurgist adds to Refining: that of the target's realm (HMRE, Theurgical). */
export const THEURGY_REALMS = [
  { realm: 'Magic', lore: 'magic-lore' },
  { realm: 'Faerie', lore: 'faerie-lore' },
  { realm: 'Divine', lore: 'dominion-lore' },
  { realm: 'Infernal', lore: 'infernal-lore' },
] as const;

/** The longevity potion's vis is held to the sum of the Elementalist Forms (HMRE, Refining). */
export const potionVisOk = (d: DerivedCharacter, vis: number) => vis <= elementalVisLimit(d);
