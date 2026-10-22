// Non-standard laboratory routines (Covenants, The Laboratory): working at odd hours or overtime for a
// small bonus to a season's Lab Total, at a price in health, Fatigue, botch dice and Warping.

import type { Character, LabRoutine } from './types';

export interface RoutineDef {
  label: string;
  /** to the Lab Total for the season */
  bonus: number;
  /** to the Living Conditions modifier, once in any year with a season of it */
  living: number;
  /** a Warping Point for every this many seasons of it */
  warpEvery?: number;
  /** extra Aging rolls: one in a year with a season of it, or one for every season */
  extraAging?: 'year' | 'season';
  /** what else it does, in a line */
  cost: string;
}

export const LAB_ROUTINES: Record<LabRoutine, RoutineDef> = {
  early: { label: 'Early Riser', bonus: 1, living: 0, cost: 'after dusk: a Long-Term Fatigue level lost and an extra botch die' },
  nocturnal: { label: 'Nocturnal', bonus: 2, living: -1, cost: 'after dawn: a Long-Term Fatigue level lost and an extra botch die; −1 Living Conditions this year' },
  addled: {
    label: 'Addled', bonus: 3, living: 0, warpEvery: 2,
    cost: 'three extra botch dice on everything this season; a Warping Point every two seasons; on stopping, Stamina − Addicted against 3 × the Addled seasons in a row',
  },
  overtime: { label: 'Overtime', bonus: 3, living: -1, warpEvery: 4, cost: 'Winded or worse all season, −3 to Wound Recovery, an extra botch die; −1 Living Conditions this year; a Warping Point every four seasons' },
  double: {
    label: 'Double Overtime', bonus: 6, living: -2, warpEvery: 2, extraAging: 'year',
    cost: 'Weary or worse all season, −6 to Wound Recovery, two extra botch dice; −2 Living Conditions and an extra Aging roll this year; a Warping Point every two seasons',
  },
  triple: {
    label: 'Triple Overtime', bonus: 9, living: -3, warpEvery: 1, extraAging: 'season',
    cost: 'Tired or worse all season, −9 to Wound Recovery, three extra botch dice; −3 Living Conditions this year; an extra Aging roll and a Warping Point every season',
  },
};

export const ROUTINE_IDS = Object.keys(LAB_ROUTINES) as LabRoutine[];
const OVERTIME: LabRoutine[] = ['overtime', 'double', 'triple'];

/** Routines that cannot be taken together: one kind of overtime, and not both Early Riser and Nocturnal. */
export function routineClash(routines: LabRoutine[]): string | null {
  if (routines.filter((r) => OVERTIME.includes(r)).length > 1) return 'Only one kind of overtime can be worked in a season.';
  if (routines.includes('early') && routines.includes('nocturnal')) return 'Early Riser cannot be combined with Nocturnal.';
  return null;
}

/** Choosing a routine drops the ones it cannot be combined with. */
export function toggleRoutine(routines: LabRoutine[], r: LabRoutine): LabRoutine[] {
  if (routines.includes(r)) return routines.filter((x) => x !== r);
  const without = routines.filter((x) => !(OVERTIME.includes(r) && OVERTIME.includes(x)) && !(r === 'early' && x === 'nocturnal') && !(r === 'nocturnal' && x === 'early'));
  return [...without, r];
}

/** The Lab Total bonus of a season's routines. */
export function routineParts(routines: LabRoutine[] | undefined): { label: string; value: number }[] {
  return (routines ?? []).map((r) => ({ label: LAB_ROUTINES[r].label, value: LAB_ROUTINES[r].bonus }));
}

/** Record a season worked under these routines; any Warping it brings is added. Returns what happened. */
export function recordRoutines(c: Character, routines: LabRoutine[] | undefined, year: number | undefined): string[] {
  if (!routines?.length) return [];
  const lines: string[] = [];
  const r = (c.labRoutines ??= { seasons: {}, years: {} });
  for (const id of routines) {
    const def = LAB_ROUTINES[id];
    r.seasons[id] = (r.seasons[id] ?? 0) + 1;
    if (year !== undefined) {
      const y = (r.years[year] ??= {});
      y[id] = (y[id] ?? 0) + 1;
    }
    if (def.warpEvery && r.seasons[id]! % def.warpEvery === 0) {
      c.warpingPoints += 1;
      lines.push(`+1 Warping Point (${def.label}).`);
    }
  }
  lines.push(`Routine: ${routines.map((x) => LAB_ROUTINES[x].label).join(', ')} (${routines.map((x) => LAB_ROUTINES[x].cost).join('; ')}).`);
  return lines;
}

/** A year's routines: the change to Living Conditions (each routine once) and the extra Aging rolls. */
export function routineYear(c: Character, year: number): { living: number; extraRolls: number; from: string[] } {
  const taken = c.labRoutines?.years[year] ?? {};
  let living = 0;
  let extraRolls = 0;
  const from: string[] = [];
  for (const id of ROUTINE_IDS) {
    const n = taken[id] ?? 0;
    if (!n) continue;
    const def = LAB_ROUTINES[id];
    living += def.living;
    extraRolls += def.extraAging === 'year' ? 1 : def.extraAging === 'season' ? n : 0;
    if (def.living || def.extraAging) from.push(`${def.label} ×${n}`);
  }
  return { living, extraRolls, from };
}
