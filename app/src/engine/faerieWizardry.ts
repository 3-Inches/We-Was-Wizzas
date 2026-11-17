// Realms of Power: Faerie, Chapters Five and Six: Sympathy Traits and Faerie Rank, faerie rites
// (a Method and a Power, held to five times the applicable Sympathy Traits), the four Arts of the
// Ars Fabulosa, Faerie Calling, and a faerie's change of role through a creative human.

import { FAERIE_DURATIONS, FAERIE_RANGES, FAERIE_TARGETS, bargainAbilityId, type BargainArtId, type FaerieMethodId, type FaeriePowerId } from '../data/faerie';
import type { DerivedCharacter } from './character/derive';
import { DURATIONS, RANGES, TARGETS, addMagnitudes, type RDTOption } from './spellDesign';
import type { Character, SympathyTrait } from './types';

const score = (d: DerivedCharacter, id: string) => d.abilities.filter((a) => a.abilityId === id).reduce((m, a) => Math.max(m, a.total), 0);
const holds = (c: Character, id: string) => c.virtues.some((v) => v.defId === id);

// ------------------------------------------------------------------------------------------------
// Sympathy Traits and Faerie Rank

/** Faerie Rank: the highest positive Sympathy Trait, modified by the lowest negative one (Winter +4 and Summer −2 make 2). */
export function faerieRank(traits: readonly SympathyTrait[] = []): number {
  const pos = Math.max(0, ...traits.map((t) => t.score));
  const neg = Math.min(0, ...traits.map((t) => t.score));
  return pos + neg;
}

/** The sum of the applicable Traits, a negative one counted as positive: what sets the highest rite level or Might reached. */
export const sympathySum = (traits: readonly SympathyTrait[]) => traits.reduce((t, x) => t + Math.abs(x.score), 0);

/**
 * How high a Sympathy Trait may be raised by experience: the Warping Score, +1 for Faerie Blood or Faerie
 * Upbringing, +3 for Strong Faerie Blood; a trait from Faerie Sympathy may go to its first score + the
 * Warping Score (+1 for the Minor Virtue, +3 for the Major).
 */
export function sympathyCap(c: Character, d: DerivedCharacter): number {
  const blood = holds(c, 'strong-faerie-blood') ? 3 : holds(c, 'faerie-blood') ? 1 : 0;
  const upbringing = holds(c, 'faerie-upbringing-flaw') ? 1 : 0;
  const virtue = Math.max(0, ...c.virtues.filter((v) => v.defId === 'faerie-sympathy').map((v) => (v.size === 'Major' ? 3 : 1)));
  return d.warpingScore + blood + upbringing + virtue;
}

/** Experience to raise a trait one point: 5 × (the score + 1) upward from 0; from −n toward 0, 5 × (n + 1) (10 from −1, 15 from −2). */
export const sympathyStep = (s: number) => 5 * (Math.abs(s) + 1);

/**
 * Extra botch dice from negative Sympathy Traits: as many as the worst one, on every botch roll the
 * character makes, whether or not the trait applies (RoP: Faerie, Sympathy Traits: "a character with an
 * Iron −3 Sympathy Trait would always roll at least three additional botch dice").
 */
export function sympathyBotchDice(c: Pick<Character, 'sympathy'>): { dice: number; trait?: SympathyTrait } {
  const worst = (c.sympathy ?? []).reduce<SympathyTrait | undefined>((w, t) => (t.score < 0 && (!w || t.score < w.score) ? t : w), undefined);
  return { dice: worst ? -worst.score : 0, trait: worst };
}

/** Whether experience can raise a trait a point: a positive trait up to the cap; a negative one only while the Warping Score exceeds its size (RoP: Faerie, Increasing Sympathy Traits). */
export const sympathyCanRise = (score: number, cap: number, warping: number) => (score >= 0 ? score < cap : -score < warping);

/**
 * Experience gained or lost in a trait. Practice is held by `limit` (the cap for positive traits, the
 * Warping Score for negative ones). The 1s and botches of play are not: "these fluctuations are not
 * limited by the character's Warping Score" (RoP: Faerie, Increasing Sympathy Traits), so leave it out
 * for them. A 1 gives each trait used a point, a botch takes one away for each 0 rolled. Returns the trait changed.
 */
export function sympathyXp(t: SympathyTrait, delta: number, limit?: { cap: number; warping: number }): SympathyTrait {
  const canRise = (s: number) => !limit || sympathyCanRise(s, limit.cap, limit.warping);
  let score = t.score;
  let xp = (t.xp ?? 0) + delta;
  while (xp >= sympathyStep(score) && canRise(score)) {
    xp -= sympathyStep(score);
    score += 1;
  }
  while (xp < 0) {
    score -= 1;
    xp += sympathyStep(score);
  }
  return { ...t, score, xp: canRise(score) ? xp : Math.min(xp, sympathyStep(score) - 1) };
}

/** A character with Sympathy Traits, or a Virtue or Flaw that gives them. */
export function hasSympathy(c: Character): boolean {
  return !!c.sympathy?.length || ['faerie-sympathy', 'faerie-antipathy-flaw', 'faerie-background'].some((id) => holds(c, id));
}

/** The Traits the character's Virtues and Flaws say it should have: one for each Faerie Sympathy or Antipathy, two for Faerie Background. */
export function expectedTraits(c: Character): { from: string; score: number }[] {
  const out: { from: string; score: number }[] = [];
  for (const v of c.virtues) {
    if (v.defId === 'faerie-sympathy') out.push({ from: `Faerie Sympathy${v.param ? ` (${v.param})` : ''}`, score: v.size === 'Major' ? 3 : 1 });
    if (v.defId === 'faerie-antipathy-flaw') out.push({ from: `Faerie Antipathy${v.param ? ` (${v.param})` : ''}`, score: v.size === 'Major' ? -3 : -1 });
    if (v.defId === 'faerie-background') out.push({ from: 'Faerie Background (positive)', score: 1 }, { from: 'Faerie Background (negative)', score: -1 });
  }
  return out;
}

// ------------------------------------------------------------------------------------------------
// Faerie rites

const METHOD_CHAR: Record<FaerieMethodId, 'Com' | 'Pre' | 'Sta'> = { evocation: 'Com', enchantment: 'Pre', empathy: 'Sta' };

/** The Methods and Powers a character has a score in. */
export function faerieArts(d: DerivedCharacter): { methods: FaerieMethodId[]; powers: FaeriePowerId[] } {
  const methods = (['evocation', 'enchantment', 'empathy'] as const).filter((m) => d.abilities.some((a) => a.abilityId === m));
  const powers = (['beguile', 'conjure', 'dream', 'grant', 'portage', 'ware', 'weal', 'woe'] as const).filter((p) => d.abilities.some((a) => a.abilityId === p));
  return { methods: [...methods], powers: [...powers] };
}

export const isFaerieWizard = (d: DerivedCharacter) => {
  const a = faerieArts(d);
  return (a.methods.length > 0 && a.powers.length > 0) || (['faerie-summoning', 'bonding', 'captivating', 'dismissing'] as const).some((id) => d.abilities.some((x) => x.abilityId === id));
};

/** Rite Casting Total, before the die: the Method's Characteristic + Method + Power + the aura modifier for a Faerie effect. */
export function riteTotal(d: DerivedCharacter, method: FaerieMethodId, power: FaeriePowerId, aura: number): { total: number; parts: { label: string; value: number }[] } {
  const ch = METHOD_CHAR[method];
  const parts = [
    { label: ({ Com: 'Communication', Pre: 'Presence', Sta: 'Stamina' } as const)[ch], value: d.characteristics[ch].value },
    { label: method[0].toUpperCase() + method.slice(1), value: score(d, method) },
    { label: power[0].toUpperCase() + power.slice(1), value: score(d, power) },
    { label: 'Aura', value: aura },
  ];
  return { total: parts.reduce((t, p) => t + p.value, 0), parts };
}

/** The highest level a rite can reach: 5 × the applicable Sympathy Traits (negative ones as positive), doubled by an Empathy extension. */
export const riteMaxLevel = (traits: readonly SympathyTrait[], empathyExtended = false) => 5 * sympathySum(traits) * (empathyExtended ? 2 : 1);

/** Every Range, Duration and Target a rite may use: the Hermetic ones (not those of other traditions) and the faerie ones. */
export function riteOptions(): { ranges: RDTOption[]; durations: RDTOption[]; targets: RDTOption[] } {
  const herm = (l: RDTOption[]) => l.filter((o) => !o.requires);
  const merge = (base: RDTOption[], extra: { name: string; magnitude: number; ritual?: boolean; note?: string }[]) => {
    const names = new Set(base.map((o) => o.name.toLowerCase()));
    return [...base, ...extra.filter((o) => !names.has(o.name.toLowerCase())).map((o) => ({ ...o }) as RDTOption)].sort((a, b) => a.magnitude - b.magnitude);
  };
  return { ranges: merge(herm(RANGES), FAERIE_RANGES), durations: merge(herm(DURATIONS), FAERIE_DURATIONS), targets: merge(herm(TARGETS), FAERIE_TARGETS) };
}

/** A rite's level: the guideline's base with the magnitudes of its Range, Duration and Target. */
export function riteLevel(base: number, range: string, duration: string, target: string, extra = 0): { level: number; ritual: boolean; design: string } {
  const o = riteOptions();
  const r = o.ranges.find((x) => x.name === range);
  const du = o.durations.find((x) => x.name === duration);
  const t = o.targets.find((x) => x.name === target);
  const mags = (r?.magnitude ?? 0) + (du?.magnitude ?? 0) + (t?.magnitude ?? 0) + extra;
  const level = addMagnitudes(base, mags);
  const bits = [`Base ${base}`, r?.magnitude ? `+${r.magnitude} ${range}` : '', du?.magnitude ? `+${du.magnitude} ${duration}` : '', t?.magnitude ? `+${t.magnitude} ${target}` : '', extra ? `+${extra} more` : ''].filter(Boolean);
  return { level, ritual: !!(r?.ritual || du?.ritual || t?.ritual) || level > 50, design: `(${bits.join(', ')})` };
}

/** Enchantment's performance: an Ability roll against 3 × the intended magnitude. */
export const enchantmentEase = (level: number) => 3 * Math.max(1, Math.ceil(level / 5));

/** Evocation's vis: +2 a pawn, up to Evocation + the Power in pawns. */
export const evocationVisLimit = (d: DerivedCharacter, power: FaeriePowerId) => score(d, 'evocation') + score(d, power);

/** A rite of level 30 or more Warps its target (RoP: Faerie, Sources of Faerie Warping). */
export const riteWarps = (level: number) => level >= 30;

// ------------------------------------------------------------------------------------------------
// The Ars Fabulosa

const BARGAIN_CHAR: Record<BargainArtId, 'Pre' | 'Com' | 'Per' | 'Int'> = { summoning: 'Pre', bonding: 'Com', captivating: 'Per', dismissing: 'Int' };

/** A bargaining Art's total before the die: Characteristic + the Art + Faerie Rank + aura. */
export function bargainTotal(d: DerivedCharacter, art: BargainArtId, rank: number, aura: number): { total: number; parts: { label: string; value: number }[] } {
  const ch = BARGAIN_CHAR[art];
  const parts = [
    { label: ({ Pre: 'Presence', Com: 'Communication', Per: 'Perception', Int: 'Intelligence' } as const)[ch], value: d.characteristics[ch].value },
    { label: art[0].toUpperCase() + art.slice(1), value: score(d, bargainAbilityId(art)) },
    { label: 'Faerie Rank', value: rank },
    { label: 'Aura', value: aura },
  ];
  return { total: parts.reduce((t, p) => t + p.value, 0), parts };
}

/**
 * Penetration for a bargaining Art: the total + the Penetration bonus (with the highest applicable
 * Sympathy Trait added to Penetration) − the effect level, which is the faerie's Might, or 0 when it is
 * held by a Summoning that penetrated.
 */
export function bargainPenetration(total: number, might: number, penetration: number, bestTrait: number, held: boolean): number {
  return total + penetration + Math.max(0, bestTrait) - (held ? 0 : might);
}

// ------------------------------------------------------------------------------------------------
// Faerie Calling

/** Acting while the Calling holds: stress die + Perception + Awareness against (Warping Score + points gained) × 3. */
export const callingActEase = (warpingScore: number, gained: number) => (warpingScore + gained) * 3;
/** Resolving it: stress die + Perception + Concentration against (Warping Score − Faerie Rank) × 3. */
export const callingResolveEase = (warpingScore: number, rank: number) => Math.max(0, (warpingScore - rank) * 3);

/** Faerie Calling comes on gaining 2 or more Warping Points at once, for one with Faerie Rank and no tradition of another realm. */
export function callingApplies(c: Character, d: DerivedCharacter): boolean {
  if (!c.sympathy?.length) return false;
  if (d.isMagus || c.holy?.tradition || c.virtues.some((v) => /infernal|diabolist/.test(v.defId))) return false;
  return true;
}

// ------------------------------------------------------------------------------------------------
// A faerie's change of role (RoP: Faerie, Creativity)

/** What a creative human can change in a faerie's glamour: the Ease Factor, the vitality (stored Pretense points) it costs beyond the faerie's Might. */
export const CREATIVITY_TABLE = [
  { ease: 6, cost: 0, effect: 'Lose a Virtue or Flaw and gain another of equal value' },
  { ease: 9, cost: 5, effect: 'Gain a Minor Virtue and a Minor Flaw' },
  { ease: 12, cost: 10, effect: 'Gain a Minor Virtue or lose a Minor Flaw' },
  { ease: 15, cost: 15, effect: 'Gain a Major Virtue and a Major Flaw' },
  { ease: 18, cost: 20, effect: 'Turn a Minor Virtue Major, a Minor Flaw into a Minor Virtue, or a Major Flaw into a Minor Flaw' },
  { ease: 21, cost: 25, effect: 'Gain a Major Virtue and a Minor Flaw' },
  { ease: 24, cost: 30, effect: 'Gain a Major Virtue or lose a Major Flaw' },
];

/** The vitality a change costs: the table's cost + the faerie's Might, less a pawn of encased vis each. */
export const creativityCost = (row: number, might: number, vis = 0) => Math.max(0, CREATIVITY_TABLE[row].cost + might - vis);
