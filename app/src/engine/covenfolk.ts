// The covenfolk beyond the head count (DE; Covenants ch.4-5; Grogs ch.2; City & Guild ch.2-4): what each
// role counts as and costs, soldiers from the Residents Boons, the weapons and armor the covenant keeps,
// what it spends every year besides upkeep (Redcap visits, feast days, guests), how its covenfolk are
// organized and the guild that may come of it, its craftsmen's guild ranks and Labor Points, craft magic
// in place of craftsmen, and the experience specialists and craftsmen gain from year to year.

import type { GameData } from '../data';
import { abilityXpForScore } from './xp';
import { countOf, craftOf, specAbilities, specChar, specHighest, specialistUnitCost } from './covenantRules';
import type { Character, Covenant, CraftMagicUse, SoldierGroup, Specialist, SpecialistRole, YearlyEvent } from './types';
import { uid } from '../util/id';

// ------------------------------------------------------------------------------ Roles

export interface RoleDef {
  id: SpecialistRole;
  label: string;
  /** the Ability the role uses, for Quick add and the fill-out */
  ability?: { id: string; param?: string; name: string };
  /** what the role counts as among the inhabitants: a specialist, or nothing (agents live away) */
  counts: 'specialist' | 'none';
  /** Build Points: teachers Communication + Teaching + the highest score, others the highest score, servants none */
  bp: 'teacher' | 'highest' | 'none';
  hint: string;
}

export const ROLE_DEFS: RoleDef[] = [
  { id: 'teacher', label: 'Teacher', counts: 'specialist', bp: 'teacher', hint: 'Teaches two seasons a year at Communication + Teaching + 3 (+6 for one student, +5 Good Teacher, plus a lab’s Teaching Specialization up to +3). Costs Communication + Teaching + the highest score; several Abilities at that score cost no more (DE p.180).' },
  { id: 'craftsman', label: 'Craftsman', counts: 'specialist', bp: 'highest', hint: 'Saves the covenant money in the categories their craft serves (Covenants ch.5).' },
  { id: 'turb-captain', label: 'Turb captain', ability: { id: 'leadership', name: 'Leadership' }, counts: 'specialist', bp: 'highest', hint: 'Leads the soldiers and speaks for them to the magi; adds Presence + Leadership to Loyalty (Covenants ch.4).' },
  { id: 'steward', label: 'Steward', ability: { id: 'profession-type', param: 'Steward', name: 'Profession: Steward' }, counts: 'specialist', bp: 'highest', hint: 'Sees to the specialists; adds Presence + Profession: Steward to Loyalty (Covenants ch.4; Grogs).' },
  { id: 'chamberlain', label: 'Chamberlain', ability: { id: 'profession-type', param: 'Chamberlain', name: 'Profession: Chamberlain' }, counts: 'specialist', bp: 'highest', hint: 'Coordinates the servants; adds Presence + Profession: Chamberlain to Loyalty, and can study the covenant rolls (Grogs).' },
  { id: 'autocrat', label: 'Autocrat (steward and chamberlain)', ability: { id: 'profession-type', param: 'Steward', name: 'Profession: Steward' }, counts: 'specialist', bp: 'highest', hint: 'One officer who is both steward and chamberlain: the Loyalty from both roles is added (Covenants ch.4; Grogs).' },
  { id: 'scribe', label: 'Scribe', ability: { id: 'profession-type', param: 'Scribe', name: 'Profession: Scribe' }, counts: 'specialist', bp: 'highest', hint: 'Copies books and keeps records: a pound of Writing Materials a year, and +1 Quality to the books they help make (Covenants ch.7).' },
  { id: 'drill-sergeant', label: 'Drill sergeant', ability: { id: 'single-weapon', name: 'Single Weapon' }, counts: 'specialist', bp: 'teacher', hint: 'Teaches the turb a Martial Ability one season each year so it fights as a trained group, and keeps discipline; needs Leadership and Teaching (Grogs).' },
  { id: 'sergeant', label: 'Unit sergeant', ability: { id: 'leadership', name: 'Leadership' }, counts: 'specialist', bp: 'highest', hint: 'Commands one unit of the turb; fed, lodged and paid as a specialist (Grogs).' },
  { id: 'personal-servant', label: 'Personal servant', counts: 'specialist', bp: 'none', hint: 'Serves one magus day to day: a servant, so no Build Points, but fed, lodged and paid like a specialist (Grogs).' },
  { id: 'agent', label: 'Agent', counts: 'none', bp: 'highest', hint: 'Placed away from the covenant to watch or help: bought with Build Points, but not counted among the inhabitants (Grogs; HoH: Societates).' },
  { id: 'specialist', label: 'Other specialist', counts: 'specialist', bp: 'highest', hint: 'Scout, huntsman, translator, animal trainer, physician, librarian…: bought with Build Points for their highest score (DE p.180).' },
  { id: 'other', label: 'Other', counts: 'specialist', bp: 'highest', hint: 'Anyone else the covenant keeps on as a specialist.' },
];
export const ROLE_BY_ID = new Map(ROLE_DEFS.map((r) => [r.id, r]));
const roleLabel = (r: SpecialistRole) => ROLE_BY_ID.get(r)?.label ?? r;
/** Teachers and the drill sergeant teach: they can be chosen as a character's covenant teacher. */
export const teaches = (s: Specialist) => !s.characterId && (s.role === 'teacher' || s.role === 'drill-sergeant');

// ------------------------------------------------------------------------------ Soldiers

export interface SoldierKind {
  id: string;
  label: string;
  /** the Boon or Free Choice (Covenants ch.2, Residents) */
  boon?: RegExp;
  pennies: number;
  inhabitants: boolean;
  horses: number;
  gear: number;
  hint: string;
}

/** Soldier types (Covenants ch.2, Residents Boons and Free Choices; Military Preparedness). Pay from the Boons; kit and horses as suggested defaults. */
export const SOLDIER_KINDS: SoldierKind[] = [
  { id: 'veteran', label: 'Veteran fighters', boon: /^veteran fighters?$/i, pennies: 1, inhabitants: true, horses: 0, gear: 32, hint: 'Professional foot soldiers: a penny each a day, standard weapons and armor (their officers expensive ones); guards and servants between battles.' },
  { id: 'crossbow', label: 'Crossbowmen', boon: /^crossbowmen$/i, pennies: 9, inhabitants: true, horses: 0, gear: 28, hint: 'Nine pence each a day, even when not fighting; a crossbow is expensive (16), with partial armor and a sidearm. A peasant company instead lives at home and serves when relations are good.' },
  { id: 'criminals', label: 'Criminals', boon: /^criminals$/i, pennies: 0, inhabitants: true, horses: 0, gear: 20, hint: 'Brigands or pirates: no pay beyond food, shelter, beer and booty.' },
  { id: 'cavalry', label: 'Cavalry', boon: /^cavalry$/i, pennies: 0, inhabitants: true, horses: 1, gear: 20, hint: 'Horsemen: not paid in money, but the men, their horses and kit are dear to keep.' },
  { id: 'heavy-cavalry', label: 'Heavy cavalry (knights)', boon: /^heavy cavalry$/i, pennies: 0, inhabitants: true, horses: 2, gear: 48, hint: 'A banner of knights, each with a warhorse (16 £ to buy) and a riding horse; very dear to keep, and it alarms every nobleman within half a day’s ride.' },
  { id: 'missile', label: 'Missile weapons (tenants)', boon: /^missile weapons$/i, pennies: 0, inhabitants: false, horses: 0, gear: 0, hint: 'Tenants skilled with bow, sling or javelin who serve as part of their rent, with their own weapons: not inhabitants.' },
  { id: 'hunters', label: 'Hunters or sailors', pennies: 1, inhabitants: false, horses: 0, gear: 0, hint: 'A Free Choice: people who live by hunting or fishing, paid a penny a day for their service.' },
  { id: 'peasants', label: 'Peasants', pennies: 0, inhabitants: false, horses: 0, gear: 0, hint: 'A Free Choice: farmers who owe military service as rent and are never paid; few can be called up at planting or harvest. Count those who farm for the covenant as laborers.' },
  { id: 'other', label: 'Other soldiers', pennies: 0, inhabitants: true, horses: 0, gear: 32, hint: 'Any other soldiers (Magical (Soldiers) improves one of the types above).' },
];
export const SOLDIER_KIND_BY_ID = new Map(SOLDIER_KINDS.map((k) => [k.id, k]));

/** The soldier type a Boon gives, if it gives one. */
export function soldierKindOf(name: string): SoldierKind | undefined {
  return SOLDIER_KINDS.find((k) => k.boon?.test(name.trim()));
}

/** A new group of soldiers of a kind, at the kind's pay, horses and kit. */
export function newSoldierGroup(kind: string, count: number, hbUid?: string): SoldierGroup {
  const k = SOLDIER_KIND_BY_ID.get(kind) ?? SOLDIER_KIND_BY_ID.get('other')!;
  return { uid: uid(), kind: k.id, hbUid, count, pennies: k.pennies, inhabitants: k.inhabitants, horses: k.horses, gear: k.gear };
}

/** The covenant's soldier Boons that have no group of soldiers yet. */
export function soldierBoonsWithoutGroups(cov: Covenant) {
  const groups = cov.finances.soldiers ?? [];
  return cov.hooksBoons.filter((h) => h.kind === 'boon' && soldierKindOf(h.name) && !groups.some((g) => g.hbUid === h.uid));
}

export interface SoldierTotals {
  inhabitants: number;
  horses: number;
  pennies: number;
  gear: number;
  people: number;
}

export function soldierTotals(cov: Covenant): SoldierTotals {
  const t: SoldierTotals = { inhabitants: 0, horses: 0, pennies: 0, gear: 0, people: 0 };
  for (const g of cov.finances.soldiers ?? []) {
    const n = Math.max(0, g.count);
    if (g.inhabitants) t.inhabitants += n;
    t.horses += n * Math.max(0, g.horses);
    t.pennies += n * Math.max(0, g.pennies);
    t.gear += n * Math.max(0, g.gear);
    t.people += n;
  }
  return t;
}

// ------------------------------------------------------------------------------ Weapons and armor

/** Points of Weapons and Armor (Covenants ch.5) by the cost of a weapon or shield, partial armor and full armor. */
export const GEAR_POINTS = {
  weapon: { 'Inexp.': 1, 'Std.': 4, 'Exp.': 16 } as Record<string, number>,
  partial: { 'Inexp.': 2, 'Std.': 8, 'Exp.': 32 } as Record<string, number>,
  full: { 'Inexp.': 4, 'Std.': 16, 'Exp.': 64 } as Record<string, number>,
};
/** An unnamed grog's kit by the covenant's equipment (full armor, a shield and three weapons: the book's 32 for standard). */
const OUTFIT_POINTS: Record<Covenant['finances']['equipment'], number> = { inexpensive: 8, standard: 32, 'standard+expensive': 44, any: 80 };

export interface GearEstimate {
  total: number;
  lines: { label: string; points: number }[];
}

/** A character's weapons and armor in points, from the sheet. */
function characterGearPoints(c: Character, data: GameData): number {
  let pts = 0;
  for (const w of c.equipment?.weapons ?? []) {
    const wd = data.weapons.find((x) => x.id === w.weaponId);
    pts += GEAR_POINTS.weapon[wd?.cost ?? ''] ?? 0;
    if (w.shieldId) pts += GEAR_POINTS.weapon[data.weapons.find((x) => x.id === w.shieldId)?.cost ?? ''] ?? 0;
  }
  const armor = c.equipment?.armorId ? data.armor.find((a) => a.id === c.equipment.armorId) : undefined;
  if (armor && c.equipment.armorCoverage !== 'none') pts += (c.equipment.armorCoverage === 'full' ? GEAR_POINTS.full : GEAR_POINTS.partial)[armor.cost] ?? 0;
  return pts;
}

/**
 * The covenant's points of weapons and armor (Covenants ch.5): what its members carry (from their sheets),
 * an outfit for each grog without a sheet at the covenant's equipment, its soldiers' kit, and its store.
 */
export function weaponArmorEstimate(cov: Covenant, members: Character[], data: GameData): GearEstimate {
  const lines: GearEstimate['lines'] = [];
  const armed = members.filter((m) => m.type !== 'magus').map((m) => ({ m, pts: characterGearPoints(m, data) })).filter((x) => x.pts > 0);
  if (armed.length) lines.push({ label: `${armed.length} member${armed.length > 1 ? 's' : ''} with sheets (${armed.map((x) => `${x.m.name || 'unnamed'} ${x.pts}`).join(', ')})`, points: armed.reduce((t, x) => t + x.pts, 0) });
  const each = OUTFIT_POINTS[cov.finances.equipment] ?? 32;
  if (cov.covenfolk.grogs) lines.push({ label: `${cov.covenfolk.grogs} grogs without sheets × ${each} (${cov.finances.equipment} kit)`, points: cov.covenfolk.grogs * each });
  for (const g of cov.finances.soldiers ?? []) {
    if (g.count && g.gear) lines.push({ label: `${g.count} ${SOLDIER_KIND_BY_ID.get(g.kind)?.label.toLowerCase() ?? 'soldiers'} × ${g.gear}`, points: g.count * g.gear });
  }
  if (cov.finances.arsenalPoints) lines.push({ label: 'Stores and siege engines', points: cov.finances.arsenalPoints });
  return { total: lines.reduce((t, l) => t + l.points, 0), lines };
}

// ------------------------------------------------------------------------------ Yearly events

export interface YearlyEventDef {
  id: string;
  label: string;
  /** a pound figure from the price list (Covenants ch.5) */
  each: number;
  /** the cost grows with the number of people fed (per hundred) */
  perHundred?: boolean;
  hint: string;
}

/** What a covenant spends on every year besides its upkeep (Covenants ch.5, Hospitality, Labor and Books in the price list). */
export const YEARLY_EVENTS: YearlyEventDef[] = [
  { id: 'redcaps', label: 'Redcap visits', each: 0.5, hint: '30 pennies’ fee each, and a couple of weeks wined and dined: two visits cost a pound.' },
  { id: 'feasts', label: 'Feast days kept', each: 0.5, perHundred: true, hint: 'Two feast days for a hundred people cost a pound. A regular cycle of four or more major feasts a year grants a Loyalty point each year (Covenants ch.4).' },
  { id: 'festivals', label: 'Lavish festivals', each: 1, perHundred: true, hint: 'A pound for a hundred people. A celebration after a notable event earns a Loyalty point (record it as an event).' },
  { id: 'guests', label: 'Seasons of a noble or magus as guest', each: 2, hint: 'Board and lodging for a nobleman or magus: 2 £ a season.' },
  { id: 'boarders', label: 'Commoners boarded for the year', each: 1, hint: 'Board and lodging for a commoner: a pound a year.' },
  { id: 'hired-unskilled', label: 'Unskilled workmen hired for the year', each: 1, hint: 'A penny a day: a pound a year each.' },
  { id: 'hired-skilled', label: 'Skilled workmen or men-at-arms hired', each: 2, hint: 'Two pence a day: two pounds a year each.' },
  { id: 'hired-master', label: 'Master craftsmen or ship’s captains hired', each: 5, hint: 'Five pence a day: five pounds a year each.' },
  { id: 'books', label: 'Mundane books bought', each: 1, hint: 'A pound for a standard book from a stationer.' },
  { id: 'resonant', label: 'Resonant materials for books', each: 1, hint: 'About a pound a book for precious materials (Covenants ch.7).' },
];
export const YEARLY_BY_ID = new Map(YEARLY_EVENTS.map((e) => [e.id, e]));
/** Four or more feast days a year make a regular cycle: a Loyalty point a year. */
export const FEAST_CYCLE = 4;

/** What one yearly entry costs, for this many people at the covenant. */
export function yearlyEventPounds(e: YearlyEvent, people: number): number {
  const def = YEARLY_BY_ID.get(e.id);
  if (!def) return 0;
  const mult = def.perHundred ? Math.max(1, people / 100) : 1;
  return Math.round(def.each * Math.max(0, e.count) * mult * 100) / 100;
}

export const keepsFeastCycle = (cov: Covenant) => (cov.finances.yearly ?? []).some((e) => e.id === 'feasts' && e.count >= FEAST_CYCLE);

// ------------------------------------------------------------------------------ Organization and the Guild Hook

export const ORGANIZATIONS: { id: NonNullable<Covenant['organization']>; label: string; text: string; line: number }[] = [
  { id: 'household', label: 'Noble household', text: 'A hierarchy under a steward (lands, keep and specialists), a chamberlain (treasury and servants) and a marshal (the men-at-arms and the stables). Least work for the magi.', line: 8714 },
  { id: 'military', label: 'Military hierarchy', text: 'Squads of soldiers with their auxiliary staff under a marshal and a captain; suits military covenants and those split over several sites.', line: 8728 },
  { id: 'nations', label: 'Nations', text: 'Groups that cut across roles, by lot, sponsor, contest or birth; members may have a Loyalty Trait to their nation as well as the covenant.', line: 8736 },
  { id: 'guilds', label: 'Guilds (by function)', text: 'Servants, specialists and soldiers, or finer groups; craftsmen tend to band together on their own. Not necessarily a body that can strike.', line: 8748 },
  { id: 'professional-guilds', label: 'Professional guilds', text: 'Modelled on craft guilds: a dean, aldermen, masters, journeymen and apprentices, with funds for the sick, the old and funerals. Craftsmen take guild ranks (City & Guild ch.3).', line: 8756 },
  { id: 'monastery', label: 'Monastery', text: 'An abbot names officials for each department, who call on the others as needed; good for a small covenant.', line: 8764 },
  { id: 'none', label: 'No formal structure', text: 'Only for a few covenfolk: tasks are forgotten unless they form a close group.', line: 8770 },
];

/** The Guild Hook (Covenants ch.2, Residents): the covenfolk can strike for better wages, hours and conditions. */
export const hasGuildHook = (cov: Covenant) => cov.hooksBoons.some((h) => h.kind === 'hook' && /^guild$/i.test(h.name.trim()));
export const guildHookOf = (cov: Covenant) => cov.hooksBoons.find((h) => h.kind === 'hook' && /^guild$/i.test(h.name.trim()));
/** On strike: the Guild Hook's covenfolk have withdrawn their services. */
export const onStrike = (cov: Covenant) => !!guildHookOf(cov)?.active;

/** What the covenfolk's guild agitates for, from the covenant's spending choices (Covenants ch.2, Guild). */
export function guildDemands(cov: Covenant): string[] {
  if (!hasGuildHook(cov)) return [];
  const f = cov.finances;
  const out: string[] = [];
  if (f.wages === 'none' || f.wages === 'miserly') out.push(`wages are ${f.wages}: the guild agitates for better pay`);
  if (!f.pension) out.push('no pension: the guild expects funds for retirement, the sick, widows and funerals');
  if (f.livingConditions < 0) out.push('poor living conditions');
  if (f.equipment === 'inexpensive') out.push('inexpensive equipment (dangerous working conditions)');
  return out;
}

/** Whether the covenant's craftsmen take guild ranks: the Guild Hook enforces them; professional guilds or the optional rule show them. */
export function guildRanksApply(cov: Covenant, optionOn: boolean): 'enforced' | 'shown' | undefined {
  if (hasGuildHook(cov)) return 'enforced';
  if (cov.organization === 'professional-guilds' || (optionOn && cov.specialists.some((s) => s.guildRank))) return 'shown';
  return undefined;
}

export type CraftGuildRank = NonNullable<Specialist['guildRank']>;

/** Guild Member Ages & Abilities (City & Guild ch.3), with what each rank needs at character creation. */
export const CRAFT_GUILD_RANKS: Record<CraftGuildRank, { label: string; age: number; craft: number; lore: number; bargain: number; leadership: number; artes?: number; note: string }> = {
  apprentice: { label: 'Apprentice', age: 10, craft: 3, lore: 0, bargain: 0, leadership: 0, note: 'Seven years with a master; an apprentice piece (Craft + Characteristic + stress die vs 9) makes a journeyman.' },
  journeyman: { label: 'Journeyman', age: 20, craft: 5, lore: 1, bargain: 2, leadership: 0, note: 'Works for a master under a contract; pays yearly dues.' },
  master: { label: 'Master', age: 25, craft: 5, lore: 2, bargain: 3, leadership: 0, artes: 1, note: 'Runs a workshop with up to Leadership journeymen and apprentices (the covenant’s servants); keeps written contracts (Artes Liberales).' },
  senior: { label: 'Senior master', age: 36, craft: 7, lore: 3, bargain: 1, leadership: 3, note: 'Ten years a master; Leadership about half the Craft score; may serve as an alderman.' },
  dean: { label: 'Dean', age: 50, craft: 7, lore: 5, bargain: 5, leadership: 5, note: 'Heads the guild; a stipend of 20 to 40 pounds where a town guild pays one.' },
};
export const CRAFT_GUILD_ORDER: CraftGuildRank[] = ['apprentice', 'journeyman', 'master', 'senior', 'dean'];

/** The rank a craftsman's age and Craft score suggest (City & Guild, Guild Member Ages & Abilities). */
export function suggestedGuildRank(age: number | undefined, craft: number): CraftGuildRank {
  const a = age ?? 30;
  if (a < 20 || craft < 5) return 'apprentice';
  if (a >= 50 && craft >= 7) return 'dean';
  if (a >= 40 && craft >= 7) return 'senior';
  if (a >= 30) return 'master';
  return 'journeyman';
}

const scoreOf = (s: Specialist, re: RegExp) => Math.max(0, ...specAbilities(s).filter((a) => re.test(`${a.id} ${a.param ?? ''} ${a.label ?? ''}`)).map((a) => a.score));

/** What a craftsman lacks for their guild rank. */
export function guildShortfalls(s: Specialist): string[] {
  if (!s.guildRank) return [];
  const r = CRAFT_GUILD_RANKS[s.guildRank];
  const out: string[] = [];
  if (s.score < r.craft) out.push(`Craft ${r.craft}`);
  if (s.age !== undefined && s.age < r.age) out.push(`age ${r.age}`);
  const lore = scoreOf(s, /organization-lore|guild/i);
  if (lore < r.lore) out.push(`Guild Lore ${r.lore}`);
  if (scoreOf(s, /bargain/i) < r.bargain) out.push(`Bargain ${r.bargain}`);
  const lead = s.guildRank === 'senior' ? Math.max(r.leadership, Math.floor(s.score / 2)) : r.leadership;
  if (scoreOf(s, /leadership/i) < lead) out.push(`Leadership ${lead}`);
  if (r.artes && scoreOf(s, /artes-liberales/i) < r.artes) out.push(`Artes Liberales ${r.artes}`);
  return out;
}

/** The Abilities a craftsman needs for a rank besides the Craft, to add when making one. */
export function guildAbilities(rank: CraftGuildRank, craft: number): { id: string; param?: string; score: number }[] {
  const r = CRAFT_GUILD_RANKS[rank];
  const out: { id: string; param?: string; score: number }[] = [];
  if (r.lore) out.push({ id: 'organization-lore', param: 'Guild', score: r.lore });
  if (r.bargain) out.push({ id: 'bargain', score: r.bargain });
  const lead = rank === 'senior' ? Math.max(r.leadership, Math.floor(craft / 2)) : r.leadership;
  if (lead) out.push({ id: 'leadership', score: lead });
  if (r.artes) out.push({ id: 'artes-liberales', score: r.artes });
  return out;
}

// ------------------------------------------------------------------------------ Labor Points and the workshop

/** Seasons worked and free a year by the Wealthy Virtue or Poor Flaw (DE p.163; City & Guild ch.2: it sets free time, not profit). */
export function workSeasons(s: Specialist): { work: number; free: number } {
  return s.wealth === 'poor' ? { work: 3, free: 1 } : s.wealth === 'wealthy' ? { work: 1, free: 3 } : { work: 2, free: 2 };
}
const LABOR_MULT = { poor: 2, average: 3, wealthy: 6 } as const;
/** Keeping a business at its level costs 36 Labor Points a year (City & Guild ch.2). */
export const LABOR_UPKEEP = 36;

/** A craftsman's Labor Points a season: (primary Characteristic + Craft) × 2 Poor, 3 average, 6 Wealthy (City & Guild ch.2). */
export function laborPointsPerSeason(s: Specialist): number {
  return Math.max(0, specChar(s, 'Dex') + s.score) * LABOR_MULT[s.wealth ?? 'average'];
}

/** Workshop Total: primary Characteristic + Craft + Innovation + Raw Materials (City & Guild ch.4). */
export function craftsmanWorkshopTotal(s: Specialist): number {
  return specChar(s, 'Dex') + s.score + (s.workshop?.innovation ?? 0) + (s.workshop?.rawMaterials ?? 0);
}

/** Labor Points to raise Innovation or Raw Materials to the next point (City & Guild ch.4); Innovation stays with the workshop. */
export const INNOVATION_STEP = [100, 200, 300];
export const RAW_MATERIALS_STEP = [50, 100, 150];

// ------------------------------------------------------------------------------ Craft magic

export const CRAFT_TASKS: { label: string; ease: number }[] = [
  { label: 'Trivial', ease: 0 }, { label: 'Simple', ease: 3 }, { label: 'Easy', ease: 6 }, { label: 'Average', ease: 9 }, { label: 'Hard', ease: 12 },
  { label: 'Very Hard', ease: 15 }, { label: 'Impressive', ease: 18 }, { label: 'Remarkable', ease: 21 }, { label: 'Almost Impossible', ease: 24 },
];
/** Doing more than a day's work in one casting: +3 a month, +6 a season, +9 a year (Covenants ch.4, Rego Craft Magic). */
const SPAN_EASE: Record<CraftMagicUse['span'], number> = { day: 0, month: 3, season: 6, year: 9 };
/** Castings to do a craftsman's year of work (three working seasons, City & Guild ch.4): about sixty working days a season. */
export const SPAN_CASTS: Record<CraftMagicUse['span'], number> = { day: 180, month: 9, season: 3, year: 1 };
export const SPAN_LABEL: Record<CraftMagicUse['span'], string> = { day: 'a day’s work', month: 'a month’s work', season: 'a season’s work', year: 'a year’s work' };

/** Craft guidelines (Covenants ch.4, New Guidelines), as base levels before Range, Duration and Target. */
export const CRAFT_GUIDELINES: { id: string; technique: 'Cr' | 'Re'; form: 'An' | 'He' | 'Te'; base: number; label: string }[] = [
  { id: 'cran2', technique: 'Cr', form: 'An', base: 2, label: 'Preserve a corpse from decay' },
  { id: 'rean1', technique: 'Re', form: 'An', base: 1, label: 'Manipulate items made of animal products' },
  { id: 'rean2', technique: 'Re', form: 'An', base: 2, label: 'Treat items made of animal products' },
  { id: 'rean3', technique: 'Re', form: 'An', base: 3, label: 'Treat and process items made of animal products' },
  { id: 'crhe2', technique: 'Cr', form: 'He', base: 2, label: 'Preserve a dead plant from decay' },
  { id: 'rehe3', technique: 'Re', form: 'He', base: 3, label: 'Manipulate items made of plant products' },
  { id: 'rehe4', technique: 'Re', form: 'He', base: 4, label: 'Treat items made of plant products' },
  { id: 'rehe5', technique: 'Re', form: 'He', base: 5, label: 'Treat and process items made of plant products' },
  { id: 'rete2', technique: 'Re', form: 'Te', base: 2, label: 'Shape and form dirt as a craftsman would (+1 magnitude stone or glass, +2 metal or gems)' },
];

/** Chance a stress die adds at least `need` (DE p.7: a 1 doubles and rerolls; a 0 is 0, a 0 after a 1 is 10). */
function stressAtLeast(need: number): number {
  if (need <= 0) return 1;
  const exploded = (k: number): number => (k <= 2 ? 1 : 0.1 * [2, 3, 4, 5, 6, 7, 8, 9, 10].filter((v) => v >= k).length + 0.1 * exploded(k / 2));
  return 0.1 * [2, 3, 4, 5, 6, 7, 8, 9].filter((v) => v >= need).length + 0.1 * exploded(need / 2);
}

/** Chance of success, and of a botch, for a stress roll of `total` against `ease` with `botchDice` botch dice. */
export function stressChance(total: number, ease: number, botchDice = 1): { success: number; botch: number } {
  const botch = 0.1 * (1 - Math.pow(0.9, Math.max(0, botchDice)));
  const zeroOk = total >= ease ? 0.1 - botch : 0;
  return { success: Math.max(0, Math.min(1, stressAtLeast(ease - total) - (ease - total <= 0 ? 0.1 : 0) + zeroOk)), botch };
}

export interface CraftMagicFigures {
  /** the Perception + Finesse roll's Ease Factor: the task's +3, more for a longer span of work */
  ease: number;
  finesse: number;
  success: number;
  botch: number;
  /** rolls a year, and what is expected to go wrong */
  rolls: number;
  failures: number;
  botches: number;
  magnitude: number;
  /** pounds saved a year (Covenants ch.5: a pound per magnitude when cast repeatedly; five per magnitude each Ritual) */
  saving: number;
}

/** What a craft spell does for the covenant, for a caster's Perception + Finesse. */
export function craftMagicFigures(u: CraftMagicUse, perFinesse: number): CraftMagicFigures {
  const ease = u.taskEase + 3 + SPAN_EASE[u.span];
  const c = u.noFinesse ? { success: 1, botch: 0 } : stressChance(perFinesse, ease);
  const rolls = u.noFinesse ? 0 : Math.max(0, u.castsPerYear);
  const magnitude = Math.max(1, Math.ceil(u.level / 5));
  const saving = !u.active ? 0 : u.ritual ? 5 * magnitude * Math.max(0, u.castsPerYear) : magnitude;
  return { ease, finesse: perFinesse, success: c.success, botch: c.botch, rolls, failures: Math.round(rolls * (1 - c.success) * 10) / 10, botches: Math.round(rolls * c.botch * 10) / 10, magnitude, saving: Math.round(saving * 10) / 10 };
}

// ------------------------------------------------------------------------------ The year's experience

/** Exposure and Practice (DE p.163): 2 and 4 experience a season. */
const EXPOSURE = 2;
const PRACTICE = 4;

/** Add experience to one of a specialist's Abilities, raising its score as it fills. */
function addXp(a: { score: number; xp?: number }, xp: number): boolean {
  let pool = (a.xp ?? 0) + xp;
  let rose = false;
  while (pool >= abilityXpForScore(a.score + 1) - abilityXpForScore(a.score)) {
    pool -= abilityXpForScore(a.score + 1) - abilityXpForScore(a.score);
    a.score += 1;
    rose = true;
  }
  a.xp = pool;
  return rose;
}

/**
 * A year of work and free time for the covenant's specialists and craftsmen (DE p.163; City & Guild):
 * working seasons give Exposure in the job (Teaching for a teacher's seasons of teaching, the Craft
 * for a craftsman), free seasons give Practice, spent bringing a lesser Ability up to their best or
 * else raising the best. Teachers practise in the seasons nobody asked them to teach. Craftsmen also
 * earn Labor Points for their workshop. Their Build Points stay as bought.
 */
export function covenfolkYearEnd(cov: Covenant, year: number): string[] {
  if (cov.folkAdvance === false) return [];
  const lines: string[] = [];
  for (const s of cov.specialists) {
    if (s.characterId || s.hired || countOf(s) === 0) continue;
    if (!s.free && s.boughtFor === undefined) s.boughtFor = specialistUnitCost(s);
    // older entries keep only a name and a score: a craftsman's is their Craft
    if (!s.abilities?.length && (s.ability || s.score)) s.abilities = [s.role === 'craftsman' ? { id: 'craft-type', param: craftOf(s)?.name, score: s.score } : { id: '', score: s.score }];
    const list = s.abilities ?? [];
    if (!list.length) continue;
    const { work, free } = workSeasons(s);
    const notes: string[] = [];
    const top = () => list.reduce((b, a) => (a.score > b.score ? a : b), list[0]);
    const jobAbility = () => {
      if (s.role === 'craftsman') return list.find((a) => /craft/.test(a.id)) ?? top();
      const job = ROLE_BY_ID.get(s.role)?.ability;
      return (job && list.find((a) => a.id === job.id && (a.param ?? '') === (job.param ?? ''))) ?? top();
    };
    // a teacher's working seasons are the ones spent teaching; any not taught become free study
    const taught = s.role === 'teacher' || s.role === 'drill-sergeant' ? Math.min(work, s.taught?.year === year ? s.taught.seasons : 0) : work;
    const practice = free + (work - taught);
    if (taught) {
      if (s.role === 'teacher' || s.role === 'drill-sergeant') {
        const t = { score: s.teaching ?? 0, xp: s.teachingXp };
        if (addXp(t, EXPOSURE * taught)) notes.push(`Teaching ${t.score}`);
        s.teaching = t.score;
        s.teachingXp = t.xp;
      } else {
        const j = jobAbility();
        if (addXp(j, EXPOSURE * taught)) notes.push(`${abilityLabel(j)} ${j.score}`);
      }
    }
    for (let i = 0; i < practice; i++) {
      const best = top().score;
      const behind = list.filter((a) => a.score < best).sort((a, b) => a.score - b.score)[0];
      const target = behind ?? jobAbility();
      if (addXp(target, PRACTICE)) notes.push(`${abilityLabel(target)} ${target.score}`);
    }
    const t = top();
    s.score = t.score;
    if (s.role === 'craftsman') {
      const craft = craftOf(s);
      const lp = laborPointsPerSeason(s) * work - LABOR_UPKEEP;
      s.workshop = { innovation: s.workshop?.innovation ?? 0, rawMaterials: s.workshop?.rawMaterials ?? 0, laborPoints: Math.max(0, (s.workshop?.laborPoints ?? 0) + lp) };
      if (lp > 0 && craft) notes.push(`+${lp} Labor Points`);
    }
    if (s.age !== undefined) s.age += 1;
    if (notes.length) {
      const text = `A year’s work (${taught} season${taught === 1 ? '' : 's'} at the job, ${practice} free): ${notes.join(', ')}.`;
      s.history = [...(s.history ?? []), { year, season: 'Winter', text }];
      lines.push(`${s.name || roleLabel(s.role)}: ${notes.join(', ')}.`);
    }
  }
  return lines;
}

function abilityLabel(a: { id: string; param?: string }): string {
  const name = a.id.replace(/-type$/, '').split('-').map((w, i) => (i > 0 && ['and', 'of', 'the'].includes(w) ? w : w.charAt(0).toUpperCase() + w.slice(1))).join(' ');
  return `${name}${a.param ? `: ${a.param}` : ''}`;
}

// ------------------------------------------------------------------------------ The covenant rolls

/** The covenant rolls (Grogs, The Chamberlain): a summa on Profession: Chamberlain, Quality 6, Level 2 + 1 per two decades. */
export function covenantRollsLevel(cov: Covenant, year: number): number {
  return 2 + Math.floor(Math.max(0, year - cov.foundedYear) / 20);
}

// ------------------------------------------------------------------------------ Loyalty from the officers

/** The officers' Loyalty: Presence + the role's Ability; an autocrat adds both the steward's and the chamberlain's (Covenants ch.4). */
export function officerLoyalty(s: Specialist): { label: string; value: number }[] {
  const pre = specChar(s, 'Pre');
  const by = (param: string) => {
    const a = specAbilities(s).find((x) => (x.param ?? '').toLowerCase() === param.toLowerCase() || (x.label ?? '').toLowerCase().includes(param.toLowerCase()));
    return a?.score;
  };
  if (s.role === 'autocrat') {
    const st = by('Steward') ?? specHighest(s);
    const ch = by('Chamberlain') ?? specHighest(s);
    return [
      { label: `${s.name} (autocrat: steward)`, value: pre + st },
      { label: `${s.name} (autocrat: chamberlain)`, value: pre + ch },
    ];
  }
  if (s.role === 'turb-captain' || s.role === 'steward' || s.role === 'chamberlain') return [{ label: `${s.name} (${s.role})`, value: pre + specHighest(s) }];
  return [];
}
