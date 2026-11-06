// Turning back a season or a year: before the clock moves, the saga as it was is kept (its characters
// and covenants, the Tribunal's too), the last two years of it, in the browser's own store apart from
// the saga. Turning back puts one of them back whole; what was done since is gone.

import { get as idbGet, set as idbSet } from 'idb-keyval';
import type { SagaState } from '../engine/time';
import type { Season } from '../engine/types';

export interface TurnBack {
  at: string;
  /** the season it was, before it ended */
  year: number;
  season: Season;
  /** how far the clock moved from it: one season, or several */
  seasons: number;
  state: SagaState;
}

/** Eight seasons: two years to turn back. */
export const TURN_BACK_KEEP = 8;
const key = (sagaId: string) => `arm5-turnback-${sagaId}`;

/** The points the saga can be turned back to, newest first. */
export async function turnBacks(sagaId: string): Promise<TurnBack[]> {
  try {
    return ((await idbGet(key(sagaId))) as TurnBack[] | undefined) ?? [];
  } catch {
    return [];
  }
}

/** Keep the saga as it is, before the clock moves on. */
export async function keepTurnBack(before: SagaState, seasons: number): Promise<void> {
  const list = await turnBacks(before.saga.id);
  const point: TurnBack = { at: new Date().toISOString(), year: before.saga.currentYear, season: before.saga.currentSeason, seasons, state: before };
  try {
    await idbSet(key(before.saga.id), [point, ...list].slice(0, TURN_BACK_KEEP));
  } catch {
    // the browser would not keep it (storage full or blocked): turning back is simply not offered
  }
}

/** After turning back to one point: it, and those after it, are gone (the saga is there again). */
export async function forgetFrom(sagaId: string, at: string): Promise<void> {
  const list = await turnBacks(sagaId);
  const i = list.findIndex((p) => p.at === at);
  try {
    await idbSet(key(sagaId), i < 0 ? list : list.slice(i + 1));
  } catch {
    // nothing to do
  }
}
