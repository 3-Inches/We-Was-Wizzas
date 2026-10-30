// Hooks that come due at a time (Covenants ch.2): a Natural Disaster strikes within the saga's first
// five years, and a Flawed Resource's 250 Build Points of improvements are lost in a story when its
// time comes. If the story succeeds, up to half is saved; if it is botched, the losses are doubled.

import { describeStress, stressDie, defaultRng, type Rng } from './dice';
import { SEASONS, seasonIndex } from './effects';
import { mechanicOf, type CovResource } from './covenantRules';
import type { Covenant, CovenantHookBoon, Season } from './types';

export interface Line {
  who: string;
  kind: 'covenant' | 'reminder';
  text: string;
}

/** The Hooks that come due at a time. */
export const DUE_MECHANICS = ['flawed-resource', 'natural-disaster'] as const;

export function hasDue(hb: CovenantHookBoon): boolean {
  const m = mechanicOf(hb);
  return !!m && (DUE_MECHANICS as readonly string[]).includes(m);
}

/** A season from its index (the inverse of seasonIndex). */
export function fromSeasonIndex(i: number): { year: number; season: Season } {
  return { year: Math.floor(i / 4), season: SEASONS[((i % 4) + 4) % 4] };
}

/** A time within five years from a season (the book's "within the first five years of the saga"), at random. */
export function randomDue(from: { year: number; season: Season }, rng: Rng = defaultRng): { year: number; season: Season } {
  return fromSeasonIndex(seasonIndex(from.year, from.season) + Math.floor(rng() * 20));
}

/** Has its time come (this season or before), and is it still to be dealt with? */
export function isDue(hb: CovenantHookBoon, year: number, season: Season): boolean {
  if (!hb.due || seasonIndex(hb.due.year, hb.due.season) > seasonIndex(year, season)) return false;
  const m = mechanicOf(hb);
  if (m === 'natural-disaster') return !hb.active;
  if (m === 'flawed-resource') return !hb.outcome || hb.outcome === 'pending';
  return false;
}

/**
 * What comes due as a season begins: a Natural Disaster strikes (its principal income is lost or
 * halved, as the Hook says), and a Flawed Resource's story is to be played (said once; the Game
 * table keeps it in view until its story is rolled).
 */
export function hooksComeDue(cov: Covenant, year: number, season: Season): Line[] {
  const lines: Line[] = [];
  for (const hb of cov.hooksBoons) {
    if (!isDue(hb, year, season)) continue;
    const m = mechanicOf(hb);
    if (m === 'natural-disaster') {
      hb.active = true;
      lines.push({
        who: cov.name,
        kind: 'reminder',
        text: `The Natural Disaster strikes ${cov.name || 'the covenant'}: its principal source of income is ${hb.size === 'Major' ? 'lost' : 'halved (Slump)'}. Crops, roads or buildings suffer across the region; record a Local Event on the Loyalty card, and new sources of food and income will take stories to find.`,
      });
    } else if (m === 'flawed-resource' && hb.due && seasonIndex(hb.due.year, hb.due.season) === seasonIndex(year, season)) {
      // said once, as its season begins; the Game table keeps it in view until its story is rolled
      lines.push({
        who: cov.name,
        kind: 'reminder',
        text: `${hb.name}: its time has come (${season} ${year}). Play the story of its loss, then roll it on the Hooks tab: success saves up to half, a botch doubles the loss.`,
      });
    }
  }
  return lines;
}

export interface StoryRoll {
  outcome: 'saved' | 'lost' | 'botched';
  total: number;
  text: string;
}

/** The roll for a Flawed Resource's story: the deciding character's total + a stress die against an Ease Factor. */
export function rollFlawedStory(total: number, ease: number, botchDice = 1, rng: Rng = defaultRng): StoryRoll {
  const r = stressDie(botchDice, rng);
  const sum = r.botches ? 0 : total + r.value;
  const outcome = r.botches ? 'botched' : sum >= ease ? 'saved' : 'lost';
  const what = { saved: 'success: up to half is saved', lost: 'failure: all of it is lost', botched: 'botch: the losses are doubled' }[outcome];
  return { outcome, total: sum, text: `${total} + ${describeStress(r)} = ${r.botches ? 'botch' : sum} against ${ease}: ${what}.` };
}

/** What to keep when up to half is saved: the most valuable resources that fit in half the Build Points. */
export function keepHalf(resources: CovResource[]): string[] {
  const cap = Math.floor(resources.reduce((t, r) => t + r.cost, 0) / 2);
  const kept: string[] = [];
  let used = 0;
  for (const r of [...resources].sort((a, b) => b.cost - a.cost))
    if (used + r.cost <= cap) {
      kept.push(r.uid);
      used += r.cost;
    }
  return kept;
}

/** Apply a story's roll to a Flawed Resource: its outcome, and on a success the half kept. */
export function settleFlawedStory(hb: CovenantHookBoon, roll: StoryRoll, poolResources: CovResource[], when: { year: number; season: Season }): void {
  hb.outcome = roll.outcome;
  hb.rolled = `${when.season} ${when.year}: ${roll.text}`;
  hb.kept = roll.outcome === 'saved' ? keepHalf(poolResources) : [];
}
