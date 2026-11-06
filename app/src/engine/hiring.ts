// Hiring covenfolk as the saga goes on. A covenant finds craftsmen to save it money, to replace those
// who leave, or to take the place of one held back by a Flaw; the people found are met at random,
// lucky or not (craftTraits.ts), so the troupe chooses among a few. Hired in play they cost no Build
// Points (DE p.71, Covenants ch.5): what they cost is the year's upkeep of an inhabitant. The
// Tribunal's covenants do the same at the turn of each year: craftsmen grow old and retire, and are
// replaced when the covenant can feed another mouth and the work would save it money.

import { abilityCapAtAge, CRAFT_BY_ID, countOf, craftOf, craftsFor, craftsmanSaving, type CraftDef } from './covenantRules';
import { expenditureWith } from './covenant';
import { laborPoints } from './workshop';
import { CRAFT_TRAITS, TRAIT_NAMES, craftTraitsLine, rollCraftTraits, workingCraft } from './craftTraits';
import { freshName, homelandGroupFor, regionOf } from './generate/names';
import { between, chance } from './generate/random';
import type { Rng } from './dice';
import type { Character, Covenant, Season, Specialist } from './types';
import type { DerivedLab } from './lab';
import { uid } from '../util/id';

/** What a candidate would do for the covenant: the score they work at, what they would save, their Labor Points a season. */
export function candidateWorth(s: Specialist): { works: number; saves: number; labor: number } {
  const craft = craftOf(s);
  const works = workingCraft(s);
  return { works, saves: craft?.categories.length ? craftsmanSaving(works, s.rare ?? craft.rare) : 0, labor: laborPoints(s.chars?.Dex ?? 0, works, s.wealth ?? 'average') };
}

/**
 * A few craftsmen of a craft who would come to the covenant, met at random: a young one still
 * learning, others in their prime, now and then an old hand; each with the Virtues and Flaws that
 * matter at the work, if any. Not yet hired.
 */
export function findCraftsmen(cov: Covenant, craftId: string, rng: Rng, opts: { n?: number; tribunal?: string; taken?: Iterable<string> } = {}): Specialist[] {
  const craft = CRAFT_BY_ID.get(craftId);
  if (!craft) return [];
  const region = regionOf(homelandGroupFor(opts.tribunal));
  const used = new Set([...(opts.taken ?? []), ...cov.specialists.map((s) => s.name)]);
  const out: Specialist[] = [];
  for (let i = 0; i < (opts.n ?? 3); i++) {
    const age = i === 0 ? between(rng, 18, 26) : chance(rng, 0.2) ? between(rng, 46, 58) : between(rng, 27, 45);
    const cap = abilityCapAtAge(age);
    const score = Math.max(2, Math.min(cap, between(rng, cap - 3, cap)));
    const name = freshName(rng, region, chance(rng, 0.4), used);
    used.add(name);
    out.push(newCraftsman(craft, name, age, score, between(rng, -1, 2), rollCraftTraits(rng, craft.name)));
  }
  return out;
}

function newCraftsman(craft: CraftDef, name: string, age: number, score: number, dex: number, traits: string[]): Specialist {
  return {
    uid: uid(), name, role: 'craftsman', ability: `Craft (${craft.name})`, craft: craft.id, score, count: 1, rare: craft.rare, free: true, age,
    abilities: [{ id: 'craft-type', param: craft.name, score }], chars: { Dex: dex }, traits: traits.length ? traits : undefined,
  };
}

/** Takes a candidate into the covenant, recruited in play: no Build Points; their upkeep is the covenant's from now on. */
export function hireCraftsman(cov: Covenant, s: Specialist, year: number, season: Season): string {
  const who: Specialist = { ...structuredClone(s), free: true, history: [...(s.history ?? []), { year, season, text: 'Came to the covenant, hired in play.' }] };
  cov.specialists.push(who);
  const craft = craftOf(who);
  return `${who.name} comes to ${cov.name || 'the covenant'} as its ${craft?.name.toLowerCase() ?? 'craftsman'} (Craft ${who.score}${workingCraft(who) !== who.score ? `, works at ${workingCraft(who)}` : ''}).`;
}

/**
 * One craftsman leaves the covenant (let go, retired or dead): one of a group, or the entry. Build
 * Points spent on them are not refunded (DE p.71: what a covenant starts with is bought, not sold).
 */
export function letGo(cov: Covenant, specialistUid: string, why = 'leaves the covenant'): string | undefined {
  const s = cov.specialists.find((x) => x.uid === specialistUid);
  if (!s) return undefined;
  const group = countOf(s) > 1;
  if (group) s.count = countOf(s) - 1;
  else cov.specialists = cov.specialists.filter((x) => x.uid !== specialistUid);
  return `${group ? `One of the ${(craftOf(s)?.name ?? s.name).toLowerCase()}s` : s.name || 'A craftsman'} ${why}.`;
}

/** A Flaw got over in play (healed by magic, or a story): it no longer counts at the work. */
export function overcomeTrait(s: Specialist, traitId: string, year: number, season: Season, how: string): void {
  s.traits = (s.traits ?? []).filter((t) => t !== traitId);
  if (!s.traits.length) s.traits = undefined;
  s.history = [...(s.history ?? []), { year, season, text: `${how}.` }];
}

/** The crafts where one more ordinary craftsman (Craft 5) would save the covenant money, the most first, with the pounds a year. */
export function hireOptions(cov: Covenant, members: Character[], labs: DerivedLab[]): { craft: CraftDef; saving: number }[] {
  const now = expenditureWith(cov, members, labs, () => undefined);
  return craftsFor(cov)
    .filter((c) => c.categories.length)
    .map((craft) => ({ craft, saving: Math.round((now - expenditureWith(cov, members, labs, (y) => void y.specialists.push(newCraftsman(craft, '', 35, 5, 0, [])))) * 10) / 10 }))
    .filter((x) => x.saving > 0.5)
    .sort((a, b) => b.saving - a.saving);
}

/** What one candidate would save the covenant a year, as things stand (the craft's limit and the mouths to feed counted). */
export function savingOf(cov: Covenant, members: Character[], labs: DerivedLab[], s: Specialist): number {
  return Math.round((expenditureWith(cov, members, labs, () => undefined) - expenditureWith(cov, members, labs, (y) => void y.specialists.push(structuredClone(s)))) * 10) / 10;
}

/** How likely a craftsman of this age is to stop working in a year: none before 60, then more each year. */
export const retireChance = (age: number) => (age < 60 ? 0 : Math.min(0.6, 0.1 + (age - 60) * 0.05));

/**
 * The turn of the year at one of the Tribunal's covenants: its old craftsmen may retire, and, when it
 * has money in hand, it looks for a craftsman where one would save it most (two a year at most),
 * meets a few who would come, and takes the best of them, lucky or not. Returns the year's lines.
 */
export function livingHiringYearEnd(cov: Covenant, members: Character[], labs: DerivedLab[], rng: Rng, canHire: boolean, year: number, tribunal?: string, taken: Iterable<string> = []): string[] {
  const lines: string[] = [];
  for (const s of [...cov.specialists]) {
    if (s.role !== 'craftsman' || s.hired || s.nature || s.age === undefined) continue;
    if (rng() >= retireChance(s.age)) continue;
    const msg = letGo(cov, s.uid, `stops working at ${s.age}, and leaves the covenant's workshops`);
    if (msg) lines.push(msg);
  }
  if (!canHire) return lines;
  for (let k = 0; k < 2; k++) {
    const now = expenditureWith(cov, members, labs, () => undefined);
    const best = hireOptions(cov, members, labs)[0];
    if (!best) break;
    // those who come: the one who would save most, by the score they work at
    const found = findCraftsmen(cov, best.craft.id, rng, { tribunal, taken })
      .map((s) => ({ s, saving: now - expenditureWith(cov, members, labs, (y) => void y.specialists.push(structuredClone(s))) }))
      .sort((a, b) => b.saving - a.saving);
    const take = found[0];
    if (!take || take.saving <= 0.5) break;
    cov.specialists.push({ ...take.s, history: [{ year, season: 'Winter', text: 'Came to the covenant, hired in play.' }] });
    const traits = take.s.traits?.length ? craftTraitsLine(take.s.traits.map((id) => ({ ...CRAFT_TRAITS.find((t) => t.id === id)!, name: TRAIT_NAMES[id] ?? id })), take.s.score) : '';
    lines.push(`Takes on ${take.s.name}, a ${best.craft.name.toLowerCase()} at Craft ${take.s.score}${traits ? `, ${traits}` : ''}: saves about ${Math.round(take.saving)} £ a year.`);
  }
  return lines;
}
