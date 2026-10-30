// The covenant's year in play (Covenants ch.4 and ch.5): closing the books at the end of a year,
// rolling the Income Modification table, the loyalty events of the year, and vis source yields.

import { INCOME_MODIFICATIONS, receivedAfterTithe, miracleMultiplierOf, mechanicOf } from './covenantRules';
import { defaultRng, stressDie, type Rng } from './dice';
import { visLabel, type DerivedCovenant } from './covenant';
import { keepsFeastCycle } from './covenfolk';
import type { Covenant, IncomeModification, VisStock } from './types';
import { uid } from '../util/id';

// ------------------------------------------------------------------------------ Income Modification

/** Roll the Income Modification table (Covenants ch.5): a stress die, botch Slump … 20+ Boom. */
export function rollIncomeModification(rng: Rng = defaultRng): { id: IncomeModification; roll: string } {
  const r = stressDie(1, rng);
  if (r.botches) return { id: 'Slump', roll: 'botch' };
  const v = r.value;
  const id: IncomeModification = v >= 20 ? 'Boom' : v >= 10 ? 'Expansion' : v === 9 ? 'Growth' : v >= 3 ? 'Status Quo' : v === 2 ? 'Stagnation' : 'Contraction';
  return { id, roll: String(v) };
}

// ------------------------------------------------------------------------------ Year end

export interface YearEndOptions {
  /** each source's change this year lasts (the book: "usually permanent") */
  permanentIncome: boolean;
  /** inflation rises by 1 pound per 100 pounds of expenditure, unless expenditure fell */
  inflation: boolean;
  /** the year's vis is gathered into the stores */
  harvestVis: boolean;
  /** vis sources not gathered this year (a contested source lost, a story not told) */
  skipVis: string[];
  /** sundry expenses are one-off: clear them for the new year */
  clearSundry: boolean;
}

export const DEFAULT_YEAR_END: YearEndOptions = { permanentIncome: true, inflation: true, harvestVis: true, skipVis: [], clearSundry: true };

export interface YearEndPlan {
  income: number;
  expenditure: number;
  balance: number;
  treasuryAfter: number;
  inflationRise: number;
  /** sources whose change this year becomes lasting */
  incomeChanges: { uid: string; name: string; modification: IncomeModification; mult: number }[];
  vis: VisStock[];
  familiarity: boolean;
  /** a regular cycle of four or more feast days: a loyalty point a year */
  feasts: boolean;
  lines: string[];
}

/** What closing the year would do, without doing it. */
export function planYearEnd(cov: Covenant, dc: DerivedCovenant, o: YearEndOptions = DEFAULT_YEAR_END): YearEndPlan {
  const f = dc.finances;
  const income = f.income;
  const expenditure = f.totalExpenditure;
  const balance = f.balance;
  const lines: string[] = [`Income ${income} £, expenditure ${expenditure} £: ${balance >= 0 ? 'a surplus of' : 'a shortfall of'} ${Math.abs(balance)} £.`];
  const treasuryAfter = Math.round((cov.finances.treasury + balance) * 10) / 10;
  if (treasuryAfter < 0) lines.push(`The treasury would be ${treasuryAfter} £: cut costs (Emergency Savings: perks, wages, lay-offs or neglect, each costing Loyalty) or find income.`);
  const fell = cov.finances.lastExpenditure !== undefined && expenditure < cov.finances.lastExpenditure;
  const inflationRise = o.inflation && !fell ? Math.round(expenditure / 100) : 0;
  if (o.inflation) lines.push(fell ? 'Expenditure fell this year, so inflation does not rise.' : `Inflation rises by ${inflationRise} £ (1 £ per 100 £ of expenditure).`);
  else if (cov.finances.inflation > 0) lines.push(`Inflation is off in this saga: the ${cov.finances.inflation} £ a year already counted stays in the spending until it is cleared (Covenfolk & Finances).`);
  const incomeChanges = o.permanentIncome
    ? cov.income
        .filter((s) => s.modification && s.modification !== 'Status Quo')
        .map((s) => ({ uid: s.uid, name: s.name, modification: s.modification!, mult: INCOME_MODIFICATIONS.find((m) => m.id === s.modification)?.mult ?? 1 }))
    : [];
  for (const c of incomeChanges) lines.push(`${c.name}: ${c.modification} (×${c.mult}) lasts into the coming years.`);
  const vis: VisStock[] = [];
  if (o.harvestVis) {
    const mult = miracleMultiplierOf(cov);
    const miracles = cov.hooksBoons.some((h) => mechanicOf(h) === 'tithing-miracles');
    for (const s of cov.visSources) {
      if (o.skipVis.includes(s.uid) || dc.unreal.has(s.uid)) continue;
      const got = receivedAfterTithe(s.pawnsPerYear, !!s.tithed, !!s.miracle && miracles, mult).received;
      if (!got) continue;
      const pair = s.dedicated ? s.pair : undefined;
      const v = vis.find((x) => x.art === s.art && x.pair === pair);
      if (v) v.pawns += got;
      else vis.push(pair ? { art: s.art, pawns: got, pair } : { art: s.art, pawns: got });
    }
    if (vis.length) lines.push(`Vis gathered: ${vis.map((v) => `${v.pawns} ${visLabel(v)}`).join(', ')}.`);
  }
  lines.push('A year of Familiarity: +2 loyalty points, up to the Gift penalty.');
  const feasts = keepsFeastCycle(cov);
  if (feasts) lines.push('A year of feast days kept: +1 loyalty point (Covenants ch.4).');
  return { income, expenditure, balance, treasuryAfter, inflationRise, incomeChanges, vis, familiarity: true, feasts, lines };
}

/** Close the year: apply the plan to the covenant and record it in the chronicle. */
export function applyYearEnd(cov: Covenant, plan: YearEndPlan, year: number, o: YearEndOptions = DEFAULT_YEAR_END): void {
  const f = cov.finances;
  f.treasury = plan.treasuryAfter;
  f.inflation = Math.round((f.inflation + plan.inflationRise) * 10) / 10;
  f.lastExpenditure = plan.expenditure;
  for (const c of plan.incomeChanges) {
    const s = cov.income.find((x) => x.uid === c.uid);
    if (s) s.factor = Math.round((s.factor ?? 1) * c.mult * 1000) / 1000;
  }
  // the coming year starts at Status Quo
  for (const s of cov.income) if (s.modification) s.modification = 'Status Quo';
  // the stocks the covenant was founded with keep their Build Points; the year's vis is free
  if (!cov.startingVisStocks) cov.startingVisStocks = structuredClone(cov.visStocks);
  for (const v of plan.vis) {
    const st = cov.visStocks.find((x) => x.art === v.art && x.pair === v.pair);
    if (st) st.pawns += v.pawns;
    else cov.visStocks.push({ ...v });
  }
  cov.loyalty.yearsFounded = (cov.loyalty.yearsFounded ?? 0) + 1;
  if (plan.feasts) cov.loyalty.actionPoints += 1;
  if (o.clearSundry) {
    // older covenants kept the Pound of Enumerus in sundry: it becomes its own line
    if (f.enumerus === undefined) f.enumerus = true;
    f.sundry = 0;
  }
  cov.log.push({ uid: uid(), year, text: `Year closed. ${plan.lines.join(' ')}`, treasuryDelta: plan.balance, visDelta: plan.vis.length ? plan.vis : undefined });
}

// ------------------------------------------------------------------------------ Loyalty events

/** Example Loyalty Point Penalties (DE, Covenant Loyalty; Covenants ch.4), by severity. */
export const LOYALTY_SEVERITY = [1, 3, 6, 9, 12, 15] as const;
export const LOYALTY_EVENTS: { id: string; label: string; kind: 'penalty' | 'gain'; levels?: string[]; fixed?: number; hint: string }[] = [
  { id: 'attitude', label: 'Attitude of a magus', kind: 'penalty', levels: ['Rudeness', 'Oblivious', 'Malicious', 'Callous disregard', 'Deliberate cruelty', 'Heinous malfeasance'], hint: 'Per magus, the worst behaviour only.' },
  { id: 'punishment', label: 'Punishment ordered by a magus', kind: 'penalty', levels: ['Minor humiliation', 'Public humiliation', 'Restraint', 'Infliction of pain', 'Brutal punishment', 'Brutal punishment clearly enjoyed'], hint: 'Add the victim\'s Reputation if dearly loved; just punishment costs nothing while loyalty is positive.' },
  { id: 'wound', label: 'Wound dealt by a magus', kind: 'penalty', levels: ['Superficial', 'Light', 'Medium', 'Heavy', 'Incapacitating', 'Death'], hint: 'One level worse if by magic; half for an accident to a grog defending the covenant.' },
  { id: 'local', label: 'Local event (the magi are blamed)', kind: 'penalty', levels: ['Minor hardship', 'Severe hardship', 'Tragic event', 'Prolonged hardship', 'Widespread hardship', 'Devastating event'], hint: 'Lasts until the magi help resolve it.' },
  { id: 'altruism', label: 'Altruism: a magus heals or shields covenfolk', kind: 'gain', levels: ['Superficial', 'Light', 'Medium', 'Heavy', 'Incapacitating', 'Death'], hint: 'As the wound penalty; one level more with conspicuous magic.' },
  { id: 'good', label: 'Good fortune the magi clearly caused', kind: 'gain', levels: ['Minor', 'Severe', 'Tragic', 'Prolonged', 'Widespread', 'Devastating'], hint: 'As the penalty the opposite event would have cost.' },
  { id: 'celebration', label: 'A celebration after a notable event', kind: 'gain', fixed: 1, hint: 'One loyalty point.' },
  { id: 'feasts', label: 'A year of feast days (four or more)', kind: 'gain', fixed: 1, hint: 'One point a year; it costs the covenant wealth.' },
  { id: 'refugees', label: 'Taking in refugees from another covenant', kind: 'penalty', fixed: 3, hint: 'As a Severe Hardship, reduced by stories bringing the communities together (Grogs).' },
];

/** Loyalty points for an event: its severity (0-5, one level worse for magic), or its fixed value; negative for a penalty. */
export function loyaltyEventPoints(id: string, level: number, byMagic = false): number {
  const e = LOYALTY_EVENTS.find((x) => x.id === id);
  if (!e) return 0;
  const n = e.fixed ?? LOYALTY_SEVERITY[Math.min(5, Math.max(0, level + (byMagic ? 1 : 0)))];
  return e.kind === 'penalty' ? -n : n;
}

/** Sample Prevailing Loyalty Scores (DE): what the covenfolk's mood looks like at a score. */
export const LOYALTY_ATTITUDES: [number, string][] = [
  [-6, 'Deeply unhappy, close to revolt; they stay only from fear, and may complain to nobles or clergy of dark magic. Productivity (cost savings and income from covenfolk) is halved.'],
  [-4, 'Not happy, but self-interest keeps them; they do not expect their masters to help them.'],
  [-2, 'They will not betray their masters under most circumstances, unless offered an inducement; still wary of the magi.'],
  [0, 'Moderately content: they have learned to ignore The Gift and treat the magi as gentry.'],
  [2, 'Unusually loyal: close-mouthed with strangers, resisting most inducements to betray.'],
  [4, 'The magi are staunch friends or benevolent rulers, treated like close family.'],
  [6, 'They go to extraordinary lengths, even laying down their lives; productivity rises with their zeal.'],
];

export function loyaltyAttitude(score: number): string {
  const s = Math.max(-6, Math.min(6, score));
  return LOYALTY_ATTITUDES.reduce((best, a) => (Math.abs(a[0] - s) < Math.abs(best[0] - s) || (Math.abs(a[0] - s) === Math.abs(best[0] - s) && Math.abs(a[0]) < Math.abs(best[0])) ? a : best))[1];
}

// ------------------------------------------------------------------------------ Vis source yields

/** Vis Source Yields (Covenants ch.6): pawns a year by the saga's vis level and the source's yield. */
export const VIS_YIELDS: Record<'Low' | 'Moderate' | 'High', Record<'low' | 'moderate' | 'high', number>> = {
  Low: { low: 1, moderate: 2, high: 4 },
  Moderate: { low: 2, moderate: 4, high: 8 },
  High: { low: 4, moderate: 8, high: 16 },
};

// ------------------------------------------------------------------------------ One-off spending

/** Sundry expenses with a book figure (Covenants ch.5, Sundry Expenses). */
export const SUNDRY_PRESETS: { id: string; label: string; pounds: number; hint: string }[] = [
  { id: 'redcap', label: 'A Redcap visit, wined and dined', pounds: 0.5, hint: 'The fee is 30 pennies (⅛ £); the stay usually costs three or four times that.' },
  { id: 'redcap-fee', label: "A Redcap's fee only", pounds: 0.125, hint: '30 silver pennies.' },
  { id: 'book', label: 'A mundane book from a stationer', pounds: 1, hint: 'Standard texts in any large city; rarer ones take a season.' },
  { id: 'book-paper', label: 'A cheap unbound paper copy', pounds: 0.5, hint: 'Half a pound.' },
  { id: 'resonant', label: 'Resonant materials for a book', pounds: 1, hint: 'One pound per book (+1 Quality under the extended rules).' },
  { id: 'hut', label: 'A new building for covenfolk (per inhabitant point)', pounds: 1, hint: 'A building costs the points of inhabitants it houses: a magus\'s house 5 £ (Spring) or 10 £ (Summer/Autumn). One year per floor; half the time for 50% more.' },
];

/** The cost of outfitting a laboratory from an unfurnished chamber, or of raising its points: 1 £ per 2 points. */
export const labOutfitCost = (points: number) => Math.round((points / 2) * 10) / 10;

// ------------------------------------------------------------------------------ Book prices

export type BookTier = 'damaged' | 'vain' | 'sound' | 'excellent';

/** Prices for Books (Covenants ch.7), in pawns of vis, under the Cow and Calf Oath. */
export function bookPrice(kind: 'summa' | 'tractatus', level: number, tier: BookTier): string {
  if (tier === 'excellent') return 'rarely for sale: given for exceptional service, or traded for vis sources';
  if (tier === 'damaged') return kind === 'summa' ? 'about 1 pawn' : '3 to 9 to the pawn, after a library calamity';
  if (tier === 'vain') return kind === 'summa' ? `about ${Math.ceil(level / 2)} pawns (half the level), less from a flattered author` : 'about 1 pawn';
  return kind === 'summa'
    ? `${level} pawns (the level) to wait a season for a copy; up to ${Math.ceil(level * 1.2)} for a spare copy now`
    : '2 pawns to order, 3 for a spare copy now';
}

/**
 * Where a covenant's accounts are heading if nothing changes: its spending grows each year by the
 * inflation it brings (1 £ per 100 £ spent), its income stays. The years until it runs at a loss and
 * until its treasury is spent, within fifty (0: already).
 */
export function accountsForecast(treasury: number, income: number, expenditure: number): { lossIn?: number; emptyIn?: number } {
  let t = treasury;
  let exp = expenditure;
  let lossIn: number | undefined;
  let emptyIn: number | undefined;
  for (let y = 0; y <= 50 && (lossIn === undefined || emptyIn === undefined); y++) {
    const balance = income - exp;
    if (lossIn === undefined && balance < 0) lossIn = y;
    t += balance;
    if (emptyIn === undefined && t < 0) emptyIn = y;
    exp += Math.round(exp / 100);
  }
  return { lossIn, emptyIn };
}
