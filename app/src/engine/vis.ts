// Vis held in stocks (a covenant's or a character's purse): taking and adding pawns.

import type { Art } from '../data';
import type { Character, Purse, VisStock, VisTaint } from './types';

export function purseOf(c: Character): Purse {
  if (!c.purse) c.purse = { pounds: 0, vis: [] };
  return c.purse;
}

/** Pawns of plain vis in these Arts (dedicated vis is kept apart). */
export function visAvailable(stocks: VisStock[], arts: Art[]): number {
  return stocks.filter((s) => !s.pair && arts.includes(s.art)).reduce((t, s) => t + s.pawns, 0);
}

/** Plain Magic vis first, then Faerie, Divine, and Infernal last (DE, Tainted Vis: "avoided by all sensible magi"). */
const TAINT_ORDER: (VisTaint | undefined)[] = [undefined, 'Faerie', 'Divine', 'Infernal'];
const taintRank = (s: VisStock) => TAINT_ORDER.indexOf(s.realm);

/**
 * Take pawns of any of these Arts: untainted vis first, then the most plentiful. Nothing is taken
 * unless all of it is there. What is taken says its realm, so Infernal vis can be seen for what it does.
 */
export function takeVis(stocks: VisStock[], arts: Art[], pawns: number): { ok: boolean; taken: VisStock[] } {
  if (pawns <= 0) return { ok: true, taken: [] };
  if (visAvailable(stocks, arts) < pawns) return { ok: false, taken: [] };
  const taken: VisStock[] = [];
  let left = pawns;
  for (const s of stocks.filter((x) => !x.pair && arts.includes(x.art)).sort((a, b) => taintRank(a) - taintRank(b) || b.pawns - a.pawns)) {
    if (!left) break;
    const n = Math.min(left, s.pawns);
    s.pawns -= n;
    left -= n;
    taken.push(s.realm ? { art: s.art, pawns: n, realm: s.realm } : { art: s.art, pawns: n });
  }
  for (let i = stocks.length - 1; i >= 0; i--) if (stocks[i].pawns <= 0) stocks.splice(i, 1);
  return { ok: true, taken };
}

export function addVis(stocks: VisStock[], art: Art, pawns: number, pair?: Art, realm?: VisTaint): void {
  if (pawns <= 0) return;
  const s = stocks.find((x) => x.art === art && x.pair === pair && x.realm === realm);
  if (s) s.pawns += pawns;
  else stocks.push({ art, pawns, ...(pair ? { pair } : {}), ...(realm ? { realm } : {}) });
}

/** Pawns of Infernal vis among these: twice the botch dice when cast with, a roll on the Extraordinary Results Chart in an enchantment (DE, Tainted Vis). */
export const infernalPawns = (vs: VisStock[]) => vs.filter((v) => v.realm === 'Infernal').reduce((t, v) => t + v.pawns, 0);

/** What Infernal vis did to a lab season's work, when any was used. */
export function taintNote(taken: VisStock[], enchantment: boolean): string | undefined {
  const inf = infernalPawns(taken);
  const div = taken.filter((v) => v.realm === 'Divine').reduce((t, v) => t + v.pawns, 0);
  if (inf) return `${inf} pawn${inf > 1 ? 's' : ''} of it Infernal vis: it twists the work to evil ends and slowly corrupts the magus who uses it${enchantment ? '; the enchantment rolls on the Extraordinary Results Chart' : ''} (DE, Tainted Vis).`;
  if (div) return `${div} pawn${div > 1 ? 's' : ''} of it Divine vis: gathering it may anger the Church, and many magi think it sacrilege to use (DE, Tainted Vis).`;
  return undefined;
}

export const visText = (vs: VisStock[]) => vs.map((v) => `${v.pawns} ${v.pair ? `${v.art}${v.pair} (dedicated)` : v.art}${v.realm ? ` (${v.realm})` : ''}`).join(', ');
