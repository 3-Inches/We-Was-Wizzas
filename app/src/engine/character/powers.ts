// Supernatural powers bought with the levels of Greater, Lesser, Personal and Ritual Power
// (DE, Supernatural Virtues) and Heroes' Birthright (HoH:TL, Blood of Heroes).

import type { PowerKind } from '../../data';
import type { CharPower } from '../types';

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

/** Levels a power uses from its Virtue's pool: its level plus any Penetration bought. */
export function powerCost(p: CharPower): number {
  return p.level + (POWER_KINDS[p.kind].penetration ? p.penetration : 0);
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
  const magnitude = powerMagnitude(p.level);
  const half = Math.max(1, Math.floor(magnitude / 2));
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
export function powerSpending(powers: CharPower[] = []): Partial<Record<PowerKind, number>> {
  const out: Partial<Record<PowerKind, number>> = {};
  for (const p of powers) out[p.kind] = (out[p.kind] ?? 0) + powerCost(p);
  return out;
}
