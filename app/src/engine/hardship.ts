// Hard times (Covenants ch.5, Emergency Savings). When a covenant's spending outruns its income and
// it cannot find more, it has to spend less: the magi give up their privileges, wages are cut (and
// Prevailing Loyalty suffers), covenfolk are laid off, or whole categories of spending are left
// unpaid. Then the buildings, laboratories and weapons go unmaintained, or the covenfolk go hungry.
// Money can also be borrowed, or vis sold (about ten pounds a pawn). A year that ends with the
// treasury below nothing leaves bills unpaid: the toolkit counts them as money owed, at a tenth a
// year in interest, and the covenfolk's wages come late.

import type { Art, GameData } from '../data';
import { deriveCovenant } from './covenant';
import { addVis, takeVis, visAvailable, visText } from './vis';
import type { Character, Covenant, NeglectCategory } from './types';
import { uid } from '../util/id';

const round1 = (n: number) => Math.round(n * 10) / 10;

/** What a pawn of vis fetches in silver: the book's rule of thumb for a typical saga. */
export const VIS_PRICE = 10;

export const NEGLECT: { id: NeglectCategory; label: string; effect: string; loyalty: number }[] = [
  { id: 'Buildings', label: 'Leave the buildings unmaintained', effect: 'Leaks, cold and rot: −3 loyalty points at each year’s end (a severe hardship).', loyalty: -3 },
  { id: 'Weapons and Armor', label: 'Leave the weapons and armor unmaintained', effect: 'A fifth of the turb’s equipment wears out at each year’s end.', loyalty: 0 },
  { id: 'Laboratories', label: 'Leave the laboratories unmaintained', effect: 'Each laboratory takes the Decaying Flaw (or loses a Virtue) at each year’s end, lowering its Upkeep, until it is paid for again.', loyalty: 0 },
  { id: 'Provisions', label: 'Let the covenfolk go hungry', effect: 'They starve: −9 loyalty points at each year’s end (a prolonged hardship the magi chose), and some leave.', loyalty: -9 },
];

const WAGES = ['lavish', 'generous', 'standard', 'miserly', 'none'] as const;
const WAGE_LOYALTY = { none: -20, miserly: -10, standard: 0, generous: 10, lavish: 20 };

export interface HardOption {
  id: string;
  label: string;
  /** pounds a year it saves */
  saving: number;
  /** loyalty points it costs (negative), as the covenfolk see it */
  loyalty: number;
  note: string;
  apply: (c: Covenant) => void;
}

/** The covenfolk a covenant could let go: a fifth of its grogs and of the servants and teamsters beyond those it needs. */
export function layOffs(cov: Covenant, required: { servants: number; teamsters: number }): { grogs: number; servants: number; teamsters: number } {
  const f = cov.covenfolk;
  return {
    grogs: Math.ceil(f.grogs / 5),
    servants: Math.ceil(Math.max(0, f.servants - required.servants) / 5),
    teamsters: Math.ceil(Math.max(0, f.teamsters - required.teamsters) / 5),
  };
}

/** The ways to spend less, each with what it saves a year and what it costs in Loyalty. */
export function hardTimesOptions(cov: Covenant, data: GameData, characters: Character[]): HardOption[] {
  const dc = deriveCovenant(cov, data, characters);
  const base = dc.finances.totalExpenditure;
  const saving = (fn: (c: Covenant) => void) => {
    const c = structuredClone(cov);
    fn(c);
    return round1(base - deriveCovenant(c, data, characters).finances.totalExpenditure);
  };
  const out: HardOption[] = [];
  const add = (o: Omit<HardOption, 'saving'>) => {
    const s = saving(o.apply);
    if (s > 0) out.push({ ...o, saving: s });
  };
  // the privileged give up their perks (no loyalty lost)
  if (!cov.finances.magiLiving)
    add({ id: 'perks', label: 'The magi give up their privileges and live as companions do', loyalty: 0, note: 'They count three points of inhabitants each instead of five.', apply: (c) => void (c.finances.magiLiving = 'impoverished') });
  else if (cov.finances.magiLiving === 'impoverished')
    add({ id: 'perks', label: 'The magi live as covenfolk do', loyalty: 0, note: 'They count as specialists: two points of inhabitants each.', apply: (c) => void (c.finances.magiLiving = 'pauper') });
  // a step down in wages
  const w = WAGES.indexOf(cov.finances.wages);
  if (w < WAGES.length - 1) {
    const to = WAGES[w + 1];
    add({ id: 'wages', label: to === 'none' ? 'Pay no wages' : `Pay ${to} wages`, loyalty: WAGE_LOYALTY[to] - WAGE_LOYALTY[cov.finances.wages], note: 'The covenfolk’s Prevailing Loyalty suffers.', apply: (c) => void (c.finances.wages = to) });
  }
  // laying off covenfolk
  const off = layOffs(cov, { servants: dc.finances.servantsRequired, teamsters: dc.finances.teamstersRequired });
  const n = off.grogs + off.servants + off.teamsters;
  if (n)
    add({
      id: 'layoff',
      label: `Let ${n} of the covenfolk go (${[off.grogs && `${off.grogs} grog${off.grogs > 1 ? 's' : ''}`, off.servants && `${off.servants} servant${off.servants > 1 ? 's' : ''}`, off.teamsters && `${off.teamsters} teamster${off.teamsters > 1 ? 's' : ''}`].filter(Boolean).join(', ')})`,
      loyalty: 0,
      note: 'They become disgruntled vagabonds, perhaps with a grudge against the covenant.',
      apply: (c) => {
        c.covenfolk.grogs -= off.grogs;
        c.covenfolk.servants -= off.servants;
        c.covenfolk.teamsters -= off.teamsters;
      },
    });
  // leaving a category unpaid
  for (const g of NEGLECT)
    if (!(cov.finances.neglect ?? []).includes(g.id)) add({ id: `neglect:${g.id}`, label: g.label, loyalty: g.loyalty, note: g.effect, apply: (c) => void (c.finances.neglect = [...(c.finances.neglect ?? []), g.id]) });
  return out;
}

/** Borrow money: in the treasury now, a tenth a year in interest until repaid. */
export function borrow(cov: Covenant, pounds: number, from: string, year: number): void {
  if (pounds <= 0) return;
  cov.finances.treasury = round1(cov.finances.treasury + pounds);
  (cov.finances.loans ??= []).push({ uid: uid(), from, pounds, year });
}

/** Pay back what is owed, as far as the treasury allows; returns the pounds repaid. */
export function repay(cov: Covenant, pounds: number): number {
  let left = Math.min(pounds, Math.max(0, cov.finances.treasury));
  const paid = left;
  for (const l of [...(cov.finances.loans ?? [])].sort((a, b) => a.year - b.year)) {
    if (left <= 0) break;
    const n = Math.min(left, l.pounds);
    l.pounds = round1(l.pounds - n);
    left = round1(left - n);
  }
  cov.finances.loans = (cov.finances.loans ?? []).filter((l) => l.pounds > 0);
  cov.finances.treasury = round1(cov.finances.treasury - (paid - left));
  return round1(paid - left);
}

export const owed = (cov: Covenant) => round1((cov.finances.loans ?? []).reduce((t, l) => t + l.pounds, 0));

/** Sell vis for silver, the most plentiful Art first; returns what was sold. */
export function sellVis(cov: Covenant, arts: Art[], pawns: number, price = VIS_PRICE): string | undefined {
  const n = Math.min(pawns, visAvailable(cov.visStocks, arts));
  if (n <= 0) return undefined;
  const r = takeVis(cov.visStocks, arts, n);
  if (!r.ok) return undefined;
  cov.finances.treasury = round1(cov.finances.treasury + n * price);
  return `${visText(r.taken)} vis sold for ${n * price} £`;
}

/** Buy vis with silver (from Redcaps or another covenant). */
export function buyVis(cov: Covenant, art: Art, pawns: number, price = VIS_PRICE): boolean {
  const cost = pawns * price;
  if (pawns <= 0 || cov.finances.treasury < cost) return false;
  cov.finances.treasury = round1(cov.finances.treasury - cost);
  addVis(cov.visStocks, art, pawns);
  return true;
}

export interface HardLine {
  who: string;
  kind: 'covenant' | 'reminder';
  text: string;
}

/**
 * Hard times at the year's end, after the books are closed: a treasury below nothing becomes money
 * owed (and the wages come late), and each category left unpaid brings its trouble.
 */
export function hardshipYearEnd(cov: Covenant, data: GameData, year: number, members: Character[] = []): HardLine[] {
  const lines: HardLine[] = [];
  const who = cov.name;
  const f = cov.finances;
  if (f.treasury < 0) {
    const debt = round1(-f.treasury);
    (f.loans ??= []).push({ uid: uid(), from: 'bills left unpaid', pounds: debt, year });
    f.treasury = 0;
    cov.loyalty.actionPoints -= 3;
    lines.push({ who, kind: 'reminder', text: `The treasury is empty: ${debt} £ of bills are left unpaid and owed (a tenth a year in interest), and the covenfolk's wages come late (−3 loyalty points). Cut spending or find income (Covenfolk & Finances: Hard times).` });
  }
  for (const n of f.neglect ?? []) {
    const g = NEGLECT.find((x) => x.id === n)!;
    if (g.loyalty) cov.loyalty.actionPoints += g.loyalty;
    if (n === 'Provisions') {
      const leave = Math.ceil(cov.covenfolk.laborers / 10) + Math.ceil(cov.covenfolk.servants / 10);
      cov.covenfolk.laborers = Math.max(0, cov.covenfolk.laborers - Math.ceil(cov.covenfolk.laborers / 10));
      cov.covenfolk.servants = Math.max(0, cov.covenfolk.servants - Math.ceil(cov.covenfolk.servants / 10));
      lines.push({ who, kind: 'reminder', text: `The covenfolk went hungry this year (${g.loyalty} loyalty points)${leave ? `, and ${leave} of them have left` : ''}.` });
    } else if (n === 'Buildings') {
      lines.push({ who, kind: 'reminder', text: `The buildings went unmaintained: leaks, cold and rot (${g.loyalty} loyalty points).` });
    } else if (n === 'Weapons and Armor') {
      const lost = Math.round(f.weaponArmorPoints / 5);
      f.weaponArmorPoints -= lost;
      if (lost) lines.push({ who, kind: 'reminder', text: `Weapons and armor went unmaintained: ${lost} points of the turb's equipment wore out.` });
    } else if (n === 'Laboratories') {
      const done: string[] = [];
      for (const lab of cov.labs) {
        if (!lab.virtues.some((v) => v.defId === 'decaying-flaw')) {
          lab.virtues.push({ uid: uid(), defId: 'decaying-flaw' });
          done.push(`${lab.name} is Decaying`);
          continue;
        }
        // already decaying: a Virtue that costs upkeep is lost
        const i = lab.virtues.findIndex((v) => ((data.labVFById.get(v.defId)?.mods?.characteristics as Record<string, number> | undefined)?.Upkeep ?? 0) > 0 && !v.fromItem);
        if (i >= 0) done.push(`${lab.name} loses ${data.labVFById.get(lab.virtues[i].defId)?.name ?? 'a Virtue'}`), lab.virtues.splice(i, 1);
      }
      if (done.length) lines.push({ who, kind: 'reminder', text: `The laboratories went unmaintained: ${done.join('; ')}.` });
    }
  }
  const total = owed(cov);
  if (total > 0) {
    const income = deriveCovenant(cov, data, members).finances.income;
    if (total > 2 * Math.max(1, income)) lines.push({ who, kind: 'reminder', text: `${who} owes ${total} £, more than two years’ income: a creditor may come calling, ready to forgive part of it for a service (a story).` });
  }
  return lines;
}
