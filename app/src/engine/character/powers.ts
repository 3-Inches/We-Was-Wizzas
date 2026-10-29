// Supernatural powers bought with the levels of Greater, Lesser, Personal and Ritual Power
// (DE, Supernatural Virtues) and Heroes' Birthright (HoH:TL, Blood of Heroes).

import type { PowerKind } from '../../data';
import type { CharPower, VarianceBy } from '../types';

export interface PowerKindInfo {
  label: string;
  virtue: string;
  /** levels one take of the Virtue gives */
  perTake: number;
  /** the most any single power may have, if limited */
  maxLevel?: number;
  /** levels may also buy Penetration, one for one */
  penetration: boolean;
  ref: string;
  rule: string;
}

export const POWER_KINDS: Record<PowerKind, PowerKindInfo> = {
  greater: { label: 'Greater Power', virtue: 'greater-power', perTake: 50, penetration: true, ref: 'DE, Greater Power', rule: 'Init Qik − magnitude/2; 1 Fatigue up to level 50, 2 up to 100.' },
  lesser: { label: 'Lesser Power', virtue: 'lesser-power', perTake: 25, penetration: true, ref: 'DE, Lesser Power', rule: 'Init Qik − 2 × magnitude; 1 Fatigue per 25 levels (or part).' },
  personal: { label: 'Personal Power', virtue: 'personal-power', perTake: 25, penetration: true, ref: 'DE, Personal Power', rule: 'Range: Personal or constant. Init Qik − magnitude/2; 1 Fatigue up to level 50, 2 up to 100.' },
  ritual: { label: 'Ritual Power', virtue: 'ritual-power', perTake: 25, penetration: true, ref: 'DE, Ritual Power', rule: 'Init Qik − 2 × magnitude; 1 Fatigue per 25 levels (or part), and 1 Confidence Point per magnitude.' },
  birthright: { label: "Heroes' Birthright", virtue: 'heroes-birthright', perTake: 15, maxLevel: 30, penetration: false, ref: 'HoH:TL, Heroes\' Birthright', rule: 'Invoked and cancelled at will, like Mythic Blood for words and gestures. No power above level 30.' },
  focus: {
    label: 'Focus Power', virtue: 'focus-power', perTake: 25, penetration: true, ref: 'RoP: Magic, Focus Power',
    rule: 'Spontaneous-style effects in a narrow field, up to the levels bought. A magic character spends Might equal to the magnitude; Init Qik − magnitude.',
  },
  holy: {
    label: 'Holy powers (Strong Angelic Heritage)', virtue: 'strong-angelic-heritage', perTake: 30, penetration: false, ref: 'DE, Strong Angelic Heritage',
    rule: 'Invoked by spending Might points: magnitude / 2 (at least 1). Init = Quickness. Penetration = Divine Might − 5 × Might cost.',
  },
};

export const POWER_KIND_ORDER: PowerKind[] = ['greater', 'lesser', 'personal', 'ritual', 'focus', 'birthright', 'holy'];

export function powerMagnitude(level: number): number {
  return Math.max(1, Math.ceil(level / 5));
}

/**
 * Levels a power uses from its Virtue's pool: its level plus any Penetration bought. A magic
 * character's powers buy no Penetration with levels: theirs comes from Might (RoP: Magic).
 */
export function powerCost(p: CharPower, mightBased = false): number {
  return p.level + (POWER_KINDS[p.kind].penetration && !mightBased ? p.penetration : 0);
}

export interface PowerStats {
  magnitude: number;
  init: number;
  fatigue: number;
  confidence: number;
  /** Might points to invoke it (holy powers) */
  mightCost?: number;
}

/**
 * A power's magnitude, Initiative and cost. A character with Might (a magic character, RoP: Magic)
 * pays Might points instead of Fatigue: magnitude for Focus, Lesser and Ritual powers, half that
 * for Greater and Personal ones.
 */
export function powerStats(p: CharPower, qik: number, mightBased = false): PowerStats {
  const base = basePowerStats(p, qik, mightBased);
  if (!mightBased || !p.mastery || base.mightCost === undefined) return base;
  // mastery points (RoP: Magic, Improved Powers): Personal, Lesser and Greater Powers can cost 0;
  // a Ritual Power costs at least half its magnitude (rounded up); a Focus Power's cost never changes
  const min = p.kind === 'ritual' ? Math.ceil(base.magnitude / 2) : 0;
  const mightCost = p.kind === 'focus' ? base.mightCost : Math.max(Math.min(min, base.mightCost), base.mightCost - (p.mastery.cost ?? 0));
  return { ...base, mightCost, init: base.init + (p.mastery.init ?? 0) };
}

function basePowerStats(p: CharPower, qik: number, mightBased: boolean): PowerStats {
  const magnitude = powerMagnitude(p.level);
  const half = Math.max(mightBased ? 0 : 1, Math.floor(magnitude / 2));
  const might = (n: number) => (mightBased ? { fatigue: 0, mightCost: n } : {});
  switch (p.kind) {
    case 'greater':
    case 'personal':
      return { magnitude, init: qik - Math.floor(magnitude / 2), fatigue: p.level <= 50 ? 1 : 2, confidence: 0, ...might(half) };
    case 'lesser':
      return { magnitude, init: qik - 2 * magnitude, fatigue: Math.max(1, Math.ceil(p.level / 25)), confidence: 0, ...might(magnitude) };
    case 'ritual':
      return { magnitude, init: qik - 2 * magnitude, fatigue: Math.max(1, Math.ceil(p.level / 25)), confidence: magnitude, ...might(magnitude) };
    case 'focus':
      return { magnitude, init: qik - magnitude, fatigue: Math.max(1, Math.ceil(magnitude / 5)), confidence: 0, ...might(magnitude) };
    case 'birthright':
      return { magnitude, init: qik, fatigue: 0, confidence: 0 };
    case 'holy':
      return { magnitude, init: qik, fatigue: 0, confidence: 0, mightCost: half };
  }
}

/** Levels spent per kind. */
export function powerSpending(powers: CharPower[] = [], mightBased = false): Partial<Record<PowerKind, number>> {
  const out: Partial<Record<PowerKind, number>> = {};
  for (const p of powers) out[p.kind] = (out[p.kind] ?? 0) + powerCost(p, mightBased);
  return out;
}

/** Mastery points a power uses: each Might point of cost taken off, each point of Initiative, each 5 levels of a Focus Power beyond Might. */
export function masteryOn(p: CharPower): number {
  const m = p.mastery ?? {};
  return (m.cost ?? 0) + (m.init ?? 0) + (m.level ?? 0);
}

export interface MasteryPools {
  /** from Improved Powers (5 each), less Reduced Power (5 each): for any power */
  general: number;
  /** unused levels of each power Quality, 5 to a point: for powers of that kind (Greater also for Lesser) */
  leftover: Partial<Record<PowerKind, number>>;
  /** leftover points no power of their kind has used */
  unused: Partial<Record<PowerKind, number>>;
  /** points drawn from the general pool (powers beyond their own leftovers, and experience) */
  fromGeneral: number;
  /** points used on powers and turned into experience */
  spent: number;
  available: number;
  /** points used beyond what the pools allow */
  over: number;
}

/**
 * A magic character's mastery points (RoP: Magic). Improved Powers gives 5 for any power; the
 * spell levels left over from a power Quality become 1 point per 5 levels for powers of the same
 * kind (Greater Power's also for Lesser Powers); Reduced Power takes 5 away, to be spent as a higher
 * cost or lower Initiative. Points may also become 5 experience points each in Concentration,
 * Finesse or Penetration.
 */
export function masteryPools(powers: CharPower[] = [], budgets: Partial<Record<PowerKind, number>>, general: number, xpPoints = 0): MasteryPools {
  const used = powerSpending(powers, true);
  const leftover: Partial<Record<PowerKind, number>> = {};
  for (const k of ['greater', 'lesser', 'personal', 'ritual', 'focus'] as PowerKind[]) {
    const n = Math.floor(Math.max(0, (budgets[k] ?? 0) - (used[k] ?? 0)) / 5);
    if (n) leftover[k] = n;
  }
  const on = (k: PowerKind) => powers.filter((p) => p.kind === k).reduce((s, p) => s + masteryOn(p), 0);
  let fromGeneral = xpPoints;
  const pool = { ...leftover };
  const draw = (need: number, from: PowerKind[]) => {
    let rest = need;
    for (const f of from) {
      const take = Math.max(0, Math.min(rest, pool[f] ?? 0));
      pool[f] = (pool[f] ?? 0) - take;
      rest -= take;
    }
    fromGeneral += rest;
  };
  draw(on('greater'), ['greater']);
  draw(on('lesser'), ['lesser', 'greater']);
  draw(on('personal'), ['personal']);
  draw(on('ritual'), ['ritual']);
  draw(on('focus'), ['focus']);
  const spent = powers.reduce((s, p) => s + masteryOn(p), 0) + xpPoints;
  const available = general + Object.values(leftover).reduce((s, n) => s + (n ?? 0), 0);
  const unused = Object.fromEntries(Object.entries(pool).filter(([, n]) => (n ?? 0) > 0)) as Partial<Record<PowerKind, number>>;
  return { general, leftover, unused, fromGeneral, spent, available, over: Math.max(0, fromGeneral - general) };
}

// ---------------------------------------------------------------- Variable and Deteriorating Power

/** The powers a Variable Power may apply to (Greater, Lesser, Personal or Ritual), and a Deteriorating Power (Greater, Lesser or Ritual). */
export const VARIABLE_KINDS: PowerKind[] = ['greater', 'lesser', 'personal', 'ritual'];
export const DETERIORATING_KINDS: PowerKind[] = ['greater', 'lesser', 'ritual'];

export interface VarianceInputs {
  age: number;
  /** Might Score */
  might: number;
  /** Might points spent from the pool (Might Score − Might Pool) */
  mightSpent: number;
  warping: number;
  /** an Ability's score, by id */
  ability: (id: string) => number;
}

/** What a variance grows or wears with, in words. */
export function varianceLabel(by: VarianceBy, deteriorating: boolean, abilityName?: string): string {
  if (by === 'age') return 'age / 10';
  if (by === 'might') return deteriorating ? '(Might Score − Might Pool) / 5' : 'Might Score / 5';
  if (by === 'warping') return 'Warping Score';
  return abilityName ?? by.slice('ability:'.length);
}

/** The levels of variance (RoP: Magic): age / 10, Might Score / 5 (Might spent / 5 for a Deteriorating Power), the Warping Score, or the Ability's score; halves round to the nearest, as the book's age-25 example gives 3. */
export function varianceLevels(by: VarianceBy, deteriorating: boolean, x: VarianceInputs): number {
  const n = by === 'age' ? x.age / 10 : by === 'might' ? (deteriorating ? x.mightSpent : x.might) / 5 : by === 'warping' ? x.warping : x.ability(by.slice('ability:'.length));
  return Math.max(0, Math.round(n));
}

/**
 * A power's effect level after Variable and Deteriorating Power: five levels more for each level of
 * variance (or that many more similar effects of the same level), five fewer for each magnitude it
 * has deteriorated. Its Might cost and Initiative stay those of the power as designed.
 */
export function variedLevel(p: CharPower, x: VarianceInputs): { level: number; up: number; down: number } {
  const up = p.variable ? varianceLevels(p.variable.by, false, x) : 0;
  const down = p.deteriorating ? varianceLevels(p.deteriorating.by, true, x) : 0;
  return { level: Math.max(0, p.level + 5 * up - 5 * down), up, down };
}
