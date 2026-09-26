// Small, careful edits to experience allocations, shared by the one-click fixes and by the
// automatic adjustments made when a Virtue changes a budget.

import { ARTS, ART_NAMES, type Art, type GameData } from '../../data';
import type { Character, HouseRules, XpAlloc, XpSource } from '../types';
import { abilityScoreFromXp, abilityXpForScore, withAffinity } from '../xp';
import { CREATION_SOURCES, abilityDisplayName, deriveCharacter, effectiveXp } from './derive';
import { ensureAbility } from './factory';

export interface XpChange {
  label: string;
  xp: number;
}

/** Abilities a magus must keep at 1; they are trimmed last. */
const PROTECTED = new Set(['parma-magica', 'magic-theory', 'dead-language']);

/**
 * Take `amount` raw xp back from one pool: from the most recently added Abilities first, then
 * Arts (Vim back to Creo), then Spell Mastery. Returns what was taken from what.
 */
export function trimPool(c: Character, pool: XpSource, amount: number, data: GameData): XpChange[] {
  const out: XpChange[] = [];
  let left = Math.max(0, Math.round(amount));
  const take = (alloc: XpAlloc, label: string) => {
    if (left <= 0) return;
    const have = alloc[pool] ?? 0;
    if (!have) return;
    const t = Math.min(have, left);
    if (have - t > 0) alloc[pool] = have - t;
    else delete alloc[pool];
    left -= t;
    out.push({ label, xp: t });
  };
  const abilities = [...c.abilities].reverse();
  for (const ab of abilities) if (!PROTECTED.has(ab.abilityId)) take(ab.xp, abilityDisplayName(ab, data));
  for (const a of [...ARTS].reverse()) if (c.arts[a]) take(c.arts[a], ART_NAMES[a]);
  for (const s of [...c.spells].reverse()) take(s.masteryXp, `${s.spell.name} mastery`);
  for (const ab of abilities) if (PROTECTED.has(ab.abilityId)) take(ab.xp, abilityDisplayName(ab, data));
  return out;
}

/** Raw xp needed in `pool` for an Ability to reach `score`, given its other xp. */
export function rawForAbilityScore(c: Character, data: GameData, rules: HouseRules, abUid: string, pool: XpSource, score: number): number {
  const d = deriveCharacter(c, data, rules);
  const da = d.abilityByUid.get(abUid);
  const ab = c.abilities.find((a) => a.uid === abUid);
  if (!da || !ab) return 0;
  const multiplied = CREATION_SOURCES.includes(pool) || pool.startsWith('pool:');
  const mult = multiplied ? da.multiplier : 1;
  const eff = (x: number) => (mult !== 1 ? withAffinity(x, mult) : x);
  const base = da.effectiveXp - eff(ab.xp[pool] ?? 0);
  const target = abilityXpForScore(score);
  let raw = 0;
  while (base + eff(raw) < target) raw++;
  return raw;
}

/**
 * Give an Ability enough xp from `pool` to reach `score` (creating it if needed). Returns the
 * extra raw xp spent, or 0 if it already had the score.
 */
export function raiseAbilityTo(c: Character, data: GameData, rules: HouseRules, abilityId: string, param: string | undefined, score: number, pool: XpSource): number {
  const ab = ensureAbility(c, abilityId, {}, param);
  const raw = rawForAbilityScore(c, data, rules, ab.uid, pool, score);
  const cur = ab.xp[pool] ?? 0;
  if (raw <= cur) return 0;
  ab.xp[pool] = raw;
  return raw - cur;
}

/** Lower an Ability to `score` by taking xp back from its creation pools, latest first. */
export function lowerAbilityTo(c: Character, data: GameData, rules: HouseRules, abUid: string, score: number): XpChange[] {
  const ab = c.abilities.find((a) => a.uid === abUid);
  const d = deriveCharacter(c, data, rules);
  const da = d.abilityByUid.get(abUid);
  if (!ab || !da) return [];
  const order: XpSource[] = ['postGauntlet', 'apprenticeship', 'laterLife', 'childhood', ...(Object.keys(ab.xp).filter((s) => s.startsWith('pool:')) as XpSource[]), 'native'];
  const scoreOf = () => abilityScoreFromXp(effectiveXp(ab.xp, da.multiplier));
  const out: XpChange[] = [];
  for (const s of order) {
    let taken = 0;
    while (scoreOf() > score && (ab.xp[s] ?? 0) > 0) {
      ab.xp[s] = (ab.xp[s] ?? 0) - 1;
      taken++;
    }
    if (!ab.xp[s]) delete ab.xp[s];
    if (taken) out.push({ label: `${da.name} (${s})`, xp: taken });
    if (scoreOf() <= score) break;
  }
  return out;
}

/** Move one allocation (an Ability's or an Art's xp in a pool) to another pool. */
export function moveXp(c: Character, target: { ability?: string; art?: Art }, from: XpSource, to: XpSource, amount?: number) {
  const alloc = target.ability ? c.abilities.find((a) => a.uid === target.ability)?.xp : target.art ? (c.arts[target.art] ??= {}) : undefined;
  if (!alloc) return;
  const n = Math.min(alloc[from] ?? 0, amount ?? Infinity);
  if (!n) return;
  alloc[from] = (alloc[from] ?? 0) - n;
  if (!alloc[from]) delete alloc[from];
  alloc[to] = (alloc[to] ?? 0) + n;
}

export function describeChanges(changes: XpChange[]): string {
  return changes.map((x) => `${x.xp} xp from ${x.label}`).join(', ');
}
