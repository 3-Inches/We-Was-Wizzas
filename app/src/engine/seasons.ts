// How a character's year is spent (DE, Assigning Seasons): a working character works two seasons for
// a living (Exposure) and has two free; a Hermetic magus has four free. Wealthy gives three free and
// Poor one; a License of Absence adds one (never more than four); Regular gives one free season to
// Worship. Some characters owe two seasons a year in service (Redcaps, magistrates, hedge wizards who
// support themselves); a magic being needs no living. One who needs no sleep has two seasons more a year, for study or adventure
// but not lab work (RoP: Magic, No Fatigue; HoH: Mystery Cults, Transforming the Mind).

import type { DerivedCharacter, ResolvedEffect } from './character/derive';
import type { Character, Season, SeasonLogEntry } from './types';

export interface SeasonPlan {
  /** seasons a year of the character's own: study, lab work, adventure */
  free: number;
  /** seasons a year working for a living or in service (Exposure) */
  work: number;
  /** of the free seasons, those owed to Worship (Regular) */
  worship: number;
  /** seasons beyond the year's four, for study or adventure but not lab work */
  extra: number;
  /** how it was worked out */
  parts: string[];
}

/** Virtues and Social Status that owe seasons of service, which the two working seasons cover. */
const DUTIES: Record<string, string> = {
  redcap: 'Redcap: two seasons a year carrying messages for the Order',
  'lone-redcap': 'Lone Redcap: two seasons a year of service to the Order',
  'town-magistrate': 'Town Magistrate: two seasons a year as a magistrate',
  'doctor-in-faculty': 'Doctor: two seasons a year teaching or in court',
  'master-bard': 'Master Bard: two seasons a year teaching or composing',
  'alchemist-of-soba': 'Alchemist of Soba: two seasons a year laboring for the employer',
  sorgina: 'Sorgina: two seasons a year supporting herself',
  settut: 'Settut: two seasons a year supporting herself',
};

export function seasonsOf(c: Character, d: DerivedCharacter): SeasonPlan {
  const parts: string[] = [];
  // a magus, and a magic being that needs no living, has four free seasons; anyone else works two
  let free = d.isMagus || c.creature ? 4 : 2;
  parts.push(d.isMagus ? 'A Hermetic magus: four genuinely free seasons' : c.creature ? 'A magic being needs no living: four free seasons' : 'Two seasons working for a living, two free');
  const has = (id: string) => c.virtues.some((v) => v.defId === id);
  for (const [id, text] of Object.entries(DUTIES)) if (has(id)) parts.push(text);
  const effects = d.effects.filter((e): e is Extract<ResolvedEffect, { type: 'freeSeasons' }> => e.type === 'freeSeasons');
  for (const e of effects.filter((x) => !x.add)) {
    free = e.amount;
    parts.push(`${e.fromName}: ${e.amount} free season${e.amount === 1 ? '' : 's'}`);
  }
  for (const e of effects.filter((x) => x.add)) {
    free += e.amount;
    parts.push(`${e.fromName}: ${e.amount} more`);
  }
  if (free > 4) parts.push('Never more than four free seasons in a year');
  free = Math.max(0, Math.min(4, free));
  if (c.seasons?.free !== undefined) {
    free = Math.max(0, Math.min(4, c.seasons.free));
    parts.push(`Set by hand: ${free} free`);
  }
  const worship = has('regular-flaw') ? Math.min(1, free) : 0;
  if (worship) parts.push('Regular: one free season a year in Worship');
  const noFatigue = !!c.creature?.magicCharacter?.qualities.some((q) => q.id === 'no-fatigue');
  const extra = noFatigue || c.seasons?.sleepless ? 2 : 0;
  if (noFatigue) parts.push('No Fatigue: needs no sleep, two more seasons a year for study');
  else if (c.seasons?.sleepless) parts.push('Needs no sleep: two more seasons a year for study or adventure (not lab work)');
  return { free, work: 4 - free, worship, extra, parts };
}

/** What a character's season log has spent this year: free seasons, working seasons, worship and extra seasons. */
export function seasonsUsed(c: Character, year: number): { free: number; work: number; worship: number; extra: number } {
  const used = { free: 0, work: 0, worship: 0, extra: 0 };
  // an adventure shares a season with other work (DE), so it uses none of the year's seasons
  for (const e of c.seasonLog.filter((x) => x.year === year && x.activity !== 'adventure')) used[seasonUse(e)] += 1;
  return used;
}

function seasonUse(e: SeasonLogEntry): 'free' | 'work' | 'worship' | 'extra' {
  if (e.extra) return 'extra';
  if (e.activity === 'worship') return 'worship';
  if (e.activity === 'exposure' || e.activity === 'work') return 'work';
  return 'free';
}

/**
 * What the next season of the year is for, when the clock fills it: free seasons until they are
 * used, then Worship, then work (DE: the free time is spread over the year, so this counts what the
 * year has spent, seasons logged by hand included, rather than keeping a calendar).
 */
export function seasonRole(plan: SeasonPlan, used: { free: number; work: number; worship: number }): 'work' | 'worship' | 'free' {
  if (used.free < plan.free - plan.worship) return 'free';
  if (used.worship < plan.worship) return 'worship';
  if (used.work < plan.work) return 'work';
  return 'free';
}

/** The seasons the clock gives an extra season of study to: spread through the year. */
export function extraSeasonHere(plan: SeasonPlan, season: Season): boolean {
  return plan.extra >= 2 ? season === 'Spring' || season === 'Autumn' : plan.extra === 1 && season === 'Autumn';
}
