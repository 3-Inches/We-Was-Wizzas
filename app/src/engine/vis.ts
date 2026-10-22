// Vis held in stocks (a covenant's or a character's purse): taking and adding pawns.

import type { Art } from '../data';
import type { Character, Purse, VisStock } from './types';

export function purseOf(c: Character): Purse {
  if (!c.purse) c.purse = { pounds: 0, vis: [] };
  return c.purse;
}

/** Pawns of plain vis in these Arts (dedicated vis is kept apart). */
export function visAvailable(stocks: VisStock[], arts: Art[]): number {
  return stocks.filter((s) => !s.pair && arts.includes(s.art)).reduce((t, s) => t + s.pawns, 0);
}

/** Take pawns of any of these Arts, the most plentiful first. Nothing is taken unless all of it is there. */
export function takeVis(stocks: VisStock[], arts: Art[], pawns: number): { ok: boolean; taken: VisStock[] } {
  if (pawns <= 0) return { ok: true, taken: [] };
  if (visAvailable(stocks, arts) < pawns) return { ok: false, taken: [] };
  const taken: VisStock[] = [];
  let left = pawns;
  for (const s of stocks.filter((x) => !x.pair && arts.includes(x.art)).sort((a, b) => b.pawns - a.pawns)) {
    if (!left) break;
    const n = Math.min(left, s.pawns);
    s.pawns -= n;
    left -= n;
    taken.push({ art: s.art, pawns: n });
  }
  for (let i = stocks.length - 1; i >= 0; i--) if (stocks[i].pawns <= 0) stocks.splice(i, 1);
  return { ok: true, taken };
}

export function addVis(stocks: VisStock[], art: Art, pawns: number, pair?: Art): void {
  if (pawns <= 0) return;
  const s = stocks.find((x) => x.art === art && x.pair === pair);
  if (s) s.pawns += pawns;
  else stocks.push(pair ? { art, pawns, pair } : { art, pawns });
}

export const visText = (vs: VisStock[]) => vs.map((v) => `${v.pawns} ${v.pair ? `${v.art}${v.pair} (dedicated)` : v.art}`).join(', ');
