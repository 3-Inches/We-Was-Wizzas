// A living covenant's means, kept as its magi would keep them, with nothing from nowhere. Each year's
// end it reckons the vis it must hold back (the Aegis of the Hearth, and Longevity Rituals for magi
// who need one), and its money:
// - short of money, it first sells vis it can spare (about ten pounds a pawn, Covenants ch.5), then
//   spends less as the Emergency Savings allow, cheapest first; whatever is still missing is owed;
//   and its magi give service seasons to raising its income by magic (Magical Improvement);
// - with money to spare it pays off what it owes and undoes its cuts, buys the vis its reserve
//   lacks, and puts a hoard beyond five years' spending into land and goods, sold again in hard times.
// Covenants trade vis among themselves: one short of the vis its reserve needs buys from another that
// can spare it; only failing that does it buy, dearly, from the Redcaps.

import type { Art, GameData } from '../data';
import { deriveCovenant } from './covenant';
import { longevityVisCost } from './enchant';
import { VIS_PRICE, hardTimesOptions, owed, repay } from './hardship';
import { addVis, takeVis, visAvailable, visText } from './vis';
import type { ActiveEffect, Character, Covenant, NeglectCategory, VisStock } from './types';
import { uid } from '../util/id';

const round1 = (n: number) => Math.round(n * 10) / 10;

export const AEGIS_ARTS: Art[] = ['Re', 'Vi'];
export const LONGEVITY_ARTS: Art[] = ['Cr', 'Co', 'Vi'];
/** What the Redcaps charge for a pawn they find for a covenant in need: dear, and only a few a year. */
export const REDCAP_PRICE = 20;
const REDCAP_MAX = 5;

export interface EconLine {
  who: string;
  text: string;
  tribunal: string;
}

const aegisOf = (cov: Covenant) => (cov.effects ?? []).find((e) => /aegis of the hearth/i.test(e.name));

/** The Aegis a living covenant keeps: level 30 for a large covenant, 20 for a small one. */
export function aegisLevel(magi: number): number {
  return magi >= 6 ? 30 : 20;
}

/** The vis a covenant holds back: its Aegis for the coming year, and Longevity Rituals for magi of 30 or more without one. */
export function visReserve(cov: Covenant, members: Character[]): { aegis: number; longevity: number } {
  const a = aegisOf(cov);
  const magi = members.filter((c) => c.type === 'magus' && !c.wounds.dead && !c.retired).length;
  // the Aegis it keeps, or the one it means to raise
  const aegis = a?.renew ? Math.max(1, Math.ceil(a.renew.level / 5)) : !a && cov.living && magi ? Math.ceil(aegisLevel(magi) / 5) : 0;
  const longevity = members
    .filter((c) => c.type === 'magus' && !c.wounds.dead && !c.retired && c.age >= 30 && !c.longevity)
    .reduce((t, c) => t + longevityVisCost(Math.max(35, c.age), c.longevityLapsed?.extraVis ?? 0), 0);
  return { aegis, longevity };
}

/** Pawns beyond the reserve, Art by Art: what a covenant can sell or study without going short. */
export function spareVis(cov: Covenant, members: Character[]): VisStock[] {
  const r = visReserve(cov, members);
  const plain = cov.visStocks.filter((v) => !v.pair && v.pawns > 0).map((v) => ({ art: v.art, pawns: v.pawns }));
  // hold back the most plentiful of each reserve's Arts first
  const hold = (arts: Art[], n: number) => {
    for (const v of plain.filter((x) => arts.includes(x.art)).sort((a, b) => b.pawns - a.pawns)) {
      const k = Math.min(n, v.pawns);
      v.pawns -= k;
      n -= k;
      if (!n) break;
    }
    return n;
  };
  hold(AEGIS_ARTS, r.aegis);
  hold(LONGEVITY_ARTS, r.longevity);
  return plain.filter((v) => v.pawns > 0);
}

/** The pawns the reserve lacks, and in which Arts. */
export function visShortfall(cov: Covenant, members: Character[]): { arts: Art[]; pawns: number }[] {
  const r = visReserve(cov, members);
  const out: { arts: Art[]; pawns: number }[] = [];
  const aegisHave = visAvailable(cov.visStocks, AEGIS_ARTS);
  if (aegisHave < r.aegis) out.push({ arts: AEGIS_ARTS, pawns: r.aegis - aegisHave });
  const longHave = visAvailable(cov.visStocks, LONGEVITY_ARTS) - Math.min(r.aegis, visAvailable(cov.visStocks, ['Vi']));
  if (longHave < r.longevity) out.push({ arts: ['Cr', 'Co'], pawns: r.longevity - Math.max(0, longHave) });
  return out;
}

/** A living covenant raises its Aegis of the Hearth if it has none, from its vis (renewed each year after). */
export function ensureAegis(cov: Covenant, members: Character[], year: number): EconLine[] {
  if (aegisOf(cov)) return [];
  const magi = members.filter((c) => c.type === 'magus' && !c.wounds.dead && !c.retired);
  if (!magi.length) return [];
  const level = aegisLevel(magi.length);
  const pawns = Math.ceil(level / 5);
  const paid = takeVis(cov.visStocks, AEGIS_ARTS, pawns);
  if (!paid.ok) return [{ who: cov.name, tribunal: cov.id, text: `${cov.name} cannot raise its Aegis of the Hearth: it needs ${pawns} pawns of Rego or Vim vis.` }];
  // it runs from the turn of the year, like a renewed ward, so it falls due again after the next year's accounts
  const e: ActiveEffect = { uid: uid(), name: 'Aegis of the Hearth', source: `${cov.name}’s magi`, year: year + 1, season: 'Spring', duration: 'year', renew: { level } };
  cov.effects = [...(cov.effects ?? []), e];
  return [{ who: cov.name, tribunal: cov.id, text: `${cov.name} raises its Aegis of the Hearth (level ${level}, ${visText(paid.taken)} vis).` }];
}

/** The order a living covenant turns to the Emergency Savings in: what costs least goodwill first; hunger last of all. */
const CUTS = ['perks', 'layoff', 'neglect:Weapons and Armor', 'wages', 'neglect:Buildings', 'neglect:Laboratories', 'neglect:Provisions'];

/**
 * A living covenant's money and vis at the year's end (after the books are closed and any shortfall
 * left owed). Returns the year's lines.
 */
export function livingStewardship(cov: Covenant, members: Character[], data: GameData, inflationOn: boolean): EconLine[] {
  const out: EconLine[] = [];
  const say = (text: string) => out.push({ who: cov.name, tribunal: cov.id, text });
  const f = cov.finances;
  const living = cov.living;
  if (!living) return out;
  // with inflation off, what it once counted goes
  if (!inflationOn && f.inflation) f.inflation = 0;
  let dc = deriveCovenant(cov, data, members).finances;
  const spend = dc.totalExpenditure;
  const debt = owed(cov);
  let ahead = round1(f.treasury + dc.balance - debt);
  living.needs = { money: false, vis: 0 };
  if (ahead < 0) {
    // sell the vis it can spare
    let need = -ahead;
    const spare = spareVis(cov, members).sort((a, b) => b.pawns - a.pawns);
    const sold: VisStock[] = [];
    for (const v of spare) {
      if (need <= 0) break;
      const n = Math.min(v.pawns, Math.ceil(need / VIS_PRICE));
      const r = takeVis(cov.visStocks, [v.art], n);
      if (!r.ok) continue;
      sold.push(...r.taken);
      f.treasury = round1(f.treasury + n * VIS_PRICE);
      need -= n * VIS_PRICE;
    }
    if (sold.length) say(`${cov.name} sells ${visText(sold)} vis for ${sold.reduce((t, v) => t + v.pawns, 0) * VIS_PRICE} £ to meet its costs.`);
    // then some of its land and goods, for four-fifths of their worth
    if (need > 0 && (f.holdings ?? 0) > 0) {
      const worth = Math.min(f.holdings!, Math.ceil(need / 0.8));
      f.holdings = round1(f.holdings! - worth);
      f.treasury = round1(f.treasury + worth * 0.8);
      say(`${cov.name} sells land and goods worth ${worth} £ for ${round1(worth * 0.8)} £.`);
    }
    ahead = round1(f.treasury + dc.balance - debt);
    // then spends less, cheapest in goodwill first, until the year balances
    for (const id of CUTS) {
      if (ahead >= 0 && dc.balance >= 0) break;
      const o = hardTimesOptions(cov, data, members).find((x) => x.id === id);
      if (!o) continue;
      o.apply(cov);
      say(`Hard times at ${cov.name}: ${o.label.charAt(0).toLowerCase()}${o.label.slice(1)} (saves ${o.saving} £ a year${o.loyalty ? `, ${o.loyalty} loyalty points` : ''}).`);
      dc = deriveCovenant(cov, data, members).finances;
      ahead = round1(f.treasury + dc.balance - debt);
    }
  } else {
    // money to spare: pay what is owed, then undo the cuts while the year still balances
    if (debt > 0 && f.treasury > spend / 2) {
      const paid = repay(cov, Math.min(debt, f.treasury - spend / 2));
      if (paid) say(`${cov.name} pays off ${paid} £ of what it owes.`);
    }
    const unpaid = (n: NeglectCategory) => (c: Covenant) => (c.finances.neglect ?? []).includes(n);
    const pay = (n: NeglectCategory) => (c: Covenant) => void (c.finances.neglect = (c.finances.neglect ?? []).filter((x) => x !== n));
    const undo: [string, (c: Covenant) => boolean, (c: Covenant) => void][] = [
      ['feeds its people again', unpaid('Provisions'), pay('Provisions')],
      ['keeps up its laboratories again', unpaid('Laboratories'), pay('Laboratories')],
      ['repairs its buildings again', unpaid('Buildings'), pay('Buildings')],
      ['raises its wages again', (c) => c.finances.wages === 'none' || c.finances.wages === 'miserly', (c) => void (c.finances.wages = c.finances.wages === 'none' ? 'miserly' : 'standard')],
      ['keeps up its arms and armor again', unpaid('Weapons and Armor'), pay('Weapons and Armor')],
      ['lets its magi live as magi again', (c) => !!c.finances.magiLiving, (c) => void (c.finances.magiLiving = undefined)],
    ];
    for (const [what, applies, fn] of undo) {
      if (!applies(cov)) continue;
      const trial = structuredClone(cov);
      fn(trial);
      const t = deriveCovenant(trial, data, members).finances;
      if (t.balance < 0 || f.treasury + t.balance < spend / 2) break;
      fn(cov);
      dc = t;
      say(`${cov.name}’s fortunes recover: it ${what}.`);
    }
    // a hoard beyond five years' spending goes into land and goods, to be sold again in hard times
    const cap = Math.round(5 * dc.totalExpenditure);
    if (cap > 0 && f.treasury > cap) {
      const extra = Math.round(f.treasury - cap);
      f.treasury = cap;
      f.holdings = round1((f.holdings ?? 0) + extra);
      say(`${cov.name} puts ${extra} £ beyond five years’ spending into land and goods (${f.holdings} £ held).`);
    }
  }
  // while it lives with cuts or debts, its magi keep working to raise its income
  const cut = f.wages === 'none' || f.wages === 'miserly' || (f.neglect ?? []).length > 0 || !!f.magiLiving || owed(cov) > 0;
  if (cut || dc.balance < 0) living.needs.money = true;
  // the vis its reserve lacks
  const short = visShortfall(cov, members);
  living.needs.vis = short.reduce((t, s) => t + s.pawns, 0);
  return out;
}

/**
 * Vis changes hands between the living covenants: each short of its reserve buys from those with vis to
 * spare, at about ten pounds a pawn, while it can pay; failing that, a few pawns from the Redcaps, dearly.
 */
export function livingVisMarket(covenants: Covenant[], characters: Character[], data: GameData): EconLine[] {
  const out: EconLine[] = [];
  const membersOf = (cov: Covenant) => characters.filter((c) => cov.memberIds.includes(c.id));
  for (const buyer of covenants) {
    const mine = membersOf(buyer);
    const needs = visShortfall(buyer, mine);
    if (!needs.length) continue;
    const spend = deriveCovenant(buyer, data, mine).finances.totalExpenditure;
    const canPay = (n: number, price: number) => buyer.finances.treasury - n * price >= spend / 2;
    for (const need of needs) {
      let left = need.pawns;
      for (const seller of covenants) {
        if (seller === buyer || left <= 0) continue;
        const spare = spareVis(seller, membersOf(seller)).filter((v) => need.arts.includes(v.art));
        for (const v of spare) {
          const n = Math.min(left, v.pawns);
          if (n <= 0 || !canPay(n, VIS_PRICE)) continue;
          const r = takeVis(seller.visStocks, [v.art], n);
          if (!r.ok) continue;
          addVis(buyer.visStocks, v.art, n);
          buyer.finances.treasury = round1(buyer.finances.treasury - n * VIS_PRICE);
          seller.finances.treasury = round1(seller.finances.treasury + n * VIS_PRICE);
          left -= n;
          out.push({ who: buyer.name, tribunal: buyer.id, text: `${buyer.name} buys ${n} pawn${n > 1 ? 's' : ''} of ${v.art} vis from ${seller.name} for ${n * VIS_PRICE} £.` });
        }
      }
      const n = Math.min(left, REDCAP_MAX);
      if (n > 0 && canPay(n, REDCAP_PRICE)) {
        addVis(buyer.visStocks, need.arts[0], n);
        buyer.finances.treasury = round1(buyer.finances.treasury - n * REDCAP_PRICE);
        out.push({ who: buyer.name, tribunal: buyer.id, text: `${buyer.name} buys ${n} pawn${n > 1 ? 's' : ''} of ${need.arts[0]} vis through the Redcaps, dearly (${n * REDCAP_PRICE} £).` });
      }
    }
  }
  return out;
}

/** How many times magic may raise a living covenant's income: its income grows by half at most. */
export const MAX_IMPROVEMENTS = 8;

/**
 * A season spent raising the covenant's income by magic (Covenants ch.5, Magical Improvement): an
 * enchanted device or a ritual for its principal source, for two pawns of the covenant's vis; the
 * source grows by a twentieth (the Growth modifier), for good.
 */
export function magicalImprovement(cov: Covenant, c: Character, members: Character[], year: number): string[] {
  const living = cov.living;
  if (!living || (living.improved ?? 0) >= MAX_IMPROVEMENTS || living.improvedYear === year) return [];
  const spare = spareVis(cov, members).filter((v) => !AEGIS_ARTS.includes(v.art));
  const art = spare.sort((a, b) => b.pawns - a.pawns)[0]?.art;
  if (!art) return [`${c.name} has no vis to spare for the work, and it waits.`];
  const r = takeVis(cov.visStocks, [art], Math.min(2, visAvailable(cov.visStocks, [art])));
  const src = [...cov.income].filter((s) => !s.inPlay).sort((a, b) => (b.pounds ?? 0) - (a.pounds ?? 0))[0];
  if (!src) return [];
  src.factor = Math.round((src.factor ?? 1) * 1.05 * 1000) / 1000;
  living.improved = (living.improved ?? 0) + 1;
  living.improvedYear = year;
  return [`Magical Improvement: ${c.name}’s enchantment makes ${src.name} more productive (×1.05, ${visText(r.taken)} vis).`];
}
