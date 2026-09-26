// Keeping scores steady when an Affinity (or Linguist) is added or removed after experience
// has been spent. The multiplier applies to creation and Virtue-pool xp, so without this an
// Affinity taken "later" silently raises every score bought before it, while the budgets still
// show the same raw xp as spent.
//
// During creation the raw xp is taken back from the pools (latest pool first) so the score and
// its remainder stay the same, and the freed xp can be spent again. After creation an Affinity
// only affects xp gained from then on, so the change is balanced with an 'adjust' entry instead.

import { ART_NAMES, ARTS, type GameData } from '../../data';
import type { Character, HouseRules, XpAlloc, XpSource } from '../types';
import { withAffinity } from '../xp';
import { CREATION_SOURCES, deriveCharacter, effectiveXp, type DerivedCharacter } from './derive';
import { describeChanges, trimPool } from './xpops';

/** Pools to take xp back from first. Virtue pools are restricted, so they are kept spent. */
const RELEASE_ORDER: XpSource[] = ['postGauntlet', 'apprenticeship', 'laterLife', 'childhood'];

const multiplied = (src: XpSource) => CREATION_SOURCES.includes(src) || src.startsWith('pool:');

function orderedSources(alloc: XpAlloc): XpSource[] {
  const present = (Object.keys(alloc) as XpSource[]).filter((s) => multiplied(s) && (alloc[s] ?? 0) > 0);
  const pools = present.filter((s) => s.startsWith('pool:'));
  return [...RELEASE_ORDER.filter((s) => present.includes(s)), ...pools, ...present.filter((s) => s === 'native')];
}

/** Smallest raw xp whose multiplied value reaches `need`. */
function minRaw(need: number, mult: number): number {
  if (need <= 0) return 0;
  let r = Math.max(0, Math.floor(need / mult) - 1);
  while (withAffinity(r, mult) < need) r++;
  return r;
}

/**
 * Change the raw allocation so that, at multiplier `mNew`, its effective xp is at least what it
 * was at `mOld` (and as close to it as rounding allows). Returns the change per source.
 */
export function rebalanceAlloc(alloc: XpAlloc, mOld: number, mNew: number): Partial<Record<XpSource, number>> {
  const target = effectiveXp(alloc, mOld);
  const fixed = (Object.entries(alloc) as [XpSource, number][]).filter(([s]) => !multiplied(s)).reduce((t, [, v]) => t + (v || 0), 0);
  const need = target - fixed;
  const eff = (s: XpSource) => withAffinity(alloc[s] ?? 0, mNew);
  const order = orderedSources(alloc);
  const delta: Partial<Record<XpSource, number>> = {};
  const set = (s: XpSource, v: number) => {
    const d = v - (alloc[s] ?? 0);
    if (!d) return;
    delta[s] = (delta[s] ?? 0) + d;
    if (v > 0) alloc[s] = v;
    else delete alloc[s];
  };
  if (mNew > mOld) {
    for (const s of order) {
      const others = order.filter((t) => t !== s).reduce((t, x) => t + eff(x), 0);
      set(s, Math.min(alloc[s] ?? 0, minRaw(need - others, mNew)));
    }
  } else if (mNew < mOld && order.length) {
    const s = order[0];
    const others = order.slice(1).reduce((t, x) => t + eff(x), 0);
    set(s, Math.max(alloc[s] ?? 0, minRaw(need - others, mNew)));
  }
  return delta;
}

export interface RebalanceNote {
  target: string;
  delta: Partial<Record<XpSource, number>>;
}

/**
 * Compare multipliers before and after a change to the character and rebalance every Art and
 * Ability whose multiplier changed. Mutates `c`; returns what moved.
 */
export function rebalanceAffinityXp(c: Character, before: DerivedCharacter, data: GameData, rules: HouseRules): RebalanceNote[] {
  const after = deriveCharacter(c, data, rules);
  const notes: RebalanceNote[] = [];
  const inPlay = c.creation.finalized;
  const apply = (label: string, alloc: XpAlloc, mOld: number, mNew: number) => {
    if (mOld === mNew) return;
    if (inPlay) {
      const diff = effectiveXp(alloc, mOld) - effectiveXp(alloc, mNew);
      if (!diff) return;
      alloc.adjust = (alloc.adjust ?? 0) + diff;
      if (!alloc.adjust) delete alloc.adjust;
      notes.push({ target: label, delta: { adjust: diff } });
      return;
    }
    const delta = rebalanceAlloc(alloc, mOld, mNew);
    if (Object.keys(delta).length) notes.push({ target: label, delta });
  };
  for (const a of ARTS) {
    const was = before.arts[a]?.multiplier ?? 1;
    const now = after.arts[a].multiplier;
    if (was !== now) apply(ART_NAMES[a], c.arts[a] ?? (c.arts[a] = {}), was, now);
  }
  for (const ab of c.abilities) {
    const was = before.abilityByUid.get(ab.uid)?.multiplier;
    const now = after.abilityByUid.get(ab.uid)?.multiplier;
    if (was === undefined || now === undefined || was === now) continue;
    apply(after.abilityByUid.get(ab.uid)!.name, ab.xp, was, now);
  }
  return notes;
}

const SOURCE_LABEL: Record<string, string> = {
  native: 'Native Language', childhood: 'Early Childhood', laterLife: 'Later Life', apprenticeship: 'Apprenticeship', postGauntlet: 'Post-Gauntlet', adjust: 'adjustment',
};

export function describeRebalance(notes: RebalanceNote[], d?: DerivedCharacter): string {
  const label = (s: string) => SOURCE_LABEL[s] ?? d?.budgets.find((b) => b.id === s)?.label ?? s;
  return notes
    .map((n) => {
      const parts = (Object.entries(n.delta) as [string, number][]).map(([s, v]) =>
        s === 'adjust' ? `${v > 0 ? '+' : ''}${v} xp adjustment` : v < 0 ? `${-v} xp freed in ${label(s)}` : `${v} more xp from ${label(s)}`,
      );
      return `${n.target}: score kept the same; ${parts.join(', ')}.`;
    })
    .join(' ');
}

/** Did the character's Virtues and Flaws change (added, removed, resized, re-chosen)? */
function virtuesChanged(a: Character, b: Character): boolean {
  const sig = (c: Character) => c.virtues.map((v) => `${v.uid}:${v.defId}:${v.size}:${v.param ?? ''}:${v.free ? 1 : 0}`).join('|');
  return sig(a) !== sig(b);
}

/**
 * After a change to the character, keep what was already bought consistent:
 * - an Affinity or Linguist added or removed keeps the scores (see rebalanceAffinityXp);
 * - a Virtue or Flaw that shrinks a budget (Wealthy removed, Poor, Weak Parens, Savantism...)
 *   takes the excess back from that pool, most recently added Abilities first.
 * `before` must be derived from a copy made before the change. Returns a sentence per
 * adjustment, for the notice. Mutates `c`.
 */
export function adjustAfterChange(c: Character, before: DerivedCharacter, data: GameData, rules: HouseRules): string[] {
  const notes = describeRebalance(rebalanceAffinityXp(c, before, data, rules), before);
  const out = notes ? [notes] : [];
  if (c.creation.finalized || !virtuesChanged(before.char, c)) return out;
  const after = deriveCharacter(c, data, rules);
  for (const b of after.budgets) {
    const was = before.budgets.find((x) => x.id === b.id);
    if (b.spent <= b.total || !was || was.spent > was.total || b.total >= was.total) continue;
    const taken = trimPool(c, b.id, b.spent - b.total, data);
    if (taken.length) out.push(`${b.label} dropped to ${b.total} xp, so ${describeChanges(taken)} was taken back.`);
  }
  return out;
}
