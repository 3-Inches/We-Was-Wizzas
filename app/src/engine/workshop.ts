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

/** Close a workshop's year: the upkeep in Labor Points, and a word on overwork. */
export function workshopYearEnd(c: Character, d: DerivedCharacter): string[] {
  const w = c.workshop;
  if (!w) return [];
  const keep = upkeep(w.rawMaterials);
  const over = wealthOf(d) !== 'poor' && w.seasonsWorked >= 3;
  w.laborPoints -= keep;
  w.seasonsWorked = 0;
  return [
    `Workshop: −${keep} Labor Points to keep the business (${w.laborPoints} left).${w.laborPoints < 0 ? ' Not enough: the business slips (the storyguide may lower its wealth).' : ''}${over ? ' Working three or more seasons gains a negative Reputation for impiety or avarice.' : ''}`,
  ];
}
