// A craftsman's or laborer's livelihood (City & Guild, ch.2 Labor): Labor Points, the Workshop Total
// against a Craft Level, the quality of a season's goods, workshop exertion, and selling.

import { CHAR_NAMES } from '../data';
import { defaultRng, describeStress, simpleDie, stressDie, type Rng } from './dice';
import type { DerivedCharacter } from './character/derive';
import { applySeason, newSeasonEntry } from './longterm';
import type { Character, Season } from './types';

export type Wealth = 'poor' | 'average' | 'wealthy';
/** Labor Points per season are multiplied by this (C&G, Labor and Livelihood) */
export const WEALTH_MULT: Record<Wealth, number> = { poor: 2, average: 3, wealthy: 6 };
/** Labor Points a year to keep a business at its level, plus 5 a point of Raw Materials */
export const UPKEEP = 36;
/** total Labor Points for Innovation and Raw Materials +1/+2/+3 */
export const INNOVATION_COST = [0, 100, 300, 600];
export const RAW_MATERIALS_COST = [0, 50, 150, 300];
/** Labor Points to rise a step: Poor → average, average → Wealthy, Wealthy → Poor in the next Social Status */
export const WEALTH_STEP: Record<Wealth, { to: string; cost: number }> = {
  poor: { to: 'average', cost: 120 },
  average: { to: 'Wealthy', cost: 360 },
  wealthy: { to: 'Poor in the next higher Social Status', cost: 1080 },
};

export function wealthOf(d: DerivedCharacter): Wealth {
  if (d.virtues.some((v) => v.cv.defId === 'wealthy')) return 'wealthy';
  if (d.virtues.some((v) => v.cv.defId === 'poor-flaw')) return 'poor';
  return 'average';
}

export function upkeep(rawMaterials: number): number {
  return UPKEEP + 5 * Math.max(0, rawMaterials);
}

/** Labor Points for a season tending the business: (Characteristic + Ability) × wealth, less 3 for each worker an understaffed master lacks. */
export function laborPoints(characteristic: number, ability: number, wealth: Wealth, missingWorkers = 0): number {
  return Math.max(0, (characteristic + ability) * WEALTH_MULT[wealth] - 3 * Math.max(0, missingWorkers));
}

export interface WorkshopInput {
  characteristic: { label: string; value: number };
  ability: { label: string; value: number };
  innovation: number;
  rawMaterials: number;
  /** assistants' Craft scores: half their sum, rounded up */
  assistants: number[];
  /** a craft manual's score (one a season, not one's own) */
  manual?: number;
  /** a simple die from exerting oneself */
  exertion?: number;
}

export function workshopTotal(i: WorkshopInput): { total: number; parts: { label: string; value: number }[] } {
  const parts = [i.characteristic, i.ability];
  if (i.innovation) parts.push({ label: 'Workshop Innovation', value: i.innovation });
  if (i.rawMaterials) parts.push({ label: 'Raw Materials', value: i.rawMaterials });
  const help = Math.ceil(i.assistants.reduce((s, n) => s + Math.max(0, n), 0) / 2);
  if (help) parts.push({ label: `Assistants (half of ${i.assistants.join(' + ')}, rounded up)`, value: help });
  if (i.manual) parts.push({ label: 'Craft manual', value: i.manual });
  if (i.exertion) parts.push({ label: 'Exertion (simple die)', value: i.exertion });
  return { total: parts.reduce((s, p) => s + p.value, 0), parts };
}

export type Quality = 'shoddy' | 'standard' | 'superior' | 'excellent';

export interface QualityResult {
  quality: Quality;
  /** an excellent item's bonus: +1, and +1 for every 3 points beyond its Craft Level, up to Craft ÷ 3 rounded up */
  bonus: number;
  bonusLimit: number;
  /** the Craft Levels at this base */
  levels: Record<Quality, number>;
  /** a point of (Craft) Reputation experience: 6 or more over the standard Craft Level */
  reputationXp: number;
  text: string;
}

/** The best goods a Workshop Total makes against a base Craft Level (6, raised by the situation). */
export function craftQuality(total: number, baseLevel: number, craft: number): QualityResult {
  const levels: Record<Quality, number> = { shoddy: baseLevel - 3, standard: baseLevel, superior: baseLevel + 6, excellent: baseLevel + 9 };
  const bonusLimit = Math.max(1, Math.ceil(craft / 3));
  const quality: Quality = total >= levels.excellent ? 'excellent' : total >= levels.superior ? 'superior' : total >= levels.standard ? 'standard' : 'shoddy';
  const bonus = quality === 'excellent' ? Math.min(bonusLimit, 1 + Math.floor((total - levels.excellent) / 3)) : quality === 'superior' ? 1 : 0;
  const text = {
    shoddy: 'Shoddy goods: they pass for standard, but break on a botch.',
    standard: 'Standard goods.',
    superior: 'Superior goods: +1 to one feature, for one specific activity.',
    excellent: `Excellent goods: +${bonus} to a feature, for every use of it${bonus === bonusLimit ? ` (the most your Craft allows)` : ''}.`,
  }[quality];
  return { quality, bonus, bonusLimit, levels, reputationXp: total >= baseLevel + 6 ? 1 : 0, text };
}

/** Items made in a season: the number a Craft 5 craftsman makes, scaled by Craft ÷ 5, rounded up. */
export function seasonalOutput(per5: number, craft: number): number {
  return Math.ceil((per5 * craft) / 5 - 1e-9);
}

/** Workshop Exertion: a simple die on the Workshop Total, a stress die on the results chart, and an aging roll. */
export function rollExertion(rng: Rng = defaultRng): { bonus: number; lines: string[]; disaster: boolean; noBenefit: boolean } {
  const die = simpleDie(rng).value;
  const r = stressDie(1, rng);
  const head = `Exertion: Workshop Total +${die}. Results chart: ${describeStress(r)}`;
  let text: string;
  let noBenefit = false;
  if (r.botches) text = 'Disaster: ruined stock or materials, a workshop accident, a guild fine, or fire (storyguide).';
  else if (r.value <= 3) text = 'No special results.';
  else if (r.value <= 5) text = 'Disappointing ramifications: unwelcome attention, scarcer materials, a market glut or an enemy (storyguide).';
  else if (r.value <= 7) {
    text = 'No benefit: the exertion adds nothing to the Workshop Total this season.';
    noBenefit = true;
  } else if (r.value === 8) text = 'Story event.';
  else if (r.value === 9) text = `Invention: ${simpleDie(rng).value} Labor Points toward the workshop's Innovation.`;
  // the chart skips 11; it is read as the 10 below it
  else if (r.value <= 11) text = `Increased Reputation: ${simpleDie(rng).value} experience in the (Craft) Reputation.`;
  else text = `Increased understanding: ${simpleDie(rng).value} experience points in the Craft.`;
  return {
    bonus: noBenefit ? 0 : die,
    lines: [`${head}: ${text}`, 'Make an aging roll this season whatever your age (a simple die under 35, and ignore the Crisis of a 13).'],
    disaster: r.botches > 0,
    noBenefit,
  };
}

/** Selling to a typical customer: Presence + Bargain + simple die vs 9 gets 10% over the standard price, +10% a point beyond, up to 50%. */
export function sellGoods(presence: number, bargain: number, rng: Rng = defaultRng): { roll: number; premium: number; text: string } {
  const die = simpleDie(rng).value;
  const roll = presence + bargain + die;
  const premium = roll >= 9 ? Math.min(50, 10 * (roll - 8)) : 0;
  return { roll, premium, text: `Presence ${presence} + Bargain ${bargain} + die ${die} = ${roll} vs 9: ${premium ? `sold for ${premium}% over the standard price` : 'the standard price'}.` };
}

/** A wondrous item (Touched by (Realm)): Craft Level 12 + magnitude + uses a day; it gathers (Workshop Total − Craft Level) a season until it reaches the Craft Level. */
export function wondrousItem(total: number, magnitude: number, frequency: number, situation = 0): { craftLevel: number; perSeason: number; seasons: number } {
  const craftLevel = 12 + magnitude + frequency + situation;
  const perSeason = total - craftLevel;
  return { craftLevel, perSeason, seasons: perSeason > 0 ? Math.ceil(craftLevel / perSeason) : Infinity };
}

// ------------------------------------------------------------------ a season and a year of work

export interface WorkshopFigures {
  trade?: { uid: string; name: string; total: number; abilityId: string };
  craft: number;
  wealth: Wealth;
  /** Labor Points a season */
  lp: number;
  total: { total: number; parts: { label: string; value: number }[] };
  baseLevel: number;
  leadership: number;
  maxAssistants: number;
  missing: number;
}

/** A tracked workshop's numbers this season (City & Guild); `situation` raises the base Craft Level. */
export function workshopFigures(c: Character, d: DerivedCharacter, situation = 0): WorkshopFigures | null {
  const w = c.workshop;
  if (!w) return null;
  const trades = d.abilities.filter((a) => a.abilityId.startsWith('craft') || a.abilityId.startsWith('profession'));
  const trade = d.abilityByUid.get(w.abilityUid ?? '') ?? trades[0];
  const craft = trade?.total ?? 0;
  const profession = !!trade?.abilityId.startsWith('profession');
  const wealth = wealthOf(d);
  const primary = d.characteristics[w.primary].value;
  // Labor Points: (primary + Craft) or (Communication + Profession), times wealth
  const lpChar = profession ? d.characteristics.Com.value : primary;
  const leadership = d.abilities.find((a) => a.abilityId === 'leadership')?.total ?? 0;
  const maxAssistants = Math.max(1, leadership);
  const missing = w.guildMaster ? Math.max(0, leadership - w.assistants.length) : 0;
  const total = workshopTotal({
    characteristic: { label: CHAR_NAMES[w.primary], value: primary }, ability: { label: trade?.name ?? 'Craft', value: craft },
    innovation: w.innovation, rawMaterials: w.rawMaterials, assistants: w.assistants.slice(0, maxAssistants).map((a) => a.craft), manual: w.manual,
  });
  return {
    trade: trade ? { uid: trade.uid, name: trade.name, total: trade.total, abilityId: trade.abilityId } : undefined, craft, wealth, lp: laborPoints(lpChar, craft, wealth, missing) + (w.contractLp ?? 0),
    total, baseLevel: 6 + situation + w.craftLevelMod, leadership, maxAssistants, missing,
  };
}

/** Work a season in the workshop: the goods it makes, Labor Points, Reputation, and the season logged (2 Exposure xp in the craft). */
export function workshopSeason(c: Character, d: DerivedCharacter, year: number, season: Season, o: { exert?: boolean; situation?: number; rng?: Rng } = {}): string[] {
  const f = workshopFigures(c, d, o.situation ?? 0);
  const w = c.workshop;
  if (!f || !w) return [];
  const ex = o.exert ? rollExertion(o.rng) : null;
  const total = f.total.total + (ex?.bonus ?? 0);
  const res = craftQuality(total, f.baseLevel, f.craft);
  const lines = [`Workshop Total ${total}${ex?.bonus ? ` (with exertion +${ex.bonus})` : ''} vs Craft Level ${f.baseLevel}: ${res.text} +${f.lp} Labor Points.`];
  if (ex) lines.push(...ex.lines);
  if (res.reputationXp) lines.push('+1 experience in the (Craft) Reputation.');
  const shoddy = res.quality === 'shoddy';
  if (shoddy && w.shoddyStreak >= 1) lines.push('Shoddy again: −1 experience in the (Craft) Reputation.');
  w.laborPoints += f.lp;
  w.seasonsWorked += 1;
  w.reputationXp += res.reputationXp - (shoddy && w.shoddyStreak >= 1 ? 1 : 0);
  w.shoddyStreak = shoddy ? w.shoddyStreak + 1 : 0;
  const entry = newSeasonEntry(year, season, 'work', `Worked as ${f.trade?.name ?? 'a craftsman'}: ${res.quality} goods, +${f.lp} Labor Points (2 Exposure xp)`, f.trade ? { [`ability:${f.trade.uid}`]: 2 } : {});
  applySeason(c, entry, 1);
  c.seasonLog.push(entry);
  return lines;
}

/** Close a workshop's year: the upkeep in Labor Points, a word on overwork, speculation's return, returns falling due, and a miser's extra season. */
export function workshopYearEnd(c: Character, d: DerivedCharacter, year?: number): string[] {
  const w = c.workshop;
  if (!w) return [];
  const keep = upkeep(w.rawMaterials);
  const over = wealthOf(d) !== 'poor' && w.seasonsWorked >= 3;
  const lines: string[] = [];
  // commodity speculation: a Labor Point a year for every ten stored, the stake kept (City & Guild ch.7)
  const spec = Math.floor((w.speculation ?? 0) / 10);
  if (spec) ((w.laborPoints += spec), lines.push(`Speculation returns ${spec} Labor Points (${w.speculation} stored).`));
  for (const p of (w.pending ?? []).filter((x) => year !== undefined && x.year <= year)) ((w.laborPoints += p.lp), lines.push(`${p.note}: +${p.lp} Labor Points.`));
  if (year !== undefined) w.pending = (w.pending ?? []).filter((x) => x.year > year);
  // a Wealthy character living as an average one gains a season every three years, as a Poor one every year (City & Guild ch.2)
  if (w.miserly && wealthOf(d) === 'wealthy' && year !== undefined) {
    const every = w.miserly === 'poor' ? 1 : 3;
    if (w.miserMark === undefined || year - w.miserMark >= every) {
      const season = seasonWorth(c, d);
      w.laborPoints += season;
      w.miserMark = year;
      lines.push(`Living as ${w.miserly === 'poor' ? 'a Poor' : 'an average'} merchant: +${season} Labor Points, and ${w.miserly === 'poor' ? 3 : 1} experience in a Reputation for miserliness.`);
    }
  }
  w.laborPoints -= keep;
  w.seasonsWorked = 0;
  lines.unshift(
    `Workshop: −${keep} Labor Points to keep the business (${w.laborPoints} left).${w.laborPoints < 0 ? ' Not enough: the business slips (the storyguide may lower its wealth).' : ''}${over ? ' Working three or more seasons gains a negative Reputation for impiety or avarice.' : ''}`,
  );
  return lines;
}

/** A season's worth of Labor Points: what stories and investments are reckoned in (City & Guild ch.2). */
export function seasonWorth(c: Character, d: DerivedCharacter): number {
  const f = workshopFigures(c, d);
  return f ? Math.max(1, f.lp) : 0;
}

/** Labor Points from stories (City & Guild ch.2): by the part the character played. */
export const STORY_AWARDS: { seasons: number; label: string }[] = [
  { seasons: 0.5, label: 'A subplot of a story the magi deal with' },
  { seasons: 1, label: 'Severe danger or hardship to finish the subplot' },
  { seasons: 1.5, label: 'The subplot was pivotal to the story' },
  { seasons: 2, label: 'The central character of the story' },
  { seasons: 2.5, label: 'Failure would have hurt the city or covenant badly' },
];

/** What surplus Labor Points can be invested in (City & Guild ch.7, Investments Suited to all Merchants), in seasons' worth. */
export const INVESTMENTS: { id: string; label: string; seasons: number; hint: string }[] = [
  { id: 'charity', label: 'Charity', seasons: 1, hint: 'A season’s worth given: 1 experience in a Reputation for charity. Having given a wealth multiple of Labor Points this year, the character can summon a crowd of those it helps.' },
  { id: 'legal', label: 'A lawsuit', seasons: 0.5, hint: 'Half a season’s worth a suit; it takes a season, without the merchant present.' },
  { id: 'introduction', label: 'Introduction agent', seasons: 2, hint: 'Two seasons’ worth now, three seasons’ worth back after two years; the junior merchant owes a Favor, to be collected within the two years.' },
  { id: 'marriage', label: 'Marriage broker', seasons: 2, hint: 'Two seasons’ worth, lost: a point in a Reputation, Social Contacts for three years, and Favors owed by the couple.' },
];

/** Detecting a boom (City & Guild ch.7): Intelligence + Area Lore + a stress die. */
export function boomRoll(int: number, areaLore: number, rng: Rng = defaultRng): string {
  const r = stressDie(1, rng);
  const t = r.value + int + areaLore;
  if (r.botches) return `Boom roll: botch — the business is destroyed.`;
  const what =
    t >= 18 ? 'prepared for years: two seasons’ Labor Points back for every season’s worth set aside, once the boom comes'
    : t >= 15 ? 'everything put in as the boom starts: a season and a half back for every season’s worth, that year'
    : t >= 7 ? 'no advantage'
    : '2 of every 10 Labor Points invested are lost';
  return `Boom roll (Int + Area Lore ${int + areaLore} + ${describeStress(r)} = ${t}): ${what}.`;
}

/** Smuggling as an investment of time (City & Guild ch.7): (Intelligence + Intrigue) × the wealth multiplier a season. */
export const smugglingLp = (int: number, intrigue: number, wealth: Wealth) => Math.max(0, (int + intrigue) * WEALTH_MULT[wealth]);

// ------------------------------------------------------------------------------ Damaged goods (C&G ch.4)

export type ItemQuality = 'shoddy' | 'standard' | 'superior' | 'excellent' | 'supernatural';

/** Damage levels an item takes before it breaks: by quality, multiplied by Size; a lock has twice as many. */
export function itemDamageLevels(quality: ItemQuality, size: number, lock = false): number {
  const base = { shoddy: 1, standard: 2, superior: 3, excellent: 4, supernatural: 5 }[quality];
  const mult = size <= 1 ? 1 : size <= 5 ? 2 : size <= 8 ? 3 : 4;
  return base * mult * (lock ? 2 : 1);
}

/** The modifiers to an item's stress check, from the table (C&G, Damaged Goods). */
export const ITEM_CHECK_MODS: { id: string; label: string; value: number }[] = [
  { id: 'repaired', label: 'Previously repaired', value: -1 },
  { id: 'poorLight', label: 'Poor lighting or weather', value: -1 },
  { id: 'noLight', label: 'Severe weather or no light', value: -3 },
  { id: 'prolonged', label: 'Prolonged use', value: -3 },
];
export const ITEM_QUALITY_MOD: Record<ItemQuality, number> = { shoddy: -1, standard: 0, superior: 1, excellent: 3, supernatural: 5 };

/** A stress check when a botch or unnatural use puts an item at risk: stress die + modifiers against 15; a failure costs a damage level, a botch one more per botch. */
export function itemStressCheck(modifiers: number, rng: Rng = defaultRng, ease = 15): { lost: number; text: string } {
  const r = stressDie(1, rng);
  if (r.botches) return { lost: 1 + r.botches, text: `${describeStress(r)}: ${1 + r.botches} damage levels lost, and it could break.` };
  const total = r.value + modifiers;
  return total >= ease ? { lost: 0, text: `${describeStress(r)} ${signedNum(modifiers)} = ${total} vs ${ease}: it survives intact.` } : { lost: 1, text: `${describeStress(r)} ${signedNum(modifiers)} = ${total} vs ${ease}: one damage level lost.` };
}
const signedNum = (n: number) => (n < 0 ? `− ${-n}` : `+ ${n}`);

/** Picking a lock: Dexterity + Legerdemain + a stress die against these, by the lock's quality (C&G, Locks and Keys). */
export const LOCK_PICK_EASE: Partial<Record<ItemQuality, number>> = { shoddy: 9, standard: 12, superior: 15, excellent: 18 };

/** Repairing: a season, no roll; superior and excellent items need Craft of twice their bonus; a Labor Point per damage level. */
export function repairNeeds(quality: ItemQuality): { craft: number; text: string } {
  const bonus = ITEM_QUALITY_MOD[quality];
  if (quality === 'supernatural') return { craft: 0, text: 'Wondrous items stop working once damaged; Hermetic items cannot be repaired by Hermetic magic (only some Verditius can).' };
  return bonus > 0 ? { craft: 2 * bonus, text: `A season's work by a craftsman who can make it, with Craft ${2 * bonus} or more, and a Labor Point per damage level.` } : { craft: 0, text: 'A season’s work by a craftsman who can make it, and a Labor Point per damage level. A broken item cannot be repaired.' };
}
