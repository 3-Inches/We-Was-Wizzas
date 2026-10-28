// What money buys in Mythic Europe: the price lists of Covenants (ch.5, Price List; ch.7, Prices for
// Books) and City & Guild (Appendix: Price List), with the ranges and reasons where prices vary; and
// buying, selling and giving with the treasury and purses.

import type { Art } from '../data';
import { visLabel } from './covenant';
import { lsd, moveVis } from './economy';
import { newLab } from './lab';
import type { Character, Covenant, CovenfolkCounts, LibraryBook, Season, Specialist, VisStock } from './types';
import { addVis, purseOf, takeVis, visText } from './vis';
import { uid } from '../util/id';

export interface Ware {
  id: string;
  name: string;
  /** Mythic Pounds for one */
  pounds: number;
  /** what one buys ("for 20 sheep") */
  per?: string;
  /** quality and size multipliers apply (Covenants: shoddy ×½ … flawless ×10) */
  scales?: boolean;
  /** a yearly cost rather than a one-off price */
  yearly?: boolean;
  note?: string;
  source: string;
}

export interface WareGroup {
  id: string;
  label: string;
  wares: Ware[];
  note?: string;
}

const COV = 'Covenants ch.5, Price List';
const CG = 'City & Guild, Appendix: Price List';

export const MARKET: WareGroup[] = [
  {
    id: 'services',
    label: 'Services and hospitality',
    wares: [
      { id: 'redcaps', name: 'Visits of two Redcaps, a couple of weeks each', pounds: 1, source: COV, note: "A Redcap's fee alone is 30 pennies; their stay costs three or four times that." },
      { id: 'feast', name: 'A lavish festival, or two feast days for a hundred', pounds: 1, source: COV, note: 'Covenants: a celebration or a year of feasts can win a point of Loyalty.' },
      { id: 'horse-keep', name: 'Keeping a horse for a year', pounds: 1, source: COV, yearly: true },
      { id: 'board-commoner', name: 'Board and lodging for a commoner, a year', pounds: 1, source: COV },
      { id: 'board-noble', name: 'Board and lodging for a noble or magus, a season', pounds: 2, source: COV },
      { id: 'wagon-rent', name: 'Rent of a wagon and horses for a season', pounds: 1, source: COV },
      { id: 'travel-2w', name: 'Two weeks of travel and lodging, two magi and six grogs', pounds: 1, source: COV },
      { id: 'travel-season', name: 'A season of travel and lodging, two magi and six grogs', pounds: 6, source: COV },
      { id: 'teacher-outside', name: 'An outside teacher (half a year’s wage of the skill)', pounds: 1, per: 'skilled; 2½ £ for a master', source: 'Covenants ch.5, Training', note: 'A skilled individual costs half as much to recruit for teaching as to employ for work.' },
    ],
  },
  {
    id: 'labor',
    label: 'Hired hands',
    note: 'Wages for a year. People who join the covenant for good are added under Covenfolk instead, where they cost inhabitant points every year.',
    wares: [
      { id: 'unskilled', name: 'An unskilled workman for a year (a penny a day)', pounds: 1, yearly: true, source: COV },
      { id: 'skilled', name: 'A skilled workman or man at arms for a year (two pence a day)', pounds: 2, yearly: true, source: COV },
      { id: 'master', name: "A master craftsman or ship's captain for a year (five pence a day)", pounds: 5, yearly: true, source: COV },
      { id: 'slaves', name: 'Half a dozen slaves (where the law allows)', pounds: 1, source: COV },
    ],
  },
  {
    id: 'lab',
    label: 'Laboratories',
    note: 'Covenants ch.5 and 9: a pound for every two Upkeep points to outfit (10 points at Upkeep 0), and when a change raises the Upkeep, a pound for every two points it adds; a pound per 10 points a year to maintain. A lab project that installs a Virtue or puts a Flaw right pays its rise itself.',
    wares: [
      { id: 'lab-outfit', name: 'Outfit a standard laboratory from bare walls', pounds: 5, source: COV },
      { id: 'lab-upkeep', name: 'An Upkeep point more for a laboratory (a new Virtue)', pounds: 0.5, per: 'Upkeep point', source: 'Covenants ch.9', note: 'Upkeep points: 7 at −1, 10 at 0, 15 at +1, 30 at +2, 60 at +3, 100 at +4, 150 at +5. Raising a lab from Upkeep +2 to +4 adds 70 points: 35 pounds.' },
      { id: 'lab-year', name: 'A year’s upkeep of a standard laboratory (average use)', pounds: 1, yearly: true, source: COV },
      { id: 'parchment', name: 'Parchment and inks for four books', pounds: 1, source: COV },
      { id: 'resonant', name: 'Resonant materials for a book (a precious material)', pounds: 1, source: COV, note: 'One pound typically buys enough to add a resonant bonus to one book.' },
    ],
  },
  {
    id: 'animals',
    label: 'Animals',
    wares: [
      { id: 'livestock', name: '20 sheep, 8 hunting dogs, 4 cows, 2 oxen or 2 draught horses', pounds: 1, scales: true, source: COV },
      { id: 'wild', name: 'A captured or trained wild animal (a bear, a monkey)', pounds: 1, scales: true, source: COV },
      { id: 'riding-horse', name: 'Riding horse', pounds: 2, scales: true, source: COV },
      { id: 'warhorse', name: 'Warhorse', pounds: 16, scales: true, source: COV },
    ],
  },
  {
    id: 'buildings',
    label: 'Buildings and land',
    note: 'Built rather than bought: a year per floor, twice as fast for half as much again. A building for covenfolk costs a pound per inhabitant point it houses.',
    wares: [
      { id: 'house', name: 'House', pounds: 1, scales: true, source: COV },
      { id: 'bridge', name: 'Bridge', pounds: 2, scales: true, source: COV },
      { id: 'mill', name: 'Mill', pounds: 5, scales: true, source: COV },
      { id: 'gatehouse', name: 'Gatehouse', pounds: 7, scales: true, source: COV },
      { id: 'chapel', name: 'Chapel', pounds: 8, scales: true, source: COV },
      { id: 'manor', name: 'Manor house', pounds: 10, scales: true, source: COV },
      { id: 'motte', name: 'Motte and bailey', pounds: 12, scales: true, source: COV },
      { id: 'church', name: 'Church', pounds: 50, scales: true, source: COV },
      { id: 'tower', name: 'Tower', pounds: 100, scales: true, source: COV },
      { id: 'castle', name: 'Castle', pounds: 1000, scales: true, source: COV },
      { id: 'land', name: 'A virgate of arable land (or two of wild land)', pounds: 10, source: COV, note: 'About 30 acres, enough for a peasant family; land usually sells for 20 to 50 times its yearly yield.' },
    ],
  },
  {
    id: 'materials',
    label: 'Precious materials',
    wares: [
      { id: 'stone', name: 'Ten blocks of dressed building stone', pounds: 1, source: COV },
      { id: 'gems', name: 'Half a dozen precious gems', pounds: 1, source: COV },
      { id: 'art', name: 'Three or four paintings or tapestries', pounds: 1, scales: true, source: COV },
      { id: 'furs', name: 'Two garments of fine fur', pounds: 1, scales: true, source: COV },
      { id: 'statue', name: 'A statue', pounds: 1, scales: true, source: COV },
      { id: 'rare-wood', name: 'A bough of rare wood', pounds: 1, source: COV },
      { id: 'gold', name: 'A pound of gold', pounds: 10, source: COV },
    ],
  },
  {
    id: 'arms',
    label: 'Weapons and armor',
    note: 'Covenants: 1 £ per 32 points of equipment; full armor costs twice partial. A year of repair costs a tenth.',
    wares: [
      { id: 'armor-inexp', name: '16 sets of inexpensive armor (partial)', pounds: 1, source: COV },
      { id: 'armor-std', name: '4 sets of standard armor (partial)', pounds: 1, source: COV },
      { id: 'armor-exp', name: '1 set of expensive armor (partial)', pounds: 1, source: COV },
      { id: 'weapons-inexp', name: '32 inexpensive weapons', pounds: 1, source: COV },
      { id: 'weapons-std', name: '8 standard weapons', pounds: 1, source: COV },
      { id: 'weapons-exp', name: '2 expensive weapons', pounds: 1, source: COV },
      { id: 'siege', name: '2 ballistas or light catapults, or a trebuchet', pounds: 1, source: COV },
      { id: 'chainmail', name: 'Chainmail, full', pounds: 2, scales: true, source: CG },
      { id: 'long-sword', name: 'Long sword', pounds: 0.5, scales: true, source: CG },
      { id: 'longbow', name: 'Longbow', pounds: 0.75, scales: true, source: CG },
    ],
  },
  {
    id: 'travel',
    label: 'Vehicles and boats',
    wares: [
      { id: 'wagons', name: '12 wagons, or a coach', pounds: 1, source: COV },
      { id: 'boats', name: '12 small fishing boats', pounds: 1, source: COV },
      { id: 'barge', name: 'Barge', pounds: 2, source: COV },
      { id: 'ship', name: 'Ship', pounds: 8, source: COV },
    ],
  },
  {
    id: 'goods',
    label: 'Everyday goods',
    note: 'City & Guild prices for a single item; shoddy ×½, superior ×2, excellent ×5.',
    wares: [
      { id: 'mundane-book', name: 'A standard book (non-Hermetic)', pounds: 1, source: COV },
      { id: 'chest', name: 'Chest with lock', pounds: 2.5, scales: true, source: CG },
      { id: 'house-urban', name: 'House in town', pounds: 5, scales: true, source: CG },
      { id: 'house-lux', name: 'Luxurious house', pounds: 50, scales: true, source: CG },
      { id: 'tunic', name: 'Wool tunic', pounds: 0.25, scales: true, source: CG },
      { id: 'tunic-fur', name: 'Fur-lined tunic', pounds: 0.65, scales: true, source: CG },
      { id: 'shoes', name: 'Pair of shoes', pounds: 0.05, scales: true, source: CG },
    ],
  },
];

/** Covenants: shoddy / small ×½, standard ×1, superior / large ×2, excellent / huge ×5, flawless / stupendous ×10. */
export const QUALITY: { id: string; label: string; mult: number }[] = [
  { id: 'shoddy', label: 'Shoddy / small', mult: 0.5 },
  { id: 'standard', label: 'Standard', mult: 1 },
  { id: 'superior', label: 'Superior / large', mult: 2 },
  { id: 'excellent', label: 'Excellent / huge', mult: 5 },
  { id: 'flawless', label: 'Flawless / stupendous', mult: 10 },
];

/** Why vis costs what it does (Covenants ch.5, Vis and Silver). */
export const VIS_PRICE = {
  low: 2,
  typical: 10,
  high: 100,
  reasons: [
    'Where: vis is cheaper where it is plentiful, and dear where covenants are poor in it.',
    'The Art: a sought-after Art (Creo, Vim, Corpus) costs more than one few need.',
    'Who sells: wealthy covenants would not sell a pawn for under a hundred pounds; poor ones can spare only a few pounds to buy.',
    'Supply: how much vis the saga has against its other Hermetic goods.',
    'House Mercere takes a practical view of the two currencies (Houses of Hermes: True Lineages).',
  ],
  dedicated: 'Dedicated vis works as two pawns for its own Technique + Form: about half again the price.',
} as const;

/** Hermetic books (Covenants ch.7, Prices for Books), in pawns of vis under the Cow and Calf Oath. */
export function bookVisPrice(kind: 'summa' | 'tractatus', level: number, tier: 'damaged' | 'vain' | 'sound', now: boolean): number {
  // a damaged summa about a pawn; sound tractatus about two pawns to order, three for the impatient; vain ones about a pawn
  if (tier === 'damaged') return 1;
  if (kind === 'tractatus') return tier === 'vain' ? 1 : now ? 3 : 2;
  const base = tier === 'vain' ? Math.ceil(level / 2) : level;
  return now ? Math.ceil(base * 1.2) : base;
}

// ------------------------------------------------------------------------------ Buying and selling

/** Who pays: a covenant's treasury and stocks, or a character's purse. */
export type Payer = { kind: 'covenant'; cov: Covenant } | { kind: 'character'; c: Character };
export interface When {
  year: number;
  season: Season;
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;
export const fundsOf = (p: Payer) => (p.kind === 'covenant' ? p.cov.finances.treasury : purseOf(p.c).pounds);
export const stocksOf = (p: Payer) => (p.kind === 'covenant' ? p.cov.visStocks : purseOf(p.c).vis);
export const payerName = (p: Payer) => (p.kind === 'covenant' ? p.cov.name || 'The covenant' : p.c.name || 'Unnamed');

/** Note a change of pounds or vis in the covenant's chronicle or the character's purse. */
function record(p: Payer, text: string, when: When, pounds?: number, vis?: VisStock[]): void {
  const v = vis?.length ? vis : undefined;
  if (p.kind === 'covenant') p.cov.log.push({ uid: uid(), year: when.year, season: when.season, text, ...(pounds ? { treasuryDelta: pounds } : {}), ...(v ? { visDelta: v } : {}) });
  else (purseOf(p.c).log ??= []).push({ year: when.year, season: when.season, text, ...(pounds ? { pounds } : {}), ...(v ? { vis: v } : {}) });
}

/**
 * Pay pounds now, from the treasury or the purse; a covenant may instead put it on this year's Sundry,
 * paid when the year closes. Returns an error, or nothing when paid.
 */
export function pay(p: Payer, pounds: number, text: string, when: When, onSundry = false): string | undefined {
  pounds = round3(pounds);
  if (pounds <= 0) return undefined;
  if (p.kind === 'covenant' && onSundry) {
    p.cov.finances.sundry = round3(p.cov.finances.sundry + pounds);
    record(p, `${text}: ${lsd(pounds)} on this year's Sundry.`, when);
    return undefined;
  }
  const have = fundsOf(p);
  if (have < pounds) return `${payerName(p)} has only ${lsd(have)}; this costs ${lsd(pounds)}.`;
  if (p.kind === 'covenant') p.cov.finances.treasury = round3(p.cov.finances.treasury - pounds);
  else purseOf(p.c).pounds = round3(purseOf(p.c).pounds - pounds);
  record(p, `${text}: ${lsd(pounds)}.`, when, -pounds);
  return undefined;
}

function receive(p: Payer, pounds: number, text: string, when: When, vis?: VisStock[]): void {
  pounds = round3(pounds);
  if (p.kind === 'covenant') p.cov.finances.treasury = round3(p.cov.finances.treasury + pounds);
  else purseOf(p.c).pounds = round3(purseOf(p.c).pounds + pounds);
  record(p, text, when, pounds, vis);
}

export const wareLabel = (w: Ware, mult = 1, qty = 1) => `${w.name}${w.scales && mult !== 1 ? ` (${QUALITY.find((q) => q.mult === mult)?.label.toLowerCase() ?? `×${mult}`})` : ''}${qty > 1 ? ` ×${qty}` : ''}`;

/** Buy something from the price list. Outfitting a laboratory adds an empty one to the covenant. */
export function buyWare(p: Payer, cov: Covenant | undefined, w: Ware, mult: number, qty: number, when: When, onSundry = false): string | undefined {
  const pounds = w.pounds * (w.scales ? mult : 1) * qty;
  const err = pay(p, pounds, `Bought ${wareLabel(w, mult, qty)}`, when, onSundry);
  if (err) return err;
  if (w.id === 'lab-outfit' && cov) {
    for (let i = 0; i < qty; i++) cov.labs.push(newLab(p.kind === 'character' ? `${p.c.name || 'New'}'s laboratory` : 'New laboratory', p.kind === 'character' ? p.c.id : undefined));
  }
  return undefined;
}

/** Vis bought for silver at a price per pawn. */
export function buyVis(p: Payer, art: Art, pawns: number, each: number, when: When, pair?: Art, onSundry = false): string | undefined {
  if (pawns <= 0) return 'Nothing to buy.';
  const err = pay(p, pawns * each, `Bought ${pawns} pawn${pawns > 1 ? 's' : ''} of ${visLabel({ art, pair })} vis at ${lsd(each)} each`, when, onSundry);
  if (err) return err;
  addVis(stocksOf(p), art, pawns, pair);
  if (p.kind === 'covenant') p.cov.log[p.cov.log.length - 1].visDelta = [{ art, pawns, ...(pair ? { pair } : {}) }];
  else {
    const log = purseOf(p.c).log!;
    log[log.length - 1].vis = [{ art, pawns, ...(pair ? { pair } : {}) }];
  }
  return undefined;
}

/** Vis sold for silver. */
export function sellVis(p: Payer, art: Art, pawns: number, each: number, when: When, pair?: Art): string | undefined {
  if (pawns <= 0) return 'Nothing to sell.';
  const stocks = stocksOf(p);
  const s = stocks.find((x) => x.art === art && x.pair === pair);
  if (!s || s.pawns < pawns) return `${payerName(p)} has only ${s?.pawns ?? 0} pawns of ${visLabel({ art, pair })} vis.`;
  s.pawns -= pawns;
  if (s.pawns <= 0) stocks.splice(stocks.indexOf(s), 1);
  receive(p, pawns * each, `Sold ${pawns} pawn${pawns > 1 ? 's' : ''} of ${visLabel({ art, pair })} vis at ${lsd(each)} each: ${lsd(pawns * each)}.`, when, [{ art, pawns: -pawns, ...(pair ? { pair } : {}) }]);
  return undefined;
}

export type BookPayment = { vis: number; arts: Art[] } | { pounds: number; onSundry?: boolean };

/** A Hermetic book bought (for vis, or silver at the vis price) into the covenant's library; a member's own copy keeps their name. */
export function buyBook(p: Payer, library: Covenant, book: LibraryBook, price: BookPayment, when: When): string | undefined {
  const what = `${book.title || 'a book'}${p.kind === 'character' ? ' (own copy)' : ''}`;
  if ('vis' in price) {
    if (price.vis > 0) {
      const r = takeVis(stocksOf(p), price.arts, price.vis);
      if (!r.ok) return `${payerName(p)} has not ${price.vis} pawns of ${price.arts.length === 1 ? visLabel({ art: price.arts[0] }) : 'plain'} vis to pay with.`;
      record(p, `Bought ${what} for ${visText(r.taken)} vis.`, when, undefined, r.taken.map((v) => ({ ...v, pawns: -v.pawns })));
    }
  } else {
    const err = pay(p, price.pounds, `Bought ${what}`, when, price.onSundry);
    if (err) return err;
  }
  library.library.push({ ...book, ...(p.kind === 'character' ? { ownerId: p.c.id } : {}) });
  return undefined;
}

/** People who join the covenant for good: they cost inhabitant points, and so pounds, every year from now on. */
export function hireFolk(cov: Covenant, key: keyof CovenfolkCounts, n: number, label: string, when: When): void {
  cov.covenfolk[key] = Math.max(0, cov.covenfolk[key] + n);
  cov.log.push({ uid: uid(), year: when.year, season: when.season, text: n > 0 ? `${n} ${label} joined the covenant.` : `${-n} ${label} left the covenant.` });
}

/** Wages a year (Covenants ch.5): skilled 2 £ (two pence a day), a master 5 £; half that to recruit for teaching. */
export const TEACHER_FEE = { skilled: 1, master: 2.5 } as const;

/** An outside teacher paid for a number of years of teaching (two seasons a year): not an inhabitant; leaves when the time is up. */
export function hireTeacher(p: Payer, cov: Covenant, teacher: Specialist, fee: number, years: number, when: When, onSundry = false): string | undefined {
  const err = pay(p, fee * years, `Hired ${teacher.name || 'a teacher'} to teach for ${years} year${years > 1 ? 's' : ''}`, when, onSundry);
  if (err) return err;
  cov.specialists.push({ ...teacher, role: 'teacher', free: true, hired: { until: when.year + years - 1, fee } });
  return undefined;
}

/** Pounds and vis from one to another: the treasury, or a member's purse. */
export function transfer(from: Payer, to: Payer, pounds: number, vis: { art: Art; pair?: Art; pawns: number } | undefined, why: string, when: When): string | undefined {
  if (pounds <= 0 && !vis?.pawns) return 'Nothing to move.';
  if (pounds > fundsOf(from)) return `${payerName(from)} has only ${lsd(fundsOf(from))}.`;
  if (vis?.pawns) {
    const err = moveVis(stocksOf(from), stocksOf(to), vis.art, vis.pawns, vis.pair);
    if (err) return `${payerName(from)}: ${err}`;
  }
  const v = vis?.pawns ? { art: vis.art, pawns: vis.pawns, ...(vis.pair ? { pair: vis.pair } : {}) } : undefined;
  const what = [pounds > 0 && lsd(pounds), v && visText([v])].filter(Boolean).join(' and ');
  if (pounds > 0) {
    if (from.kind === 'covenant') from.cov.finances.treasury = round3(from.cov.finances.treasury - pounds);
    else purseOf(from.c).pounds = round3(purseOf(from.c).pounds - pounds);
    if (to.kind === 'covenant') to.cov.finances.treasury = round3(to.cov.finances.treasury + pounds);
    else purseOf(to.c).pounds = round3(purseOf(to.c).pounds + pounds);
  }
  const note = why ? ` (${why})` : '';
  record(from, `Gave ${what} to ${payerName(to)}${note}.`, when, pounds > 0 ? -pounds : undefined, v ? [{ ...v, pawns: -v.pawns }] : undefined);
  record(to, `Received ${what} from ${payerName(from)}${note}.`, when, pounds > 0 ? pounds : undefined, v ? [v] : undefined);
  return undefined;
}
