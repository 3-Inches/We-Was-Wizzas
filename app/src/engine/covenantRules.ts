// Covenant rules tables and Boon/Hook mechanics (Covenants ch.2 Boons & Hooks, ch.5 Wealth & Poverty;
// DE covenant creation).

import type { HookBoonDef } from '../data';
import type { Covenant, CovenantHookBoon, IncomeModification, IncomeSource, Specialist } from './types';

// ------------------------------------------------------------------------------ Income

/** Source of Income categories (Covenants ch.5). */
export const INCOME_LEVEL_POUNDS: Record<IncomeSource['level'], number> = { None: 0, Lesser: 40, Typical: 100, Greater: 250, Legendary: 1000 };
export const INCOME_LEVELS: IncomeSource['level'][] = ['None', 'Lesser', 'Typical', 'Greater', 'Legendary'];

/** Income Modification table (Covenants ch.5). */
export const INCOME_MODIFICATIONS: { id: IncomeModification; mult: number }[] = [
  { id: 'Slump', mult: 0.5 },
  { id: 'Contraction', mult: 0.8 },
  { id: 'Stagnation', mult: 0.95 },
  { id: 'Status Quo', mult: 1 },
  { id: 'Growth', mult: 1.05 },
  { id: 'Expansion', mult: 1.2 },
  { id: 'Boom', mult: 1.5 },
];

/** Sources of Income (Covenants ch.5), with a one-line reminder of each. */
export const INCOME_TYPES: { id: string; blurb: string; needsRight?: boolean }[] = [
  { id: 'Agriculture', blurb: 'Farmland and the villages that work it; stable, close at hand, at the mercy of weather and blight.' },
  { id: 'Charity', blurb: 'Gifts from a noble, merchant, gild, covenant or the Church; lasts while the donor is alive, solvent and friendly.' },
  { id: 'Crime', blurb: 'Banditry, piracy, smuggling, blackmail…; pays well, but capture and the soul are at risk.' },
  { id: 'Fishing', blurb: 'Boats and nets on river, lake or sea, or whaling; storms wreck boats.' },
  { id: 'Forestry', blurb: 'Timber, furs or game; discreet, but may trespass on the rights of mundane or faerie lords.', needsRight: true },
  { id: 'Hospitality', blurb: 'Inns, taverns, breweries, hospitals or brothels; needs a trusted manager if it is away from the covenant.' },
  { id: 'Livestock', blurb: 'Herds for sale, hides or wool (or parchment); less labor than crops, but pestilence strikes.' },
  { id: 'Manufacturing', blurb: 'Craftsmen making goods to sell, from cloth to weapons to glassware; may draw the ire of rival producers.' },
  { id: 'Mining', blurb: 'Ore, salt, coal, stone, or rarely silver, gold or gems; stable, but envied by nobles.' },
  { id: 'Money', blurb: 'Moneylending, banking, money-changing or pawnbroking; usury is a sin, and debts go bad.' },
  { id: 'Service', blurb: 'Hiring out skilled covenfolk or companions; work comes and goes.' },
  { id: 'Toll-Gathering', blurb: 'Tolls at a bridge, ford, pass or gate; needs a right from the lord, and enforcement.', needsRight: true },
  { id: 'Trade', blurb: 'Carrying goods from where they are cheap to where they are dear; competition, bandits, shipwreck.' },
  { id: 'Wizardry', blurb: 'Selling magic, items or potions discreetly; other magi look down on it, and Quaesitores look closely.' },
  { id: 'Other', blurb: 'Anything else the troupe agrees on.' },
];

// ------------------------------------------------------------------------------ Craftsmen

export type CostCategory = 'Buildings' | 'Consumables' | 'Laboratories' | 'Provisions' | 'Weapons and Armor' | 'Writing Materials';

/** Cost Saving Limits by Craft (Covenants ch.5): the share of a category one craft can save. */
export const CATEGORY_LIMIT: Record<CostCategory, number> = {
  Buildings: 0.5, Consumables: 0.2, Laboratories: 0.2, Provisions: 0.2, 'Weapons and Armor': 0.5, 'Writing Materials': 0.5,
};

export interface CraftDef {
  id: string;
  name: string;
  /** where the craft saves money, in the order its savings are applied */
  categories: CostCategory[];
  /** rare craftsmen save their full Craft score */
  rare: boolean;
  /** buys materials for books: 1 pound of Writing Materials each */
  writer?: boolean;
}

/**
 * The crafts named in the Cost Saving Limits by Craft table. A carpenter appears under both Buildings and
 * Consumables: what one saves fills the Buildings limit first and the rest goes to Consumables.
 */
export const CRAFTS: CraftDef[] = [
  { id: 'stonemason', name: 'Stonemason', categories: ['Buildings'], rare: false },
  { id: 'carpenter', name: 'Carpenter', categories: ['Buildings', 'Consumables'], rare: false },
  { id: 'furniture-maker', name: 'Furniture maker', categories: ['Buildings'], rare: false },
  { id: 'thatcher', name: 'Thatcher', categories: ['Buildings'], rare: false },
  { id: 'blacksmith', name: 'Blacksmith', categories: ['Consumables'], rare: false },
  { id: 'candlemaker', name: 'Candlemaker', categories: ['Consumables'], rare: false },
  { id: 'tinker', name: 'Tinker', categories: ['Consumables'], rare: false },
  { id: 'weaver', name: 'Weaver', categories: ['Consumables'], rare: false },
  { id: 'leatherworker', name: 'Leatherworker', categories: ['Consumables'], rare: false },
  { id: 'cooper', name: 'Cooper', categories: ['Consumables'], rare: false },
  { id: 'cobbler', name: 'Cobbler', categories: ['Consumables'], rare: false },
  { id: 'glassblower', name: 'Glassblower', categories: ['Laboratories'], rare: true },
  { id: 'goldsmith', name: 'Goldsmith', categories: ['Laboratories'], rare: true },
  { id: 'silversmith', name: 'Silversmith', categories: ['Laboratories'], rare: true },
  { id: 'lapidary', name: 'Lapidary', categories: ['Laboratories'], rare: true },
  { id: 'mechanic', name: 'Mechanic', categories: ['Laboratories'], rare: true },
  { id: 'toolmaker', name: 'Toolmaker', categories: ['Laboratories'], rare: false },
  { id: 'brewer', name: 'Brewer', categories: ['Provisions'], rare: false },
  { id: 'vintner', name: 'Vintner', categories: ['Provisions'], rare: false },
  { id: 'swordsmith', name: 'Swordsmith', categories: ['Weapons and Armor'], rare: false },
  { id: 'armorer', name: 'Armorer', categories: ['Weapons and Armor'], rare: false },
  { id: 'bowyer', name: 'Bowyer', categories: ['Weapons and Armor'], rare: false },
  { id: 'percamenarius', name: 'Percamenarius (parchment maker)', categories: ['Writing Materials'], rare: true },
  { id: 'ink-maker', name: 'Ink-maker', categories: ['Writing Materials'], rare: false },
  { id: 'bookbinder', name: 'Bookbinder', categories: [], rare: true, writer: true },
  { id: 'illuminator', name: 'Illuminator', categories: [], rare: true, writer: true },
];
export const CRAFT_BY_ID = new Map(CRAFTS.map((c) => [c.id, c]));

/** Matches a typed craft name ("Carpenters", "Glass-blower") to a craft. */
export function findCraft(name: string | undefined): CraftDef | undefined {
  if (!name) return undefined;
  const n = name.toLowerCase().replace(/^craft\s*[:(]?\s*/, '').replace(/[^a-z]/g, '');
  return CRAFTS.find((c) => {
    const k = c.name.toLowerCase().replace(/\(.*\)/, '').replace(/[^a-z]/g, '');
    return n === k || n === `${k}s` || n.startsWith(k) || (c.id === 'percamenarius' && /parchment/.test(n));
  });
}

/** The craft of a craftsman entry. */
export const craftOf = (s: Specialist): CraftDef | undefined => (s.role === 'craftsman' ? CRAFT_BY_ID.get(s.craft ?? '') ?? findCraft(s.craft ?? s.ability ?? s.name) : undefined);

/** Pounds a year one craftsman saves (Covenants ch.5): common 1 + Craft/2 (rounded down), rare the Craft score. */
export function craftsmanSaving(score: number, rare: boolean): number {
  return rare ? score : 1 + Math.floor(score / 2);
}

// ------------------------------------------------------------------------------ Specialists

/** The highest Ability score a character may start with (DE p.48). */
export function abilityCapAtAge(age: number): number {
  if (age < 30) return 5;
  if (age <= 35) return 6;
  if (age <= 40) return 7;
  if (age <= 45) return 8;
  return 9;
}

export const countOf = (s: Specialist) => Math.max(0, s.count ?? 1);

/** Build Points for a specialist entry (DE p.180): teachers Com + Teaching + score, others the score. */
export function specialistCost(s: Specialist): number {
  if (s.characterId || s.free) return 0;
  const each = s.role === 'teacher' ? (s.com ?? 0) + (s.teaching ?? 0) + s.score : s.score;
  return each * countOf(s);
}

// ------------------------------------------------------------------------------ Boons and Hooks

/** Whether a Minor Hook may be taken as Unknown: only those whose text says so. */
export function canBeUnknown(def: HookBoonDef | undefined): boolean {
  if (!def) return true; // a troupe's own Hook: their call
  return def.kind === 'hook' && def.size === 'Minor' && /(can|may) be (taken as )?unknown|hook can be unknown/i.test(def.deText ?? def.text);
}

export type HBMechanic =
  | 'wealth' | 'secondary-income' | 'poverty' | 'natural-disaster' | 'indebted' | 'right' | 'contested-resource'
  | 'hidden-resources' | 'flawed-resource' | 'illusory-resources' | 'exceptional-book' | 'tithing-miracles';

const MECHANIC_NAMES: [RegExp, HBMechanic][] = [
  [/^wealth$/i, 'wealth'],
  [/^secondary income$/i, 'secondary-income'],
  [/^poverty$/i, 'poverty'],
  [/^natural disaster$/i, 'natural-disaster'],
  [/^indebted$/i, 'indebted'],
  [/^right$/i, 'right'],
  [/^contested resources?$/i, 'contested-resource'],
  [/^hidden resources?$/i, 'hidden-resources'],
  [/^flawed resources?$/i, 'flawed-resource'],
  [/^illusory resources?$/i, 'illusory-resources'],
  [/^exceptional book$/i, 'exceptional-book'],
  [/^tithing miracles?$/i, 'tithing-miracles'],
];

/** What a chosen Boon or Hook does to the covenant's sheet, if anything. */
export function mechanicOf(hb: CovenantHookBoon): HBMechanic | undefined {
  const hit = MECHANIC_NAMES.find(([re]) => re.test(hb.name.trim()));
  if (!hit) return undefined;
  const boons: HBMechanic[] = ['wealth', 'secondary-income', 'right', 'hidden-resources', 'exceptional-book', 'tithing-miracles'];
  return boons.includes(hit[1]) === (hb.kind === 'boon') ? hit[1] : undefined;
}

/** Boons and Hooks that apply to one income source. */
export const TARGETS_INCOME: HBMechanic[] = ['wealth', 'secondary-income', 'poverty', 'natural-disaster', 'right', 'contested-resource'];
/** Boons and Hooks that hold 250 Build Points of resources. */
export const POOL_MECHANICS: HBMechanic[] = ['hidden-resources', 'flawed-resource', 'illusory-resources'];
export const POOL_SIZE = 250;

export interface IncomeLine {
  source: IncomeSource;
  /** where the source comes from */
  origin: 'base' | 'secondary' | 'play';
  /** the level its Boons and Hooks give it (equal to source.level when gained in play) */
  level: IncomeSource['level'];
  base: number;
  gross: number;
  tithe: number;
  miracle: number;
  received: number;
  /** Boons and Hooks that apply to it */
  applied: { hb: CovenantHookBoon; mechanic: HBMechanic; auto: boolean }[];
  notes: string[];
}

export interface IncomeResult {
  lines: IncomeLine[];
  /** each Boon or Hook that applies to an income source → the source uid */
  targets: Map<string, string>;
  income: number;
  debt: number;
  issues: { message: string; fix?: (c: Covenant) => void; fixLabel?: string }[];
  miracleMultiplier: number;
  hasMiracles: boolean;
}

export const miracleMultiplierOf = (cov: Covenant) => Math.min(3, Math.max(1, cov.finances.miracleMultiplier ?? 1.8));

/** What a source of tithed income or vis gives the covenant, rounded up (Tithing Miracles). */
export function receivedAfterTithe(gross: number, tithed: boolean, miracle: boolean, mult: number): { received: number; tithe: number; miracle: number } {
  if (!tithed) return { received: Math.ceil(gross - 1e-9), tithe: 0, miracle: 0 };
  const tithe = gross / 10;
  const received = Math.ceil((miracle ? gross * mult : gross - tithe) - 1e-9);
  return { received, tithe, miracle: miracle ? received - (gross - tithe) : 0 };
}

/**
 * Works out the covenant's income from its sources and the Boons and Hooks that set them
 * (Covenants ch.5 Customization): one Typical source to start with, Secondary Income adds Typical
 * sources, Wealth raises a Typical one to Greater (Minor) or Legendary (Major), Poverty leaves one
 * Lesser source (Minor) or none (Major), a Natural Disaster that has struck halves the principal
 * source (Minor) or ends it (Major), and Indebted pays a quarter (Minor) or three quarters (Major)
 * of the income as interest. Boons and Hooks not yet given a source are given one in order.
 */
export function computeIncome(cov: Covenant, magi: number): IncomeResult {
  const issues: IncomeResult['issues'] = [];
  const hbs = cov.hooksBoons.map((hb) => ({ hb, m: mechanicOf(hb) })).filter((x): x is { hb: CovenantHookBoon; m: HBMechanic } => !!x.m);
  const sources = cov.income;
  const valid = new Set(sources.map((s) => s.uid));
  const targets = new Map<string, string>();
  const auto = new Set<string>();
  for (const { hb, m } of hbs) if (TARGETS_INCOME.includes(m) && hb.target && valid.has(hb.target)) targets.set(hb.uid, hb.target);
  const taken = (m: HBMechanic, uid: string) => hbs.some((x) => x.m === m && targets.get(x.hb.uid) === uid);
  // Secondary Income first: it decides which sources are not the base one
  for (const { hb, m } of hbs) {
    if (m !== 'secondary-income' || targets.has(hb.uid)) continue;
    const free = [...sources].reverse().find((s) => !s.inPlay && !taken('secondary-income', s.uid) && s !== sources.find((x) => !x.inPlay));
    if (free) (targets.set(hb.uid, free.uid), auto.add(hb.uid));
  }
  const secondary = new Set(hbs.filter((x) => x.m === 'secondary-income' && targets.has(x.hb.uid)).map((x) => targets.get(x.hb.uid)!));
  const principal = sources.find((s) => !s.inPlay && !secondary.has(s.uid)) ?? sources.find((s) => !s.inPlay);
  for (const { hb, m } of hbs) {
    if (!TARGETS_INCOME.includes(m) || targets.has(hb.uid) || m === 'secondary-income') continue;
    let pick: IncomeSource | undefined;
    if (m === 'wealth') pick = sources.find((s) => !s.inPlay && !taken('wealth', s.uid) && !taken('poverty', s.uid));
    else if (m === 'poverty' && hb.size === 'Minor') pick = principal;
    else if (m === 'natural-disaster') pick = principal;
    if (pick) (targets.set(hb.uid, pick.uid), auto.add(hb.uid));
  }
  const povertyMajor = hbs.some((x) => x.m === 'poverty' && x.hb.size === 'Major');
  const povertyMinor = hbs.some((x) => x.m === 'poverty' && x.hb.size === 'Minor');
  const mult = miracleMultiplierOf(cov);
  const hasMiracles = hbs.some((x) => x.m === 'tithing-miracles');

  const lines: IncomeLine[] = sources.map((s) => {
    const applied = hbs.filter((x) => targets.get(x.hb.uid) === s.uid).map((x) => ({ hb: x.hb, mechanic: x.m, auto: auto.has(x.hb.uid) }));
    const notes: string[] = [];
    const origin: IncomeLine['origin'] = s.inPlay ? 'play' : applied.some((a) => a.mechanic === 'secondary-income') ? 'secondary' : 'base';
    let level: IncomeSource['level'] = s.level;
    if (!s.inPlay) {
      level = 'Typical';
      if (povertyMajor) level = 'None';
      else if (applied.some((a) => a.mechanic === 'poverty')) level = 'Lesser';
      else if (origin === 'base' && s.level === 'Lesser' && sources.filter((x) => !x.inPlay && !secondary.has(x.uid)).length === 2) level = 'Lesser'; // the two-Lesser base
      const wealth = applied.filter((a) => a.mechanic === 'wealth');
      if (wealth.length && level === 'Typical') level = wealth.some((w) => w.hb.size === 'Major') ? 'Legendary' : 'Greater';
      if (wealth.length > 1) notes.push('Only one Wealth Boon can upgrade a source.');
    }
    let base = s.customPounds ? s.pounds : INCOME_LEVEL_POUNDS[level];
    if (!s.customPounds && cov.finances.magiIncomeAdjust && s === principal && magi !== 6) {
      const per = level === 'Lesser' ? 6 : 15;
      base = Math.max(0, base + per * (magi - 6));
      notes.push(`${magi > 6 ? '+' : '−'}${per * Math.abs(magi - 6)} £ for ${magi} magi`);
    }
    let gross = base * (INCOME_MODIFICATIONS.find((m) => m.id === (s.modification ?? 'Status Quo'))?.mult ?? 1);
    for (const a of applied) {
      if (a.mechanic === 'natural-disaster' && a.hb.active) {
        if (a.hb.size === 'Major') ((gross = 0), notes.push('lost to a Natural Disaster'));
        else ((gross *= 0.5), notes.push('Natural Disaster: Slump (×0.5)'));
      }
      if (a.mechanic === 'right') notes.push('protected by a Right');
      if (a.mechanic === 'contested-resource') notes.push('contested: a story every five years');
    }
    const type = INCOME_TYPES.find((t) => t.id === s.type);
    if (type?.needsRight && !applied.some((a) => a.mechanic === 'right' || a.mechanic === 'contested-resource')) notes.push(`${type.id} usually needs the Right Boon (or take Contested Resource)`);
    const t = receivedAfterTithe(gross, !!s.tithed, !!s.miracle && hasMiracles, mult);
    return { source: s, origin, level, base, gross, tithe: t.tithe, miracle: t.miracle, received: t.received, applied, notes };
  });

  // how many sources the Boons and Hooks allow
  const fromBoons = lines.filter((l) => l.origin !== 'play');
  const secondaryCount = hbs.filter((x) => x.m === 'secondary-income').length;
  const baseLines = fromBoons.filter((l) => l.origin === 'base');
  const baseAllowed = povertyMajor ? 0 : baseLines.length === 2 && baseLines.every((l) => l.level === 'Lesser') && !povertyMinor ? 2 : 1;
  if (baseLines.length > baseAllowed) {
    issues.push({
      message: `${baseLines.length} income sources come from the base covenant, which has ${baseAllowed === 0 ? 'none (Poverty, Major)' : baseAllowed === 2 ? 'two Lesser sources' : 'one'}${secondaryCount ? '' : ' (Secondary Income adds more)'}.`,
      fixLabel: 'Mark the extra sources as gained in play',
      fix: (c) => { for (const l of baseLines.slice(baseAllowed)) { const x = c.income.find((y) => y.uid === l.source.uid); if (x) x.inPlay = true; } },
    });
  }
  if (secondaryCount > lines.filter((l) => l.origin === 'secondary').length) {
    issues.push({
      message: `Secondary Income ×${secondaryCount} but only ${lines.filter((l) => l.origin === 'secondary').length} source(s) for it.`,
      fixLabel: 'Add a Typical source for each',
      fix: (c) => {
        const n = secondaryCount - lines.filter((l) => l.origin === 'secondary').length;
        for (let i = 0; i < n; i++) c.income.push({ uid: `inc-${Math.random().toString(16).slice(2, 10)}`, name: 'Secondary income', type: 'Trade', level: 'Typical', pounds: 100 });
      },
    });
  }
  if ((povertyMinor || povertyMajor) && hbs.some((x) => x.m === 'wealth' || x.m === 'secondary-income')) issues.push({ message: 'Poverty cannot be taken with Wealth or Secondary Income.' });
  const wealthUnplaced = hbs.filter((x) => x.m === 'wealth' && !targets.has(x.hb.uid)).length;
  if (wealthUnplaced) issues.push({ message: `${wealthUnplaced} Wealth Boon(s) have no Typical source to upgrade: add a source (Secondary Income) or drop the Boon.` });
  for (const l of lines) if (l.applied.filter((a) => a.mechanic === 'wealth').length > 1) issues.push({ message: `${l.source.name}: only one Wealth Boon can upgrade a source.` });

  const income = lines.reduce((s, l) => s + l.received, 0);
  const debtHook = hbs.filter((x) => x.m === 'indebted' && x.hb.active !== false);
  const share = Math.min(1, debtHook.reduce((s, x) => s + (x.hb.size === 'Major' ? 0.75 : 0.25), 0));
  const debt = Math.ceil(income * share - 1e-9);
  return { lines, targets, income, debt, issues, miracleMultiplier: mult, hasMiracles };
}

// ------------------------------------------------------------------------------ Build Point pools

/** One covenant resource bought with Build Points. */
export interface CovResource {
  uid: string;
  kind: 'book' | 'vis' | 'item' | 'specialist' | 'lab';
  label: string;
  cost: number;
}

export interface BPPool {
  hb: CovenantHookBoon;
  mechanic: 'hidden-resources' | 'flawed-resource' | 'illusory-resources';
  capacity: number;
  resources: CovResource[];
  spent: number;
  /** Flawed Resource: resources its story has taken */
  lost: CovResource[];
}

export function poolMechanic(hb: CovenantHookBoon): BPPool['mechanic'] | undefined {
  const m = mechanicOf(hb);
  return m && POOL_MECHANICS.includes(m) ? (m as BPPool['mechanic']) : undefined;
}

/** Hidden, Flawed and Illusory Resources: the 250 Build Points each holds and what is paid from it. */
export function computePools(cov: Covenant, resources: CovResource[]): BPPool[] {
  const byUid = new Map(resources.map((r) => [r.uid, r]));
  const seen = new Set<string>();
  const pools: BPPool[] = [];
  for (const hb of cov.hooksBoons) {
    const mechanic = poolMechanic(hb);
    if (!mechanic) continue;
    const res = (hb.resources ?? []).filter((u) => !seen.has(u) && byUid.has(u)).map((u) => byUid.get(u)!);
    res.forEach((r) => seen.add(r.uid));
    let lost: CovResource[] = [];
    if (mechanic === 'flawed-resource') {
      if (hb.outcome === 'lost' || hb.outcome === 'botched') lost = res;
      else if (hb.outcome === 'saved') lost = res.filter((r) => !(hb.kept ?? []).includes(r.uid));
    }
    pools.push({ hb, mechanic, capacity: POOL_SIZE, resources: res, spent: res.reduce((s, r) => s + r.cost, 0), lost });
  }
  return pools;
}
