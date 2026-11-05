// What a Tribunal book's covenant was built with, by the same rules as the players' covenant
// (Covenants ch.2): Build Points for its library, vis, enchanted items, specialists and money, from
// what the book says of its holdings, how many magi it has and how old it is, within the power level
// its age allows (the minimum age of each level). Calibrated on the DE base packages (DE p.178: 200
// Build Points for a Spring covenant, 800 for early Summer, 2,000 for high Summer or a weak Autumn
// covenant) and the core rules' vis per magus (DE p.218: low vis up to 5 pawns a magus a year,
// moderate about 10, high about 20). Each covenant varies a little with its seed.

import type { BookCovenant } from '../data/livingCovenants';
import type { Rng } from './dice';
import { POWER_LEVELS } from './covenant';
import type { BudgetKind, PowerLevel } from './types';

/** Its library's Build Points for six magi of a covenant of a century and a half: the base packages' books and texts, more for a famous library. */
const LIBRARY: Record<BookCovenant['library'], number> = { poor: 80, modest: 220, good: 450, great: 800 };
/** Vis sources a magus a year, the core rules' saga levels (DE p.218): scarce is low vis (5), some moderate (about 10), rich between, very rich high (20). */
export const VIS_PER_MAGUS: Record<BookCovenant['vis'], number> = { scarce: 5, some: 10, rich: 14, 'very rich': 20 };
/** No covenant has less than low vis or more than high, whatever its seed. */
export const VIS_RANGE = { min: 5, max: 20 };
/** Levels of enchanted devices a magus (the Medium package has 200 for its young magi, the Powerful 500). */
const ITEM_LEVELS: Record<BookCovenant['wealth'], number> = { poor: 6, modest: 15, comfortable: 25, rich: 35, 'very rich': 45 };

export interface LivingBudget {
  age: number;
  /** the highest power level its age allows */
  ageCap: PowerLevel;
  level: PowerLevel;
  total: number;
  budget: Record<Exclude<BudgetKind, 'lab'>, number>;
  /** vis sources a year, and what a magus has of them */
  visPerYear: number;
  visPerMagus: number;
  itemLevels: number;
  /** what was reckoned, for the build's log */
  text: string;
}

const bandOf = (bp: number) => POWER_LEVELS.find((p) => bp >= p.min && bp < p.max) ?? POWER_LEVELS[POWER_LEVELS.length - 1];

/** The power level whose Build Point range holds this total. */
export const powerLevelFor = (bp: number): PowerLevel => bandOf(bp).level;

/** The highest power level a covenant of this age may be (Covenants ch.2: each level's minimum age). */
export const powerLevelForAge = (age: number): PowerLevel => [...POWER_LEVELS].reverse().find((p) => age >= p.minAge)!.level;

export function livingBudget(def: BookCovenant, magi: number, year: number, rng: Rng): LivingBudget {
  const age = Math.max(0, year - def.founded);
  const ageCap = powerLevelForAge(age);
  const vary = () => 0.85 + rng() * 0.3;
  // older covenants have gathered more: half as much as the reckoning at founding, half again by four or five centuries
  const old = Math.min(1.5, Math.max(0.5, 0.5 + age / 300));
  const size = 0.6 + magi / 10;
  const domus = def.domusMagna ? 1.25 : 1;
  const book = Math.round(LIBRARY[def.library] * size * old * domus * vary());
  const rate = Math.min(VIS_RANGE.max, Math.max(VIS_RANGE.min, VIS_PER_MAGUS[def.vis] * vary()));
  const visPerYear = Math.max(1, Math.round(rate * Math.max(1, magi)));
  // sources at 5 Build Points a pawn a year, and a year's worth in store at 5 pawns a point (Covenants ch.2)
  const vis = visPerYear * 5 + Math.ceil(visPerYear / 5);
  const itemLevels = Math.round(ITEM_LEVELS[def.wealth] * magi * old * domus * vary());
  const item = Math.ceil(itemLevels / 5) * 2;
  // staff and craftsmen as the fill-out hires them, and a treasury: what is left of these goes to money
  const specialist = Math.round((40 + 10 * magi) * vary());
  const money = Math.round((10 + 4 * magi) * ({ poor: 0.5, modest: 1, comfortable: 1.5, rich: 2.5, 'very rich': 4 }[def.wealth]));
  let budget = { book, vis, item, specialist, money };
  let total = Object.values(budget).reduce((t, n) => t + n, 0);
  // no more than its age allows: everything scaled down to fit
  const cap = POWER_LEVELS.find((p) => p.level === ageCap)!;
  let capped = false;
  if (total > cap.max) {
    const k = (cap.max * 0.95) / total;
    budget = Object.fromEntries(Object.entries(budget).map(([kk, n]) => [kk, Math.floor(n * k)])) as typeof budget;
    total = Object.values(budget).reduce((t, n) => t + n, 0);
    capped = true;
  }
  const level = def.greatLibrary ? 'Legendary' : powerLevelFor(total);
  // what the vis and item Build Points buy, after any scaling
  const pawns = capped ? Math.max(VIS_RANGE.min * Math.max(1, magi), Math.floor(budget.vis / 5.2)) : visPerYear;
  const levels = capped ? Math.floor(budget.item * 2.5) : itemLevels;
  const perMagus = Math.round((pawns / Math.max(1, magi)) * 10) / 10;
  return {
    age, ageCap, level, total, budget, visPerYear: pawns, visPerMagus: perMagus, itemLevels: levels,
    text:
      `${age} years old (at most ${ageCap} for its age), ${magi} magi, a ${def.library} library, ${def.vis} in vis, ${def.wealth}: ` +
      `about ${total} Build Points, a ${level} covenant${capped ? ` (scaled down to what a ${ageCap} covenant may have)` : ''}. ` +
      `Library ${budget.book}, vis ${budget.vis} (${pawns} pawns a year, about ${perMagus} a magus), enchanted items ${budget.item}, specialists ${budget.specialist}, money ${budget.money}.`,
  };
}
