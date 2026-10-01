// Covenant creation and management (DE Chapter 6; Covenants).

import type { GameData } from '../data';
import { ARTS, ART_NAMES } from '../data/constants';
import type { Character, Covenant, LibraryBook, Specialist } from './types';
import {
  CATEGORY_LIMIT, abilityCapAtAge, canBeUnknown, computeIncome, computePools, countOf, craftOf, craftsmanSaving, findCraft, mechanicOf, miracleMultiplierOf,
  receivedAfterTithe, specialistCost, type BPPool, type CostCategory, type CovResource, type CraftDef, type IncomeLine, type IncomeResult,
} from './covenantRules';
import { deriveLab, type DerivedLab } from './lab';
import { abilityScoreFromXp } from './xp';

export const POWER_LEVELS = [
  { level: 'Low', min: 0, max: 300, maxItemLevel: 25, minAge: 0 },
  { level: 'Medium', min: 300, max: 1250, maxItemLevel: 40, minAge: 10 },
  { level: 'High', min: 1250, max: 2500, maxItemLevel: Infinity, minAge: 50 },
  { level: 'Legendary', min: 2500, max: Infinity, maxItemLevel: Infinity, minAge: 100 },
] as const;

export interface BPLine {
  category: string;
  label: string;
  /** Build Points charged to the covenant's own total (0 when a Boon or Hook pays) */
  cost: number;
  issue?: string;
  /** the resource bought (book, vis source, item, specialist or lab uid) */
  ref?: string;
  /** what it costs before any Boon or Hook pays for it */
  fullCost?: number;
  /** the Boon or Hook whose Build Points pay for it */
  paidBy?: string;
}

export function summaCost(b: LibraryBook): { cost: number; issue?: string } {
  if (b.kind === 'summa' && b.subjectType === 'art') {
    const limitQ = Math.min(22, 11 + (20 - b.level));
    let issue: string | undefined;
    if (b.level > 20) issue = 'Art summa level may not exceed 20 at creation.';
    else if (b.quality > limitQ) issue = `Art summa quality may not exceed ${limitQ} for level ${b.level}.`;
    return { cost: b.level + b.quality, issue };
  }
  if (b.kind === 'summa') {
    const limitQ = Math.min(22, 11 + 3 * (8 - b.level));
    let issue: string | undefined;
    if (b.level > 8) issue = 'Ability summa level may not exceed 8 at creation.';
    else if (b.quality > limitQ) issue = `Ability summa quality may not exceed ${limitQ} for level ${b.level}.`;
    return { cost: b.quality + 3 * b.level, issue };
  }
  if (b.kind === 'tractatus') {
    return { cost: b.quality, issue: b.quality > 11 ? 'Tractatus quality may not exceed 11 at creation.' : undefined };
  }
  if (b.kind === 'labText') return { cost: Math.ceil(b.level / 5) };
  if (b.kind === 'castingTablet') return { cost: Math.ceil(b.level / 5) * 2 };
  return { cost: 0 };
}

export interface DerivedCovenant {
  cov: Covenant;
  hookPoints: number;
  boonPoints: number;
  aura: number;
  hiddenResourcesBP: number;
  bpLines: BPLine[];
  /** Hidden, Flawed and Illusory Resources */
  pools: BPPool[];
  /** resources that are illusory, or lost to a Flawed Resource story */
  unreal: Set<string>;
  bpSpent: number;
  bpAvailable: number;
  powerLevel: (typeof POWER_LEVELS)[number];
  labs: DerivedLab[];
  issues: string[];
  /** the same issues, with one-click fixes */
  issueList: CovIssue[];
  finances: FinanceResult;
  loyalty: LoyaltyResult;
  visIncome: Record<string, number>;
  members: Character[];
}

export interface CraftLine {
  craft: CraftDef;
  people: number;
  /** what they could save, before the limits */
  potential: number;
  applied: { category: CostCategory; pounds: number; limit: number }[];
  saved: number;
}

export interface FinanceResult {
  inhabitantPoints: number;
  servantsRequired: number;
  teamstersRequired: number;
  labPoints: number;
  expenditures: { label: string; pounds: number }[];
  savings: { label: string; pounds: number }[];
  /** each cost category before savings, with what one craft may save of it */
  categories: { category: CostCategory; total: number; perCraft: number; saved: number }[];
  crafts: CraftLine[];
  /** craftsmen whose craft is not one that saves money */
  noCraft: Specialist[];
  totalExpenditure: number;
  income: number;
  incomeLines: IncomeLine[];
  incomeIssues: IncomeResult['issues'];
  debt: number;
  balance: number;
  writersCount: number;
  laborerSaving: number;
}

export interface LoyaltyResult {
  base: number;
  points: number;
  score: number;
  parts: { label: string; value: number }[];
}

function memberGiftMod(ch: Character, data: GameData): number {
  const ids = new Set(ch.virtues.map((v) => v.defId));
  if (ids.has('gentle-gift')) return 0;
  if (ids.has('blatant-gift-flaw')) return -105;
  if (ids.has('the-gift')) return -30;
  void data;
  return 0;
}

/** A fix for a covenant issue: change the covenant, or open the tab where it is decided. */
export type CovFix = { kind: 'apply'; label: string; apply: (c: Covenant) => void } | { kind: 'goto'; label: string; tab: string };
export interface CovIssue {
  message: string;
  fixes: CovFix[];
}

const LINE_TAB: Record<string, string> = { Library: 'library', Vis: 'library', 'Enchanted items': 'items', Specialists: 'folk', Laboratories: 'labs' };

export function deriveCovenant(cov: Covenant, data: GameData, characters: Character[]): DerivedCovenant {
  const issueList: CovIssue[] = [];
  const issue = (message: string, ...fixes: CovFix[]) => issueList.push({ message, fixes });
  const removeHB = (uid: string, name: string): CovFix => ({ kind: 'apply', label: `Remove ${name}`, apply: (c) => void (c.hooksBoons = c.hooksBoons.filter((x) => x.uid !== uid)) });
  const members = characters.filter((c) => cov.memberIds.includes(c.id));
  // Hooks & boons
  let hookPoints = 0;
  let boonPoints = 0;
  let auraBoons = 0;
  for (const hb of cov.hooksBoons) {
    const pts = hb.size === 'Major' || hb.unknown ? 3 : 1;
    if (hb.kind === 'hook') hookPoints += pts;
    else boonPoints += hb.size === 'Major' ? 3 : 1;
    if (hb.kind === 'boon' && hb.size === 'Minor' && /^aura$/i.test(hb.name)) auraBoons++;
    if (hb.kind === 'boon') {
      const def = hb.defId ? data.hookBoonById.get(hb.defId) : undefined;
      if (def?.requires && !cov.hooksBoons.some((x) => x.name.toLowerCase().includes(def.requires!.toLowerCase()))) {
        const want = def.requires.toLowerCase();
        const hook = data.hooksBoons.find((h) => h.kind === 'hook' && h.name.toLowerCase() === want) ?? data.hooksBoons.find((h) => h.kind === 'hook' && h.name.toLowerCase().includes(want));
        issue(
          `${hb.name} requires the ${def.requires} Hook.`,
          ...(hook ? [{ kind: 'apply' as const, label: `Add the ${hook.name} Hook`, apply: (c: Covenant) => void c.hooksBoons.push({ uid: `${hb.uid}-req`, defId: hook.id, name: hook.name, kind: 'hook', size: hook.size === 'Major' ? 'Major' : 'Minor' }) }] : []),
          removeHB(hb.uid, hb.name),
        );
      }
    }
  }
  if (boonPoints > hookPoints) issue(`Boons cost ${boonPoints} points but Hooks only provide ${hookPoints}.`, { kind: 'goto', label: 'Add Hooks or drop Boons', tab: 'hooks' });
  if (auraBoons > 7) {
    issue('The Minor Aura Boon may be taken at most seven times (aura 10).', {
      kind: 'apply', label: `Drop ${auraBoons - 7} Aura Boon(s)`,
      apply: (c) => {
        let extra = auraBoons - 7;
        c.hooksBoons = [...c.hooksBoons].reverse().filter((h) => !(extra > 0 && h.kind === 'boon' && h.size === 'Minor' && /^aura$/i.test(h.name) && extra--)).reverse();
      },
    });
  }
  const hasHook = (n: RegExp) => cov.hooksBoons.some((h) => h.kind === 'hook' && n.test(h.name));
  const hasBoon = (n: RegExp) => cov.hooksBoons.some((h) => h.kind === 'boon' && n.test(h.name));
  if (hasBoon(/seclusion/i) && (hasHook(/road/i) || hasHook(/urban/i))) {
    const secl = cov.hooksBoons.find((h) => h.kind === 'boon' && /seclusion/i.test(h.name))!;
    const clash = cov.hooksBoons.filter((h) => h.kind === 'hook' && /road|urban/i.test(h.name));
    issue('Seclusion cannot be taken with the Road or Urban Hooks.', removeHB(secl.uid, secl.name), ...clash.map((h) => removeHB(h.uid, h.name)));
  }
  const aura = cov.aura + auraBoons;

  // Build points
  const lines: BPLine[] = [];
  const pl = POWER_LEVELS.find((p) => p.level === cov.powerLevel) ?? POWER_LEVELS[1];
  const exceptional = new Map(cov.hooksBoons.filter((h) => mechanicOf(h) === 'exceptional-book').map((h) => [h.uid, h]));
  for (const b of cov.library) {
    if (b.kind === 'mundane') continue;
    const { cost, issue } = summaCost(b);
    let iss = issue;
    // a bundle of lab texts (subject "various") is checked by its largest text, not its total
    const bundle = b.kind === 'labText' && (b.collectionMax !== undefined || b.subject === 'various');
    const itemLevel = bundle ? b.collectionMax ?? 0 : b.level;
    if ((b.kind === 'labText' || b.kind === 'castingTablet') && itemLevel > pl.maxItemLevel) iss = `Level ${itemLevel} exceeds the ${pl.level} power level maximum of ${pl.maxItemLevel}.`;
    if (b.boonUid && exceptional.has(b.boonUid)) {
      // Exceptional Book: no Build Points; (level + quality) = 35, quality at most 25, level at most 20
      const bad = b.kind !== 'summa' || b.subjectType !== 'art' ? 'it must be a summa on an Art' : b.level + b.quality !== 35 ? `level + quality must be 35 (is ${b.level + b.quality})` : b.quality > 25 ? 'quality may not exceed 25' : b.level > 20 ? 'level may not exceed 20' : undefined;
      lines.push({ category: 'Library', label: `${b.title} (${bookKindLabel(b)}) — Exceptional Book Boon`, cost: 0, fullCost: 0, ref: b.uid, issue: bad ? `Exceptional Book: ${bad}.` : undefined });
      continue;
    }
    lines.push({ category: 'Library', label: `${b.title} (${bookKindLabel(b)})`, cost, ref: b.uid, issue: iss });
  }
  for (const s of cov.visSources) lines.push({ category: 'Vis', label: `${s.name} (${s.pawnsPerYear} ${s.art}/year)`, cost: 5 * s.pawnsPerYear, ref: s.uid });
  const stock = cov.visStocks.reduce((t, v) => t + v.pawns, 0);
  if (stock) lines.push({ category: 'Vis', label: `Vis stocks (${stock} pawns)`, cost: Math.ceil(stock / 5) });
  for (const it of cov.items) {
    const levels = it.effects.reduce((t, e) => t + e.modifiedLevel, 0);
    const over = it.effects.find((e) => e.modifiedLevel > pl.maxItemLevel);
    lines.push({ category: 'Enchanted items', label: it.name, cost: Math.ceil(levels / 5) * 2, ref: it.uid, issue: over ? `${over.name} (level ${over.modifiedLevel}) exceeds the power level maximum ${pl.maxItemLevel}.` : undefined });
  }
  for (const sp of cov.specialists) {
    if (sp.characterId || sp.free) continue;
    const n = countOf(sp);
    lines.push({ category: 'Specialists', label: `${n > 1 ? `${n} × ` : ''}${sp.name || sp.role} (${sp.ability || craftOf(sp)?.name || '?'} ${sp.score})`, cost: specialistCost(sp), ref: sp.uid });
    const cap = abilityCapAtAge(sp.age ?? 46);
    const who = sp.name || `Unnamed ${craftOf(sp)?.name.toLowerCase() ?? sp.role.replace('-', ' ')}`;
    const atAge = sp.age ? `age ${sp.age}` : 'any age';
    if (sp.score > cap) issue(`${who}: a score of ${sp.score} is above the starting limit (${cap} at ${atAge}, DE p.48).`, { kind: 'apply', label: `Set it to ${cap}`, apply: (c) => void (c.specialists.find((x) => x.uid === sp.uid)!.score = cap) }, { kind: 'apply', label: 'Recruited in play: no Build Points or limit', apply: (c) => void (c.specialists.find((x) => x.uid === sp.uid)!.free = true) });
    if (sp.role === 'teacher') {
      if ((sp.teaching ?? 0) > cap) issue(`${who}: Teaching ${sp.teaching} is above the starting limit (${cap} at ${atAge}).`, { kind: 'apply', label: `Set Teaching to ${cap}`, apply: (c) => void (c.specialists.find((x) => x.uid === sp.uid)!.teaching = cap) });
      if ((sp.com ?? 0) > 3) issue(`${who}: Communication ${sp.com} is above +3 (a starting Characteristic is −3 to +3; +4 or +5 needs Great Communication).`, { kind: 'apply', label: 'Set Communication to +3', apply: (c) => void (c.specialists.find((x) => x.uid === sp.uid)!.com = 3) });
      if (ARTS_SET.has(sp.ability)) issue(`${who}: teachers can't have The Gift, so can't teach the Hermetic Arts (DE p.180).`);
    }
  }
  if (cov.finances.startingReserve) lines.push({ category: 'Money', label: `Starting reserve (${cov.finances.startingReserve} £)`, cost: Math.ceil(cov.finances.startingReserve / 10) });
  const labs = cov.labs.map((l) => deriveLab(l, data));
  const magiCount = members.filter((m) => m.type === 'magus').length;
  const labsForMagi = new Set(cov.labs.map((l) => l.ownerId).filter(Boolean));
  for (const l of labs) lines.push({ category: 'Laboratories', label: `${l.lab.name} (Size ${l.lab.size})`, cost: l.buildPoints, ref: l.lab.uid });
  if (cov.spareLabs) lines.push({ category: 'Laboratories', label: `${cov.spareLabs} spare lab(s)`, cost: 50 * cov.spareLabs });
  // DE Laboratory chapter (lab Build Points): each magus who completely lacks a lab frees 50 Build Points.
  const lacking = members.filter((m) => m.type === 'magus' && !labsForMagi.has(m.id)).length;
  if (lacking && cov.labs.length) lines.push({ category: 'Laboratories', label: `${lacking} magus/magi without a lab`, cost: -50 * lacking });

  // Hidden, Flawed and Illusory Resources pay for the resources tied to them
  const kindOf: Record<string, CovResource['kind']> = { Library: 'book', Vis: 'vis', 'Enchanted items': 'item', Specialists: 'specialist', Laboratories: 'lab' };
  const resources: CovResource[] = lines.filter((l) => l.ref && l.cost > 0).map((l) => ({ uid: l.ref!, kind: kindOf[l.category], label: l.label, cost: l.cost }));
  const pools = computePools(cov, resources);
  const firstHidden = pools.find((p) => p.mechanic === 'hidden-resources');
  for (const b of cov.library) {
    if (!b.hidden || pools.some((p) => p.resources.some((r) => r.uid === b.uid))) continue;
    const r = resources.find((x) => x.uid === b.uid);
    if (r && firstHidden) (firstHidden.resources.push(r), (firstHidden.spent += r.cost));
    else if (r) issue(`${b.title} is marked hidden, but the covenant has no Hidden Resources Boon to pay for it.`, { kind: 'goto', label: 'Open Hooks & Boons', tab: 'hooks' });
  }
  const unreal = new Set<string>();
  for (const p of pools) {
    for (const r of p.resources) {
      const line = lines.find((l) => l.ref === r.uid);
      if (line) ((line.fullCost = line.cost), (line.cost = 0), (line.paidBy = p.hb.uid));
      if (p.mechanic === 'illusory-resources') unreal.add(r.uid);
    }
    for (const r of p.lost) unreal.add(r.uid);
    const name = `${p.hb.name}${p.hb.note ? ` (${p.hb.note})` : ''}`;
    if (p.spent > p.capacity) issue(`${name} pays for ${p.spent} Build Points of resources but holds ${p.capacity}.`, { kind: 'goto', label: 'Open Hooks & Boons', tab: 'hooks' });
    if (p.mechanic === 'flawed-resource' && p.hb.outcome === 'saved') {
      const kept = p.resources.filter((r) => !p.lost.includes(r)).reduce((t, r) => t + r.cost, 0);
      if (kept > p.spent / 2) issue(`${name}: a successful story saves at most half (${Math.floor(p.spent / 2)} BP); ${kept} BP are kept.`, { kind: 'goto', label: 'Open Hooks & Boons', tab: 'hooks' });
    }
  }
  for (const hb of cov.hooksBoons) {
    const def = hb.defId ? data.hookBoonById.get(hb.defId) : undefined;
    if (hb.unknown && !canBeUnknown(def)) issue(`${hb.name} cannot be Unknown: only Hooks whose text says so can be.`, { kind: 'apply', label: 'Make it known', apply: (c) => void (c.hooksBoons.find((x) => x.uid === hb.uid)!.unknown = false) });
  }

  const bpSpent = lines.reduce((t, l) => t + l.cost, 0);
  for (const l of lines) if (l.issue) issue(`${l.label}: ${l.issue}`, { kind: 'goto', label: `Open ${l.category}`, tab: LINE_TAB[l.category] ?? 'overview' });
  if (bpSpent > cov.buildPoints) {
    const fits = POWER_LEVELS.find((p) => bpSpent >= p.min && bpSpent <= p.max);
    issue(
      `Spent ${bpSpent} Build Points of ${cov.buildPoints}.`,
      ...(bpSpent <= pl.max ? [{ kind: 'apply' as const, label: `Raise Build Points to ${bpSpent}`, apply: (c: Covenant) => void (c.buildPoints = bpSpent) }] : []),
      ...(bpSpent > pl.max && fits ? [{ kind: 'apply' as const, label: `Make it a ${fits.level} covenant with ${bpSpent} Build Points`, apply: (c: Covenant) => void ((c.buildPoints = bpSpent), (c.powerLevel = fits.level)) }] : []),
      { kind: 'goto', label: 'Review what is bought', tab: 'overview' },
    );
  }
  if (cov.buildPoints < pl.min || cov.buildPoints > pl.max) {
    const fits = POWER_LEVELS.find((p) => cov.buildPoints >= p.min && cov.buildPoints <= p.max);
    issue(
      `${cov.buildPoints} Build Points is outside the ${pl.level} power range (${pl.min}–${pl.max === Infinity ? '∞' : pl.max}).`,
      ...(fits ? [{ kind: 'apply' as const, label: `Call it a ${fits.level} covenant`, apply: (c: Covenant) => void (c.powerLevel = fits.level) }] : []),
      { kind: 'apply', label: `Set Build Points to ${cov.buildPoints < pl.min ? pl.min : pl.max}`, apply: (c) => void (c.buildPoints = cov.buildPoints < pl.min ? pl.min : (pl.max as number)) },
    );
  }

  // Vis income: what each source gives after any tithe and Tithing Miracle, rounded up
  const visIncome: Record<string, number> = {};
  const mult = miracleMultiplierOf(cov);
  const miracles = cov.hooksBoons.some((h) => mechanicOf(h) === 'tithing-miracles');
  for (const s of cov.visSources) {
    if (unreal.has(s.uid)) continue;
    const got = receivedAfterTithe(s.pawnsPerYear, !!s.tithed, !!s.miracle && miracles, mult).received;
    visIncome[s.art] = (visIncome[s.art] ?? 0) + got;
  }

  const finances = computeFinances(cov, members, labs, magiCount, unreal);
  for (const i of finances.incomeIssues) issue(i.message, ...(i.fix ? [{ kind: 'apply' as const, label: i.fixLabel ?? 'Fix', apply: i.fix }] : []), { kind: 'goto', label: 'Open Covenfolk & finances', tab: 'folk' });
  const issues = issueList.map((i) => i.message);
  const loyalty = computeLoyalty(cov, members, data);
  return {
    cov, hookPoints, boonPoints, aura, hiddenResourcesBP: pools.filter((p) => p.mechanic === 'hidden-resources').reduce((t, p) => t + p.spent, 0), bpLines: lines, pools, unreal, bpSpent,
    bpAvailable: cov.buildPoints, powerLevel: pl, labs, issues, issueList, finances, loyalty, visIncome, members,
  };
}

const ARTS_SET = new Set<string>([...ARTS, ...Object.values(ART_NAMES)]);

function bookKindLabel(b: LibraryBook): string {
  if (b.kind === 'summa') return `Summa ${b.subject} L${b.level} Q${b.quality}`;
  if (b.kind === 'tractatus') return `Tractatus ${b.subject} Q${b.quality}`;
  if (b.kind === 'labText') return `Lab Text L${b.level}`;
  if (b.kind === 'castingTablet') return `Casting Tablet L${b.level}`;
  return b.kind;
}

export function computeFinances(cov: Covenant, members: Character[], labs: DerivedLab[], magiCount: number, unreal: Set<string> = new Set()): FinanceResult {
  const summerAutumn = cov.season === 'Summer' || cov.season === 'Autumn';
  const pts = summerAutumn ? { magus: 10, companion: 5, specialist: 3, other: 2 } : { magus: 5, companion: 3, specialist: 2, other: 1 };
  const f = cov.covenfolk;
  const magi = Math.max(magiCount, members.filter((m) => m.type === 'magus').length);
  const companions = members.filter((m) => m.type === 'companion' || m.type === 'mythic').length + f.companions;
  const grogPCs = members.filter((m) => m.type === 'grog').length;
  // specialists and craftsmen listed by name (an illusory one is not really there)
  const listed = cov.specialists.filter((s) => !s.characterId && !unreal.has(s.uid));
  const listedPeople = listed.reduce((t, s) => t + countOf(s), 0);
  const base = magi * pts.magus + companions * pts.companion + (f.specialists + f.craftsmen + listedPeople) * pts.specialist + (f.grogs + grogPCs) * pts.other + f.dependents * pts.other + f.horses;
  // Covenants ch.5: 2 servants per 10 points (rounded up); 1 teamster per 10 points after servants, less twice the laborers
  const servantsRequired = 2 * Math.ceil(base / 10);
  const withServants = base + Math.max(f.servants, servantsRequired) * pts.other;
  const teamsterBase = withServants - 2 * f.laborers;
  const teamstersRequired = Math.max(0, Math.ceil(teamsterBase / 10));
  const inhabitantPoints = withServants + Math.max(f.teamsters, teamstersRequired) * pts.other + f.laborers * pts.other;
  const labPoints = labs.reduce((t, l) => t + l.upkeepPoints * (l.lab.use === 'light' ? 0.5 : l.lab.use === 'heavy' ? 1.5 : 1), 0) + cov.spareLabs * 10;
  const minorBuildingBoons = cov.hooksBoons.filter((h) => h.kind === 'boon' && h.size === 'Minor' && /edifice|keep|important building|tower|walls|fortress/i.test(h.name)).length;
  const majorBuildingBoons = cov.hooksBoons.filter((h) => h.kind === 'boon' && h.size === 'Major' && /walls|fortress|engineering/i.test(h.name)).length;
  const buildings = inhabitantPoints / 10 + 2 * minorBuildingBoons + 5 * majorBuildingBoons;
  const consumables = (2 * inhabitantPoints) / 10;
  const provisions = (5 * inhabitantPoints) / 10;
  const wageMult = { none: 0, miserly: 0.5, standard: 1, generous: 1.5, lavish: 2 }[cov.finances.wages];
  const wages = ((2 * inhabitantPoints) / 10) * wageMult + cov.finances.paidSoldierPennies;
  const writerPeople = listed.filter((s) => s.role === 'scribe' || craftOf(s)?.writer || /bookbind|illuminat|scribe/i.test(s.ability)).reduce((t, s) => t + countOf(s), 0);
  const writers = magi + writerPeople;
  const weapons = cov.finances.weaponArmorPoints / 320;
  const income = computeIncome(cov, magi);
  const expenditures = [
    { label: 'Buildings', pounds: round1(buildings) },
    { label: 'Consumables', pounds: round1(consumables) },
    { label: 'Provisions', pounds: round1(provisions) },
    { label: 'Wages', pounds: round1(wages) },
    { label: 'Laboratories', pounds: round1(labPoints / 10) },
    { label: 'Weapons & Armor', pounds: round1(weapons) },
    { label: 'Writing Materials', pounds: writers },
    { label: 'Inflation', pounds: cov.finances.inflation },
    { label: 'Other tithes & taxes', pounds: cov.finances.tithes },
    ...(income.debt ? [{ label: 'Debt interest (Indebted)', pounds: income.debt }] : []),
    { label: 'Sundry', pounds: cov.finances.sundry },
  ];
  const savings: { label: string; pounds: number }[] = [];
  const catTotals: Record<CostCategory, number> = { Buildings: buildings, Consumables: consumables, Laboratories: labPoints / 10, Provisions: provisions, 'Weapons and Armor': weapons, 'Writing Materials': writers };
  const catSaved: Record<CostCategory, number> = { Buildings: 0, Consumables: 0, Laboratories: 0, Provisions: 0, 'Weapons and Armor': 0, 'Writing Materials': 0 };
  // laborers: 1 pound each, at most half the Provisions
  const laborerSaving = Math.min(f.laborers, provisions / 2);
  if (f.laborers) savings.push({ label: `Laborers (${f.laborers})`, pounds: -round1(laborerSaving) });
  catSaved.Provisions += laborerSaving;
  // craftsmen: each craft saves up to its limit in each category it serves, never more than the category costs
  const byCraft = new Map<string, { craft: CraftDef; people: number; potential: number }>();
  const noCraft: Specialist[] = [];
  for (const s of listed) {
    if (s.role !== 'craftsman') continue;
    const craft = craftOf(s);
    if (!craft || !craft.categories.length) {
      if (!craft) noCraft.push(s);
      continue;
    }
    const e = byCraft.get(craft.id) ?? { craft, people: 0, potential: 0 };
    e.people += countOf(s);
    e.potential += countOf(s) * craftsmanSaving(s.score, s.rare ?? craft.rare);
    byCraft.set(craft.id, e);
  }
  // older files: craft savings entered without a craftsman
  for (const cs of cov.finances.craftSavings ?? []) {
    const craft = findCraftOrCustom(cs.craft, cs.category as CostCategory);
    const e = byCraft.get(craft.id) ?? { craft, people: 0, potential: 0 };
    e.people += 1;
    e.potential += craftsmanSaving(cs.score, cs.rare);
    byCraft.set(craft.id, e);
  }
  const crafts: CraftLine[] = [];
  for (const { craft, people, potential } of byCraft.values()) {
    let left = potential;
    const applied: CraftLine['applied'] = [];
    for (const cat of craft.categories) {
      const limit = catTotals[cat] * CATEGORY_LIMIT[cat];
      const room = Math.max(0, catTotals[cat] - catSaved[cat]);
      const pounds = Math.max(0, Math.min(left, limit, room));
      applied.push({ category: cat, pounds: round1(pounds), limit: round1(limit) });
      catSaved[cat] += pounds;
      left -= pounds;
    }
    const saved = round1(applied.reduce((t, a) => t + a.pounds, 0));
    crafts.push({ craft, people, potential, applied, saved });
    if (saved) savings.push({ label: `${craft.name}${people > 1 ? ` ×${people}` : ''} (${applied.filter((a) => a.pounds).map((a) => a.category).join(' + ')})`, pounds: -saved });
  }
  if (cov.finances.magicSavings) savings.push({ label: 'Magic items / rituals', pounds: -cov.finances.magicSavings });
  const categories = (Object.keys(catTotals) as CostCategory[]).map((c) => ({ category: c, total: round1(catTotals[c]), perCraft: round1(catTotals[c] * CATEGORY_LIMIT[c]), saved: round1(catSaved[c]) }));
  const totalExpenditure = round1(expenditures.reduce((t, e) => t + e.pounds, 0) + savings.reduce((t, s) => t + s.pounds, 0));
  return {
    inhabitantPoints: round1(inhabitantPoints), servantsRequired, teamstersRequired, labPoints, expenditures, savings, categories, crafts, noCraft, totalExpenditure,
    income: income.income, incomeLines: income.lines, incomeIssues: income.issues, debt: income.debt, balance: round1(income.income - totalExpenditure), writersCount: writers,
    laborerSaving: round1(laborerSaving),
  };
}

function findCraftOrCustom(name: string, category: CostCategory): CraftDef {
  const known = findCraft(name);
  if (known && known.categories.includes(category)) return known;
  return { id: `custom:${name.toLowerCase()}|${category}`, name: name || 'Craft', categories: [category], rare: false };
}

/** Totals spent a year with `n` of something changed, for the optimal-number buttons. */
function expenditureWith(cov: Covenant, members: Character[], labs: DerivedLab[], change: (c: Covenant) => void): number {
  const c = structuredClone(cov);
  change(c);
  return computeFinances(c, members, labs, members.filter((m) => m.type === 'magus').length).totalExpenditure;
}

/**
 * The number of laborers that keeps yearly spending lowest: each saves a pound of Provisions (up to
 * half) and every five spare a teamster, but each also counts as an inhabitant (Covenants ch.5).
 */
export function optimalLaborers(cov: Covenant, members: Character[], labs: DerivedLab[]): number {
  let best = 0;
  let bestCost = Infinity;
  const limit = Math.max(50, Math.ceil(cov.covenfolk.laborers * 2 + 200));
  for (let n = 0; n <= limit; n++) {
    const cost = expenditureWith(cov, members, labs, (c) => void (c.covenfolk.laborers = n));
    if (cost < bestCost - 1e-9) ((bestCost = cost), (best = n));
  }
  return best;
}

/** The number of craftsmen of one entry's kind that keeps yearly spending lowest. */
export function optimalCraftsmen(cov: Covenant, members: Character[], labs: DerivedLab[], specialistUid: string): number {
  let best = 0;
  let bestCost = Infinity;
  for (let n = 0; n <= 60; n++) {
    const cost = expenditureWith(cov, members, labs, (c) => void (c.specialists.find((s) => s.uid === specialistUid)!.count = n));
    if (cost < bestCost - 1e-9) ((bestCost = cost), (best = n));
  }
  return best;
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

export function computeLoyalty(cov: Covenant, members: Character[], data: GameData): LoyaltyResult {
  const magi = members.filter((m) => m.type === 'magus');
  const parts: { label: string; value: number }[] = [];
  const base = magi.length ? Math.round(magi.reduce((t, m) => t + memberGiftMod(m, data), 0) / magi.length) : 0;
  parts.push({ label: 'Base (Gift of the magi)', value: base });
  const lc = cov.finances.livingConditions;
  if (lc) parts.push({ label: 'Living conditions', value: lc * 10 });
  const eq = { inexpensive: -10, standard: 0, 'standard+expensive': 10, any: 20 }[cov.finances.equipment];
  if (eq) parts.push({ label: 'Equipment', value: eq });
  const wages = { none: -20, miserly: -10, standard: 0, generous: 10, lavish: 20 }[cov.finances.wages];
  if (wages) parts.push({ label: 'Wages', value: wages });
  if (cov.finances.pension) parts.push({ label: 'Pension', value: 10 });
  for (const sp of cov.specialists) {
    if (sp.role === 'turb-captain' || sp.role === 'steward' || sp.role === 'chamberlain') {
      parts.push({ label: `${sp.name} (${sp.role})`, value: (sp.pre ?? 0) + sp.score });
    }
  }
  const years = Math.max(0, (cov.loyalty.yearsFounded ?? 0));
  const familiarity = Math.min(years * 2, Math.abs(base));
  if (familiarity) parts.push({ label: `Familiarity (${years} years)`, value: familiarity });
  if (cov.loyalty.actionPoints) parts.push({ label: 'Actions & events', value: cov.loyalty.actionPoints });
  const points = parts.reduce((t, p) => t + p.value, 0);
  const score = points < 0 ? -abilityScoreFromXp(-points) : abilityScoreFromXp(points);
  return { base, points, score, parts };
}

export function newCovenant(sagaId: string, year: number): Covenant {
  const now = new Date().toISOString();
  return {
    id: Math.random().toString(16).slice(2, 14),
    sagaId,
    schemaVersion: 1,
    name: '',
    tribunal: '',
    season: 'Spring',
    foundedYear: year,
    description: '',
    aura: 3,
    auraRealm: 'Magic',
    powerLevel: 'Medium',
    buildPoints: 800,
    memberIds: [],
    hooksBoons: [],
    library: [],
    visSources: [],
    visStocks: [],
    items: [],
    specialists: [],
    labs: [],
    spareLabs: 0,
    covenfolk: { grogs: 6, companions: 0, specialists: 3, craftsmen: 0, laborers: 0, servants: 0, teamsters: 0, dependents: 0, horses: 0 },
    income: [{ uid: 'inc1', name: 'Principal income', type: 'Agriculture', level: 'Typical', pounds: 100, customPounds: false }],
    finances: {
      treasury: 0, inflation: 0, tithes: 0, sundry: 1, wages: 'standard', pension: false, equipment: 'standard',
      livingConditions: 0, weaponArmorPoints: 320, magicSavings: 0, craftSavings: [], paidSoldierPennies: 0,
    },
    loyalty: { actionPoints: 0, yearsFounded: 0 },
    log: [],
    notes: '',
    createdAt: now,
    updatedAt: now,
  };
}

/** The three DE base covenant packages (p.178). */
export const BASE_COVENANTS = {
  Weak: {
    buildPoints: 200, power: 'Low' as const,
    library: [
      { kind: 'summa', level: 15, quality: 12 }, { kind: 'summa', level: 12, quality: 12 }, { kind: 'summa', level: 6, quality: 21 },
      { kind: 'abilitySumma', level: 4, quality: 10 }, { kind: 'tractatus', quality: 11 }, { kind: 'tractatus', quality: 10 },
      { kind: 'tractatus', quality: 10 }, { kind: 'tractatus', quality: 9 },
    ],
    labTextLevels: 200, maxLabText: 25, visPerYear: 4, visStock: 0, itemLevels: 0,
  },
  Medium: {
    buildPoints: 800, power: 'Medium' as const,
    library: [
      ...Array(3).fill({ kind: 'summa', level: 16, quality: 15 }), ...Array(5).fill({ kind: 'summa', level: 6, quality: 21 }),
      { kind: 'abilitySumma', level: 5, quality: 20 }, ...Array(2).fill({ kind: 'abilitySumma', level: 6, quality: 15 }),
      ...Array(2).fill({ kind: 'tractatus', quality: 11 }), ...Array(4).fill({ kind: 'tractatus', quality: 10 }), { kind: 'tractatus', quality: 9 },
    ],
    labTextLevels: 1000, maxLabText: 40, visPerYear: 20, visStock: 100, itemLevels: 200,
  },
  Powerful: {
    buildPoints: 2000, power: 'High' as const,
    library: [
      { kind: 'summa', level: 20, quality: 11 }, { kind: 'summa', level: 18, quality: 13 },
      ...Array(5).fill({ kind: 'summa', level: 16, quality: 15 }), ...Array(10).fill({ kind: 'summa', level: 6, quality: 21 }),
      ...Array(3).fill({ kind: 'abilitySumma', level: 6, quality: 17 }), ...Array(3).fill({ kind: 'abilitySumma', level: 5, quality: 20 }),
      ...Array(12).fill({ kind: 'tractatus', quality: 11 }), ...Array(9).fill({ kind: 'tractatus', quality: 10 }), ...Array(9).fill({ kind: 'tractatus', quality: 9 }),
    ],
    labTextLevels: 2500, maxLabText: Infinity, visPerYear: 50, visStock: 250, itemLevels: 500,
  },
};

/** Covenant situations (DE p.177): packages of Hooks and Boons. */
export const SITUATIONS: Record<string, { hooks: [string, 'Major' | 'Minor', number?][]; boons: [string, 'Major' | 'Minor', number?][] }> = {
  'Autumn Power': {
    hooks: [['Hermetic Politics', 'Minor'], ['Protector', 'Minor'], ['Castle', 'Major'], ['Rival', 'Major'], ['Superiors', 'Major']],
    boons: [['Aura', 'Minor', 2], ['Edifice', 'Minor'], ['Hidden Resources', 'Minor'], ['Prestige', 'Minor'], ['Curtain Walls and Mural Towers', 'Major'], ['Wealth', 'Major']],
  },
  'Mundane Lord': { hooks: [['Castle', 'Major'], ['Mundane Politics', 'Major']], boons: [['Edifice', 'Minor'], ['Tower Keep', 'Minor'], ['Wealth', 'Minor'], ['Prestige', 'Major']] },
  'Powerful Location': { hooks: [['Monster', 'Minor', 2], ['Regio', 'Major']], boons: [['Aura', 'Minor', 5]] },
  Struggling: { hooks: [['Contested Resource', 'Minor'], ['Poverty', 'Major']], boons: [['Aura', 'Minor', 2], ['Regio', 'Minor'], ['Seclusion', 'Minor']] },
  Urban: { hooks: [['Urban', 'Major']], boons: [['Aura', 'Minor'], ['Regio', 'Minor'], ['Wealth', 'Minor']] },
  'Winter Ruins': {
    hooks: [['Contested Resource', 'Minor', 3], ['Monster', 'Major'], ['Poverty', 'Minor']],
    boons: [['Aura', 'Minor', 2], ['Edifice', 'Minor', 2], ['Hidden Resources', 'Minor', 3]],
  },
};
