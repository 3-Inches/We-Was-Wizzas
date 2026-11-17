// Vis held in stocks (a covenant's or a character's purse): taking and adding pawns.

import { ART_NAMES } from '../data/constants';
import type { Art } from '../data';
import type { Character, Covenant, Purse, VisStock, VisTaint } from './types';

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

// ------------------------------------------------------------------------------------------------
// A season's vis, from one place: the character's purse or their covenant's stores. The hedge
// traditions' seasons take theirs this way; the Hermetic lab has its own (projects.ts).

/** Where a season's vis is taken from, or where vis drawn in a season goes. */
export type VisPlace = 'purse' | 'covenant';

export const PLACE_NAMES: Record<VisPlace, string> = { purse: 'the purse', covenant: 'the covenant’s stores' };

/** The stocks of a place: a covenant's stores only when there is a covenant. */
export function stocksOf(c: Character, cov: Covenant | undefined, place: VisPlace): VisStock[] {
  return place === 'covenant' && cov ? cov.visStocks : purseOf(c).vis;
}

/** Pawns of these Arts in each place (none in the covenant's stores when there is no covenant). */
export function visInPlaces(c: Character, cov: Covenant | undefined, arts: Art[]): Record<VisPlace, number> {
  return { purse: visAvailable(c.purse?.vis ?? [], arts), covenant: cov ? visAvailable(cov.visStocks, arts) : 0 };
}

/** The place that holds more of these Arts: the purse on a tie, or with no covenant. */
export function fullerPlace(c: Character, cov: Covenant | undefined, arts: Art[]): VisPlace {
  const h = visInPlaces(c, cov, arts);
  return cov && h.covenant > h.purse ? 'covenant' : 'purse';
}

/** "Corpus", "Corpus or Vim", "any Art": the Arts of a need, in words. */
export function artsText(arts: Art[]): string {
  if (arts.length >= 15) return 'any Art’s';
  if (arts.length >= 10 && arts.every((a) => !['Cr', 'In', 'Mu', 'Pe', 'Re'].includes(a))) return 'any Form’s';
  const names = arts.map((a) => ART_NAMES[a]);
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}` : (names[0] ?? '');
}

/** Why a place cannot pay for a season, or nothing when it can. */
export function visShortText(c: Character, cov: Covenant | undefined, place: VisPlace, arts: Art[], pawns: number): string | undefined {
  if (pawns <= 0) return undefined;
  const have = visInPlaces(c, cov, arts)[place];
  if (have >= pawns) return undefined;
  return `It needs ${pawns} pawn${pawns === 1 ? '' : 's'} of ${artsText(arts)} vis; ${PLACE_NAMES[place]} ${place === 'purse' ? 'has' : 'have'} ${have}.`;
}

/**
 * Take a season's vis from one place, changing it: all of it or none (untainted vis first, then the most
 * plentiful). Returns what was taken, and a line saying so or saying what is missing.
 */
export function spendFrom(c: Character, cov: Covenant | undefined, place: VisPlace, arts: Art[], pawns: number): { ok: boolean; taken: VisStock[]; text: string } {
  if (pawns <= 0) return { ok: true, taken: [], text: '' };
  const short = visShortText(c, cov, place, arts, pawns);
  if (short) return { ok: false, taken: [], text: short };
  const r = takeVis(stocksOf(c, cov, place), arts, pawns);
  const named = r.taken.map((v) => `${v.pawns} pawn${v.pawns === 1 ? '' : 's'} of ${ART_NAMES[v.art]}${v.realm ? ` (${v.realm})` : ''}`);
  return { ok: true, taken: r.taken, text: `Spent ${named.join(', ')} vis from ${PLACE_NAMES[place]}.` };
}

/** Put pawns drawn in a season into a place, changing it; returns a line saying so. */
export function putInto(c: Character, cov: Covenant | undefined, place: VisPlace, art: Art, pawns: number): string {
  if (pawns <= 0) return '';
  addVis(stocksOf(c, cov, place), art, pawns);
  return `${pawns} pawn${pawns === 1 ? '' : 's'} of ${ART_NAMES[art]} vis put in ${PLACE_NAMES[place]}.`;
}
