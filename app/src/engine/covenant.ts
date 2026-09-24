// Covenant creation and management (DE Chapter 6; Covenants).

import type { GameData } from '../data';
import type { Character, Covenant, LibraryBook } from './types';
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
  cost: number;
  issue?: string;
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
  bpSpent: number;
  bpAvailable: number;
  powerLevel: (typeof POWER_LEVELS)[number];
  labs: DerivedLab[];
  issues: string[];
  finances: FinanceResult;
  loyalty: LoyaltyResult;
  visIncome: Record<string, number>;
  members: Character[];
}

export interface FinanceResult {
  inhabitantPoints: number;
  servantsRequired: number;
  teamstersRequired: number;
  labPoints: number;
  expenditures: { label: string; pounds: number }[];
  savings: { label: string; pounds: number }[];
  totalExpenditure: number;
  income: number;
  balance: number;
  writersCount: number;
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

export function deriveCovenant(cov: Covenant, data: GameData, characters: Character[]): DerivedCovenant {
  const issues: string[] = [];
  const members = characters.filter((c) => cov.memberIds.includes(c.id));
  // Hooks & boons
  let hookPoints = 0;
  let boonPoints = 0;
  let auraBoons = 0;
  let hidden = 0;
  for (const hb of cov.hooksBoons) {
    const pts = hb.size === 'Major' || hb.unknown ? 3 : 1;
    if (hb.kind === 'hook') hookPoints += pts;
    else boonPoints += hb.size === 'Major' ? 3 : 1;
    if (hb.kind === 'boon' && hb.size === 'Minor' && /^aura$/i.test(hb.name)) auraBoons++;
    if (hb.kind === 'boon' && /hidden resources/i.test(hb.name)) hidden += 250;
    if (hb.kind === 'boon') {
      const def = hb.defId ? data.hookBoonById.get(hb.defId) : undefined;
      if (def?.requires && !cov.hooksBoons.some((x) => x.name.toLowerCase().includes(def.requires!.toLowerCase()))) issues.push(`${hb.name} requires the ${def.requires} Hook.`);
    }
  }
  if (boonPoints > hookPoints) issues.push(`Boons cost ${boonPoints} points but Hooks only provide ${hookPoints}.`);
  if (auraBoons > 7) issues.push('The Minor Aura Boon may be taken at most seven times (aura 10).');
  const hasHook = (n: RegExp) => cov.hooksBoons.some((h) => h.kind === 'hook' && n.test(h.name));
  const hasBoon = (n: RegExp) => cov.hooksBoons.some((h) => h.kind === 'boon' && n.test(h.name));
  if (hasBoon(/seclusion/i) && (hasHook(/road/i) || hasHook(/urban/i))) issues.push('Seclusion cannot be taken with the Road or Urban Hooks.');
  const aura = cov.aura + auraBoons;

  // Build points
  const lines: BPLine[] = [];
  const pl = POWER_LEVELS.find((p) => p.level === cov.powerLevel) ?? POWER_LEVELS[1];
  for (const b of cov.library) {
    if (b.kind === 'mundane') continue;
    const { cost, issue } = summaCost(b);
    let iss = issue;
    if ((b.kind === 'labText' || b.kind === 'castingTablet') && b.level > pl.maxItemLevel) iss = `Level ${b.level} exceeds the ${pl.level} power level maximum of ${pl.maxItemLevel}.`;
    lines.push({ category: 'Library', label: `${b.title} (${bookKindLabel(b)})`, cost: b.hidden ? 0 : cost, issue: iss });
  }
  for (const s of cov.visSources) lines.push({ category: 'Vis', label: `${s.name} (${s.pawnsPerYear} ${s.art}/year)`, cost: 5 * s.pawnsPerYear });
  const stock = cov.visStocks.reduce((t, v) => t + v.pawns, 0);
  if (stock) lines.push({ category: 'Vis', label: `Vis stocks (${stock} pawns)`, cost: Math.ceil(stock / 5) });
  for (const it of cov.items) {
    const levels = it.effects.reduce((t, e) => t + e.modifiedLevel, 0);
    const over = it.effects.find((e) => e.modifiedLevel > pl.maxItemLevel);
    lines.push({ category: 'Enchanted items', label: it.name, cost: Math.ceil(levels / 5) * 2, issue: over ? `${over.name} (level ${over.modifiedLevel}) exceeds the power level maximum ${pl.maxItemLevel}.` : undefined });
  }
  for (const sp of cov.specialists) {
    if (sp.characterId) continue;
    const cost = sp.role === 'teacher' ? (sp.com ?? 0) + (sp.teaching ?? 0) + sp.score : sp.score;
    lines.push({ category: 'Specialists', label: `${sp.name} (${sp.ability} ${sp.score})`, cost });
  }
  const labs = cov.labs.map((l) => deriveLab(l, data));
  const magiCount = members.filter((m) => m.type === 'magus').length;
  const labsForMagi = new Set(cov.labs.map((l) => l.ownerId).filter(Boolean));
  for (const l of labs) lines.push({ category: 'Laboratories', label: `${l.lab.name} (Size ${l.lab.size})`, cost: l.buildPoints });
  if (cov.spareLabs) lines.push({ category: 'Laboratories', label: `${cov.spareLabs} spare lab(s)`, cost: 50 * cov.spareLabs });
  // DE Laboratory chapter (lab Build Points): each magus who completely lacks a lab frees 50 Build Points.
  const lacking = members.filter((m) => m.type === 'magus' && !labsForMagi.has(m.id)).length;
  if (lacking && cov.labs.length) lines.push({ category: 'Laboratories', label: `${lacking} magus/magi without a lab`, cost: -50 * lacking });
  const bpSpent = lines.reduce((t, l) => t + l.cost, 0);
  for (const l of lines) if (l.issue) issues.push(`${l.label}: ${l.issue}`);
  if (bpSpent > cov.buildPoints) issues.push(`Spent ${bpSpent} Build Points of ${cov.buildPoints}.`);
  if (cov.buildPoints < pl.min || cov.buildPoints > pl.max) issues.push(`${cov.buildPoints} Build Points is outside the ${pl.level} power range (${pl.min}–${pl.max === Infinity ? '∞' : pl.max}).`);

  // Vis income
  const visIncome: Record<string, number> = {};
  for (const s of cov.visSources) visIncome[s.art] = (visIncome[s.art] ?? 0) + s.pawnsPerYear;

  const finances = computeFinances(cov, members, labs, magiCount);
  const loyalty = computeLoyalty(cov, members, data);
  return {
    cov, hookPoints, boonPoints, aura, hiddenResourcesBP: hidden, bpLines: lines, bpSpent, bpAvailable: cov.buildPoints,
    powerLevel: pl, labs, issues, finances, loyalty, visIncome, members,
  };
}

function bookKindLabel(b: LibraryBook): string {
  if (b.kind === 'summa') return `Summa ${b.subject} L${b.level} Q${b.quality}`;
  if (b.kind === 'tractatus') return `Tractatus ${b.subject} Q${b.quality}`;
  if (b.kind === 'labText') return `Lab Text L${b.level}`;
  if (b.kind === 'castingTablet') return `Casting Tablet L${b.level}`;
  return b.kind;
}

export function computeFinances(cov: Covenant, members: Character[], labs: DerivedLab[], magiCount: number): FinanceResult {
  const summerAutumn = cov.season === 'Summer' || cov.season === 'Autumn';
  const pts = summerAutumn ? { magus: 10, companion: 5, specialist: 3, other: 2 } : { magus: 5, companion: 3, specialist: 2, other: 1 };
  const f = cov.covenfolk;
  const magi = Math.max(magiCount, members.filter((m) => m.type === 'magus').length);
  const companions = members.filter((m) => m.type === 'companion' || m.type === 'mythic').length + f.companions;
  const grogPCs = members.filter((m) => m.type === 'grog').length;
  const specialists = f.specialists + cov.specialists.filter((s) => !s.characterId).length;
  const base = magi * pts.magus + companions * pts.companion + specialists * pts.specialist + f.craftsmen * pts.specialist + (f.grogs + grogPCs) * pts.other + f.dependents * pts.other + f.horses;
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
  const writers = magi + cov.specialists.filter((s) => s.role === 'scribe' || /bookbind|illuminat|scribe/i.test(s.ability)).length;
  const expenditures = [
    { label: 'Buildings', pounds: round1(buildings) },
    { label: 'Consumables', pounds: round1(consumables) },
    { label: 'Provisions', pounds: round1(provisions) },
    { label: 'Wages', pounds: round1(wages) },
    { label: 'Laboratories', pounds: round1(labPoints / 10) },
    { label: 'Weapons & Armor', pounds: round1(cov.finances.weaponArmorPoints / 320) },
    { label: 'Writing Materials', pounds: writers },
    { label: 'Inflation', pounds: cov.finances.inflation },
    { label: 'Tithes', pounds: cov.finances.tithes },
    { label: 'Sundry', pounds: cov.finances.sundry },
  ];
  const savings: { label: string; pounds: number }[] = [];
  if (f.laborers) savings.push({ label: `Laborers (${f.laborers})`, pounds: -Math.min(f.laborers, provisions / 2) });
  const catTotals: Record<string, number> = { Buildings: buildings, Consumables: consumables, Laboratories: labPoints / 10, Provisions: provisions, 'Weapons and Armor': cov.finances.weaponArmorPoints / 320, 'Writing Materials': writers };
  const catLimit: Record<string, number> = { Buildings: 0.5, Consumables: 0.2, Laboratories: 0.2, Provisions: 0.2, 'Weapons and Armor': 0.5, 'Writing Materials': 0.5 };
  const perCraft: Record<string, number> = {};
  for (const cs of cov.finances.craftSavings) {
    const save = cs.rare ? cs.score : 1 + Math.floor(cs.score / 2);
    const key = `${cs.category}|${cs.craft.toLowerCase()}`;
    const limit = (catTotals[cs.category] ?? 0) * (catLimit[cs.category] ?? 0.2);
    const already = perCraft[key] ?? 0;
    const allowed = Math.max(0, Math.min(save, limit - already));
    perCraft[key] = already + allowed;
    savings.push({ label: `${cs.craft} (${cs.category})`, pounds: -round1(allowed) });
  }
  if (cov.finances.magicSavings) savings.push({ label: 'Magic items / rituals', pounds: -cov.finances.magicSavings });
  const totalExpenditure = round1(expenditures.reduce((t, e) => t + e.pounds, 0) + savings.reduce((t, s) => t + s.pounds, 0));
  const income = cov.income.reduce((t, i) => t + i.pounds, 0);
  return { inhabitantPoints: round1(inhabitantPoints), servantsRequired, teamstersRequired, labPoints, expenditures, savings, totalExpenditure, income, balance: round1(income - totalExpenditure), writersCount: writers };
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
    income: [{ uid: 'inc1', name: 'Typical income', type: 'Agriculture', level: 'Typical', pounds: 100 }],
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
