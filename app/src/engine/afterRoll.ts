// After the dice are down (DE p.52, p.419, All According to Plan): what a player may still do to a
// roll once its result is known. Confidence Points add +3 each, up to the Confidence Score on one roll;
// Faith Points the same while acting in God's will, up to the True Faith Score (one at a time with no
// Score). Neither on a botch (a zero that is no botch is fine), nor on a roll for a season's work. All
// According to Plan rerolls one botch die, once a session.

import type { DerivedCharacter } from './character/derive';
import { d10, type Rng, defaultRng } from './dice';
import type { Character } from './types';

export interface AfterRollMax {
  /** Confidence Points that may go on this roll: the points held, at most the Confidence Score */
  confidence: number;
  /** Faith Points that may go on this roll: the points held, at most the True Faith Score (1 with none) */
  faith: number;
  /** All According to Plan is there to use this session */
  aatp: boolean;
}

/** What a character may still put on a roll, before any is spent on it. Grogs have no Confidence (DE p.52). */
export function afterRollMax(c: Character, d: DerivedCharacter): AfterRollMax {
  const confidence = c.type === 'grog' ? 0 : Math.max(0, Math.min(c.confidence.points, c.confidence.score));
  const faith = Math.max(0, Math.min(d.faithPoints, Math.max(1, d.trueFaith)));
  const aatp = d.virtues.some((v) => v.cv.defId === 'all-according-to-plan') && !c.session?.aatpUsed;
  return { confidence, faith, aatp };
}

export interface Rerolled {
  /** the botch dice after the reroll */
  faces: number[];
  /** the die rerolled, and what it shows now */
  was: number;
  now: number;
  /** the botches left */
  botches: number;
}

/** All According to Plan: one botch die that showed a zero rolled again. */
export function rerollBotchDie(faces: number[], rng: Rng = defaultRng): Rerolled {
  const out = [...faces];
  const i = out.indexOf(0);
  const now = d10(rng);
  if (i >= 0) out[i] = now;
  return { faces: out, was: 0, now, botches: out.filter((f) => f === 0).length };
}
