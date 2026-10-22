// Money and vis between the covenant and its members: the yearly allowance a charter grants, purses,
// transfers, and what things cost (Covenants ch.5 and 7; City & Guild, Appendix: Price List).

import type { Art } from '../data';
import type { Allowance, Character, Covenant, Saga, Season, VisStock } from './types';
import { addVis, purseOf, takeVis, visText } from './vis';

/** Covenants: "a base guideline of roughly ten pounds per pawn is a reasonable rule of thumb". */
export const DEFAULT_VIS_PRICE = 10;
export const visPriceOf = (saga?: Saga) => saga?.economy?.visPrice ?? DEFAULT_VIS_PRICE;

export const NO_ALLOWANCE: Allowance = { mode: 'none', amount: 0, to: 'magi', visShare: 0 };

/** Who an allowance goes to: the magi, or every member. */
export function allowanceRecipients(cov: Covenant, members: Character[]): Character[] {
  const a = cov.allowance ?? NO_ALLOWANCE;
  const inCov = members.filter((m) => cov.memberIds.includes(m.id) && !m.creature);
  return a.to === 'magi' ? inCov.filter((m) => m.type === 'magus') : inCov;
}

/**
 * Pay the year's allowance (after the year's balance reaches the treasury): pounds as a flat sum
 * each or a share of the surplus, and a share of the vis gathered, split evenly. The treasury and
 * stocks never go below nothing; what cannot be paid is not.
 */
export function payAllowance(cov: Covenant, members: Character[], surplus: number, harvest: VisStock[], year: number, season: Season): string[] {
  const a = cov.allowance ?? NO_ALLOWANCE;
  const who = allowanceRecipients(cov, members);
  if (!who.length || (a.mode === 'none' && !a.visShare)) return [];
  const lines: string[] = [];
  let each = 0;
  if (a.mode === 'flat') each = a.amount;
  else if (a.mode === 'percent') each = surplus > 0 ? (surplus * a.amount) / 100 / who.length : 0;
  each = Math.floor(each * 10) / 10;
  const total = Math.min(each * who.length, Math.max(0, cov.finances.treasury));
  if (total < each * who.length) each = Math.floor((total / who.length) * 10) / 10;
  if (each > 0) {
    cov.finances.treasury = Math.round((cov.finances.treasury - each * who.length) * 10) / 10;
    for (const m of who) {
      const p = purseOf(m);
      p.pounds = Math.round((p.pounds + each) * 10) / 10;
      (p.log ??= []).push({ year, season, text: `Allowance from ${cov.name}`, pounds: each });
    }
    lines.push(`Allowance: ${each} £ each to ${who.map((m) => m.name || 'Unnamed').join(', ')}.`);
  } else if (a.mode !== 'none') lines.push('Allowance: nothing to give this year.');
  if (a.visShare > 0) {
    const given: string[] = [];
    for (const h of harvest) {
      const share = Math.floor((h.pawns * a.visShare) / 100 / who.length);
      if (!share) continue;
      const r = takeVisExact(cov.visStocks, h, share * who.length);
      if (!r) continue;
      for (const m of who) {
        addVis(purseOf(m).vis, h.art, share, h.pair);
        (purseOf(m).log ??= []).push({ year, season, text: `Vis share from ${cov.name}`, vis: [{ ...h, pawns: share }] });
      }
      given.push(`${share} ${h.pair ? `${h.art}${h.pair}` : h.art}`);
    }
    if (given.length) lines.push(`Vis share: ${given.join(', ')} to each.`);
  }
  return lines;
}

function takeVisExact(stocks: VisStock[], v: VisStock, pawns: number): boolean {
  const s = stocks.find((x) => x.art === v.art && x.pair === v.pair);
  if (!s || s.pawns < pawns) return false;
  s.pawns -= pawns;
  if (s.pawns <= 0) stocks.splice(stocks.indexOf(s), 1);
  return true;
}

/** Move pawns of vis between stocks. */
export function moveVis(from: VisStock[], to: VisStock[], art: Art, pawns: number, pair?: Art): string | undefined {
  if (pawns <= 0) return 'Nothing to move.';
  if (pair) {
    const ok = takeVisExact(from, { art, pawns, pair }, pawns);
    if (!ok) return 'Not that much of that vis.';
  } else if (!takeVis(from, [art], pawns).ok) return `Not ${pawns} pawns of ${art}.`;
  addVis(to, art, pawns, pair);
  return undefined;
}

/** A price in pounds as the period would say it: pounds, shillings and pennies. */
export function lsd(pounds: number): string {
  const d = Math.round(pounds * 240);
  const L = Math.floor(d / 240);
  const s = Math.floor((d % 240) / 12);
  const p = d % 12;
  return [L && `${L} £`, s && `${s}s`, p && `${p}d`].filter(Boolean).join(' ') || '0';
}

export { visText };
