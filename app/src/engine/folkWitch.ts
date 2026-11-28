// The Folk Witches (Hedge Magic, Revised Edition, Chapter Three): casting a power by incantation or
// fetish (Characteristic + Ability + aura + stress die against an Ease Factor), vis and Life-Linked
// Magic, the kitchen's Lab Total, potions (Brew Potency, doses, vis), fetishes, vis extraction, a
// familiar's binding, and the Witch Moon that comes with each new Warping Score.

import { WITCH_FETISHES, WITCH_HEALING, WITCH_POWERS, type WitchMethod } from '../data/hedgeFolkWitch';
import { ARTS, ART_NAMES, FORMS } from '../data/constants';
import type { Art } from '../data/types';
import type { DerivedCharacter } from './character/derive';
import { auraModifier, type AuraState, type Part } from './magic';
import type { Character, Season } from './types';
import { uid } from '../util/id';
import { warpingScoreFromPoints } from './xp';
import { bestFirst, firstDoable } from './firstChoice';

const score = (d: DerivedCharacter, id: string) => d.abilities.filter((a) => a.abilityId === id).reduce((m, a) => Math.max(m, a.total), 0);
const has = (c: Pick<Character, 'virtues'>, id: string) => c.virtues.some((v) => v.defId === id);

export const isFolkWitch = (c: Pick<Character, 'virtues'>) => has(c, 'folk-witch');

/** The powers a folk witch can use: those on the sheet; a Gifted one's favored powers at 0 if not yet learned. */
export function witchPowers(c: Character, d: DerivedCharacter): { id: string; name: string; score: number; methods: WitchMethod[] }[] {
  const flawed = c.virtues.filter((v) => v.defId === 'flawed-folk-witch-gift-opening').map((v) => (v.param ?? '').toLowerCase());
  return WITCH_POWERS.filter((p) => d.abilities.some((a) => a.abilityId === p.id) || (isFolkWitch(c) && d.hasGift && p.id !== 'animal-healing' && !flawed.includes(p.name.toLowerCase()))).map((p) => ({
    id: p.id, name: p.name, score: score(d, p.id), methods: methodsFor(c, p.methods),
  }));
}

/** Rarefied Tradition: potions only; Silent Tradition: no incantations. */
export function methodsFor(c: Pick<Character, 'virtues'>, methods: WitchMethod[]): WitchMethod[] {
  if (has(c, 'rarefied-tradition-flaw')) return methods.filter((m) => m === 'potion');
  if (has(c, 'silent-tradition-flaw')) return methods.filter((m) => m !== 'incantation');
  return methods;
}

export interface WitchTotal {
  total: number;
  parts: Part[];
  notes: string[];
  auraBotch: number;
}

/** The botch dice of a folk witch's Casting Total: one, and a foreign aura's level (DE, Realm Interaction). */
export const witchBotchDice = (t: { auraBotch: number }) => 1 + t.auraBotch;

/** Casting Score: Characteristic + Ability + aura, −1 for a Flawed Opening's power, + vis (Gifted only, a pawn each), + 5 a Fatigue level with Life-Linked Magic. */
export function witchCastingScore(c: Character, d: DerivedCharacter, power: string, aura: AuraState | undefined, o: { vis?: number; fatigue?: number } = {}): WitchTotal {
  const p = WITCH_POWERS.find((x) => x.id === power)!;
  const a = auraModifier('Magic', aura);
  const notes: string[] = [];
  const parts: Part[] = [
    { label: ({ Com: 'Communication', Dex: 'Dexterity', Per: 'Perception', Sta: 'Stamina' } as const)[p.char], value: d.characteristics[p.char].value },
    { label: p.name, value: score(d, p.id) },
  ];
  if (a.mod) parts.push({ label: a.note ?? 'Magic aura', value: a.mod });
  if (c.virtues.some((v) => v.defId === 'flawed-folk-witch-gift-opening' && (v.param ?? '').toLowerCase() === p.name.toLowerCase())) parts.push({ label: 'Flawed Gift Opening', value: -1 });
  if (o.vis) {
    if (d.hasGift) parts.push({ label: `${o.vis} pawns of ${p.form} vis`, value: o.vis });
    else notes.push('An unGifted folk witch cannot add vis to her Casting Score.');
  }
  if (o.fatigue) {
    if (has(c, 'life-linked-folk-witch-magic')) parts.push({ label: `${o.fatigue} Fatigue levels (Life-Linked)`, value: 5 * o.fatigue });
    else notes.push('Only Life-Linked Folk Witch Magic spends Fatigue for a bonus.');
  }
  if (c.folkWitch?.witchMoon) notes.push('The Witch Moon: she has lost her Supernatural Abilities until it passes (potions still work).');
  return { total: parts.reduce((t, x) => t + x.value, 0), parts, notes, auraBotch: a.botch };
}

/** Vis spent on a casting: no more than the Ability + the effect's own vis cost. */
export const witchVisLimit = (ability: number, effectVis = 0) => ability + effectVis;

/** Penetration: the Casting Total + the Penetration bonus − the Ease Factor. */
export const witchPenetration = (castingTotal: number, ease: number, penetration: number) => castingTotal + penetration - ease;

/** Healing: the Ease Factor and vis for a Wound or a Fatigue level. */
export function healingCost(kind: 'wound' | 'fatigue', ease: number): { ease: number; vis: number; what: string } | undefined {
  const row = WITCH_HEALING.find((r) => r.ease === ease);
  if (!row) return undefined;
  return kind === 'wound' ? { ease, vis: row.woundVis, what: row.wound } : { ease, vis: row.fatigueVis, what: row.fatigue };
}

// ------------------------------------------------------------------------------------------------
// The kitchen

/** Lab Total: the Supernatural Ability (doubled for potions with Expert Potion Brewer) + Intelligence + Folk Witch Magic Theory + aura (+ a familiar's help). */
export function kitchenLabTotal(c: Character, d: DerivedCharacter, power: string | undefined, aura: AuraState | undefined, o: { potion?: boolean; familiar?: number; other?: number } = {}): WitchTotal {
  const a = auraModifier('Magic', aura);
  const parts: Part[] = [];
  if (power) {
    const p = WITCH_POWERS.find((x) => x.id === power)!;
    const s = score(d, power);
    parts.push({ label: p.name, value: s });
    if (o.potion && has(c, 'expert-potion-brewer')) parts.push({ label: 'Expert Potion Brewer', value: s });
  }
  parts.push({ label: 'Intelligence', value: d.characteristics.Int.value }, { label: 'Folk Witch Magic Theory', value: score(d, 'folk-witch-magic-theory') });
  if (a.mod) parts.push({ label: a.note ?? 'Magic aura', value: a.mod });
  if (o.familiar) parts.push({ label: 'The familiar’s help', value: o.familiar });
  if (o.other) parts.push({ label: 'Other bonuses', value: o.other });
  const notes: string[] = [];
  if (o.potion && has(c, 'primitive-tradition-flaw')) notes.push('Primitive Tradition: she cannot brew potions.');
  return { total: parts.reduce((t, x) => t + x.value, 0), parts, notes, auraBotch: a.botch };
}

/** Vis in a season of kitchen work: twice Folk Witch Magic Theory, four times for potions with Concentrated Potions. */
export const kitchenVisLimit = (c: Pick<Character, 'virtues'>, fwmt: number, potion = false) => (potion && has(c, 'concentrated-potions') ? 4 : 2) * fwmt;

/**
 * A brew: the Brew Potency is the Lab Total; doses up to Folk Witch Magic Theory (+ a Lab Text's level);
 * a pawn a dose and the effect's own cost once; held to the season's vis.
 */
export function brew(fwmt: number, effectVis: number, visLimit: number, o: { labText?: number; wanted?: number } = {}): { doses: number; vis: number; maxDoses: number } {
  const maxDoses = fwmt + (o.labText ?? 0);
  const affordable = Math.max(0, visLimit - effectVis);
  const doses = Math.max(0, Math.min(o.wanted ?? maxDoses, maxDoses, affordable));
  return { doses, vis: doses ? doses + effectVis : 0, maxDoses };
}

/**
 * The vis a brew takes: "one pawn per dose (of the Form appropriate for the Ability)" (HMRE, Potion
 * Brewing, line 1966). Dowsing's Form is that of what is sought, so any Form serves; Cursing's is the curse's.
 */
export function potionVisArts(power: string): Art[] {
  const form = WITCH_POWERS.find((p) => p.id === power)?.form ?? '';
  if (/by the target/.test(form)) return [...FORMS];
  return ARTS.filter((a) => new RegExp(`\\b${ART_NAMES[a]}\\b`).test(form));
}

/** A fetish's pawn: Intellego for a dowsing rod, Auram for a flying aid, Animal for a knitted skin (HMRE, lines 1950–1958). */
export const fetishVisArt = (power: string): Art | undefined => ARTS.find((a) => ART_NAMES[a] === WITCH_FETISHES[power]?.vis);

/**
 * A folk witch's Longevity Ritual, by "the same rules used by a Hermetic magus" (HMRE, line 2025): a
 * pawn of Creo, Corpus or Vim vis for every five years of age, rounded up (ArM5, Longevity Rituals).
 * Unlike a magus's, it is held to the kitchen's limit on vis, twice Folk Witch Magic Theory (line 1928).
 */
export const WITCH_LONGEVITY_ARTS: Art[] = ['Cr', 'Co', 'Vi'];
export const witchLongevityVis = (age: number) => Math.ceil(Math.max(0, age) / 5);

/** What a potion gives: an Ability of the potency ÷ 5 (rounded up) for days equal to the potency (Animal Ken, Second Sight, a Shapeshifter's form), or for one search or flight. */
export const potionAbility = (potency: number) => ({ score: Math.ceil(Math.max(0, potency) / 5), days: Math.max(0, potency) });

/** Vis extracted from the aura in a season: a tenth of the Lab Total with no Ability in it, rounded up. */
export const witchVisExtraction = (labTotal: number) => Math.max(0, Math.ceil(labTotal / 10));

/** A familiar's binding: the Animal Ken Lab Total must beat 10 + its Size + its Magic Might. */
export const familiarBinding = (size: number, might: number) => 10 + size + might;

/** Investigating a potion: Intelligence + Folk Witch Magic Theory + stress die against 9. */
export const potionInvestigation = (d: DerivedCharacter) => d.characteristics.Int.value + score(d, 'folk-witch-magic-theory');

// ------------------------------------------------------------------------------------------------
// The Witch Moon

/** Ending the Witch Moon at a month's end: Stamina − Warping Score + stress die against 6. */
export const witchMoonEnds = (d: DerivedCharacter, warpingScore: number) => d.characteristics.Sta.value - warpingScore;

/** The wound each month: Medium, Heavy with Harsh Moon, none with Painless Moon. */
export function witchMoonWound(c: Pick<Character, 'virtues'>): 'Medium' | 'Heavy' | undefined {
  if (has(c, 'painless-moon')) return undefined;
  return has(c, 'harsh-moon-flaw') ? 'Heavy' : 'Medium';
}

/** Good when it passed within as many months as the Warping Score, else bad. */
export function witchMoonOutcome(months: number, warpingScore: number, pointsGained: number): { good: boolean; text: string } {
  if (months <= warpingScore) {
    return { good: true, text: `A good experience: ${5 * months} experience points in a Supernatural Ability or Folk Witch Magic Theory, a Minor Virtue, or a new Supernatural Ability at 1 (the storyguide chooses).` };
  }
  return { good: false, text: `A bad experience: ${2 * pointsGained} experience points lost in a Supernatural Ability or Folk Witch Magic Theory (not below 0), or a Minor Flaw (the storyguide chooses).` };
}

/**
 * Warping Points gained by a folk witch: a new Warping Score brings the Witch Moon, whatever the source
 * (HMRE, The Witch Moon, line 2069). It begins at once and is owed on the Seasons page's Resolve list until
 * it passes. Changes `x`; returns the line that says so.
 */
export function witchWarping(x: Character, points: number, when: { year: number; season: Season; why?: string; counted?: boolean }): string | undefined {
  // counted: the points are on the sheet already (a season log entry's)
  const before = warpingScoreFromPoints(Math.max(0, x.warpingPoints - (when.counted ? points : 0)));
  if (!when.counted) x.warpingPoints += points;
  const after = warpingScoreFromPoints(x.warpingPoints);
  if (after <= before || x.folkWitch?.witchMoon) return undefined;
  x.folkWitch = { ...(x.folkWitch ?? {}), witchMoon: { months: 0, warpingScore: after, pointsGained: 0 } };
  const gained = `${points} Warping Point${points === 1 ? '' : 's'}${when.why ? ` ${when.why}` : ''}`;
  (x.owed ??= []).push({ uid: uid(), year: when.year, season: when.season, kind: 'witch-moon', text: `Warping Score ${after} (${gained}): the Witch Moon begins. Roll at the end of each month until it passes.`, points });
  return `Warping Score ${after}: the Witch Moon begins. It waits on Game Table › Seasons, under Resolve.`;
}

/**
 * A curse fabric is complete when the season of weaving ends, and its curse takes effect then (HMRE, Curse
 * Fetish Weaving): rolled as the power is, the Casting Score at the weaving + a stress die against the
 * curse's Ease Factor, its Penetration the total + Penetration − the Ease Factor. Changes `x` (a botch's
 * Warping); returns what happened.
 */
export function rollWovenCurse(x: Character, die: { value: number; zero: boolean; botches: number; text: string }): string[] {
  const k = x.folkWitch?.curse;
  if (!k) return [];
  const total = k.score + die.value;
  const who = k.target ? ` on ${k.target}` : '';
  const out = [`The curse of ${k.name}${who}: stress die ${die.text} + Casting Score ${k.score} = ${total}, against ${k.ease}.`];
  if (die.zero && die.botches) {
    out.push(`BOTCH ×${die.botches}: the curse goes astray, uncontrolled and not as the witch meant; ${die.botches} Warping Point${die.botches === 1 ? '' : 's'}.`);
    const moon = witchWarping(x, die.botches, { year: k.year, season: k.season, why: 'from a botched curse' });
    if (moon) out.push(moon);
  } else if (total >= k.ease) out.push(`It takes hold. Penetration ${witchPenetration(total, k.ease, k.penetration)} (the total + Penetration ${k.penetration} − the Ease Factor), against the target's Magic Resistance.`);
  else out.push('It fails; the fabric is spent.');
  x.folkWitch = { ...(x.folkWitch ?? {}), curse: undefined };
  return out;
}

/** The works of a season in the kitchen (HMRE, The Witch's Kitchen). */
export type KitchenWork = 'brew' | 'fetish' | 'curse' | 'vis' | 'longevity' | 'familiar';

type Power = ReturnType<typeof witchPowers>[number];

/** The works this witch can take up in the kitchen, in the book's order: each needs its power, a brew no Primitive Tradition. */
export function kitchenWorks(c: Pick<Character, 'virtues'>, powers: Power[]): KitchenWork[] {
  return [
    ...(powers.some((p) => p.methods.includes('potion')) && !has(c, 'primitive-tradition-flaw') ? (['brew'] as const) : []),
    ...(powers.some((p) => WITCH_FETISHES[p.id]) ? (['fetish'] as const) : []),
    ...(powers.some((p) => p.id === 'witch-cursing') ? (['curse'] as const) : []),
    'vis' as const,
    ...(powers.some((p) => p.id === 'witch-healing') ? (['longevity'] as const) : []),
    ...(powers.some((p) => p.id === 'animal-ken') ? (['familiar'] as const) : []),
  ];
}

/** The powers a work can be done with: a potion's, a fetish's, or any. */
export function kitchenPowers(w: KitchenWork, powers: Power[]): Power[] {
  return w === 'brew' ? powers.filter((p) => p.methods.includes('potion')) : w === 'fetish' ? powers.filter((p) => WITCH_FETISHES[p.id]) : powers;
}

/** The vis a work takes: a brew's Form, a fetish's pawn, a longevity ritual's; none for the rest. */
export function kitchenVisArts(w: KitchenWork, power: string | undefined): Art[] {
  const fetish = power ? fetishVisArt(power) : undefined;
  return w === 'brew' && power ? potionVisArts(power) : w === 'fetish' && fetish ? [fetish] : w === 'longevity' ? WITCH_LONGEVITY_ARTS : [];
}

/** The Ability whose score the work's Lab Total adds (the brew's power, Cursing, Healing, Animal Ken), and that gains the season's Exposure. */
export function kitchenAbility(w: KitchenWork, power: string | undefined): string | undefined {
  return { brew: power, fetish: undefined, curse: 'witch-cursing', vis: undefined, longevity: 'witch-healing', familiar: 'animal-ken' }[w];
}

export interface KitchenSeason {
  lt: WitchTotal;
  /** the vis a season may use: twice Folk Witch Magic Theory (four times for potions with Concentrated Potions) */
  seasonLimit: number;
  brew: ReturnType<typeof brew>;
  /** pawns the work takes, and pawns of Vim it draws from the aura */
  need: number;
  drawn: number;
  /** why it cannot be done with the vis to hand: no dose can be brewed, more vis than a season allows, or too little */
  blocked?: 'no-dose' | 'over-limit' | 'short' | 'no-vis';
}

/**
 * A season's work in the kitchen, as set, with `have` pawns of its vis to hand: its Lab Total, the brew,
 * the vis it takes and draws, and why it cannot be done. The season itself, and a curse's target, are
 * for the card to check.
 */
export function kitchenSeason(c: Character, d: DerivedCharacter, aura: AuraState | undefined, w: KitchenWork, power: string | undefined, o: { have: number; effectVis?: number; labText?: number; familiar?: number }): KitchenSeason {
  const fwmt = score(d, 'folk-witch-magic-theory');
  const lt = kitchenLabTotal(c, d, kitchenAbility(w, power), aura, { potion: w === 'brew', familiar: o.familiar });
  const seasonLimit = kitchenVisLimit(c, fwmt, w === 'brew');
  const b = brew(fwmt, o.effectVis ?? 0, Math.min(seasonLimit, o.have), { labText: o.labText });
  const need = w === 'brew' ? b.vis : w === 'fetish' ? 1 : w === 'longevity' ? witchLongevityVis(c.age) : 0;
  const drawn = w === 'vis' ? witchVisExtraction(lt.total) : 0;
  // a Lab Total of 0 or less draws no vis (a tenth, rounded up: Hedge Magic, line 1924): not a season's work
  const blocked = w === 'brew' && !b.doses ? 'no-dose' : w === 'longevity' && need > seasonLimit ? 'over-limit' : w === 'vis' && !drawn ? 'no-vis' : need > o.have ? 'short' : undefined;
  return { lt, seasonLimit, brew: b, need, drawn, blocked };
}

/**
 * The work a season in the kitchen opens on: the first in the book's order this witch can do with the
 * vis to hand (`have`, the fuller of the purse and the covenant's stores), with her best power for it.
 * A curse is never first: it waits on a target the player names. Drawing vis from the aura needs nothing.
 */
export function firstKitchenWork(c: Character, d: DerivedCharacter, aura: AuraState | undefined, have: (arts: Art[]) => number, effectVis: (power: string) => number = () => 0): { work: KitchenWork; power?: string } | undefined {
  const powers = witchPowers(c, d);
  if (!powers.length) return undefined;
  const options = kitchenWorks(c, powers).flatMap((work) => bestFirst(kitchenPowers(work, powers), (p) => p.score).slice(0, work === 'brew' || work === 'fetish' ? undefined : 1).map((p) => ({ work, power: p.id })));
  return firstDoable(options, (x) => x.work === 'curse' || kitchenSeason(c, d, aura, x.work, x.power, { have: have(kitchenVisArts(x.work, x.power)), effectVis: x.work === 'brew' ? effectVis(x.power) : 0 }).blocked);
}

