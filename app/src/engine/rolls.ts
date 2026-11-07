// The rolls of a session that two sides or the world take part in: opposed rolls, a blow in combat
// from start to wound, and the perils of the core book (DE, Other Perils): falls and things falling,
// fire and corrosion, poison and disease, going without air, water or food.

import type { Characteristic } from '../data';
import { defaultRng, describeStress, simpleDie, stressDie, type Rng } from './dice';

export type WoundLevel = 'none' | 'light' | 'medium' | 'heavy' | 'incapacitating' | 'dead';

/** Usual pairings for an opposed roll (the core book names few: Entrancement against the target's Stamina). */
export const OPPOSED_PRESETS: { id: string; label: string; a: [Characteristic, string]; b: [Characteristic, string]; book?: boolean }[] = [
  { id: 'sneak', label: 'Sneaking past someone', a: ['Dex', 'stealth'], b: ['Per', 'awareness'] },
  { id: 'lie', label: 'A lie, a disguise or a bluff', a: ['Com', 'guile'], b: ['Per', 'folk-ken'] },
  { id: 'pocket', label: 'Picking a pocket, sleight of hand', a: ['Dex', 'legerdemain'], b: ['Per', 'awareness'] },
  { id: 'charm', label: 'Winning over someone wary', a: ['Com', 'charm'], b: ['Per', 'folk-ken'] },
  { id: 'haggle', label: 'Haggling', a: ['Com', 'bargain'], b: ['Com', 'bargain'] },
  { id: 'intrigue', label: 'Plots and rumours at court', a: ['Com', 'intrigue'], b: ['Per', 'intrigue'] },
  { id: 'chase', label: 'A chase on foot', a: ['Dex', 'athletics'], b: ['Dex', 'athletics'] },
  { id: 'ride', label: 'A chase on horseback', a: ['Dex', 'ride'], b: ['Dex', 'ride'] },
  { id: 'wrestle', label: 'Wrestling, a contest of strength', a: ['Str', 'brawl'], b: ['Str', 'brawl'] },
  { id: 'track', label: 'Following a trail someone hides', a: ['Per', 'hunt'], b: ['Int', 'survival'] },
  { id: 'entrance', label: 'Entrancement (the book: Presence + Entrancement against the target’s Stamina roll)', a: ['Pre', 'entrancement'], b: ['Sta', ''], book: true },
];

export interface SideRoll {
  total: number;
  botched: boolean;
  text: string;
  /** the botch dice, when it botched (All According to Plan rerolls one) */
  faces?: number[];
  /** what a plain zero would have made: the total before the die */
  base: number;
  /** what Confidence or Faith added after the roll */
  bonus?: number;
}

function rollSide(mod: number, botchDice: number, simple: boolean, rng: Rng): SideRoll {
  if (simple) {
    const r = simpleDie(rng);
    return { total: mod + r.value, botched: false, text: `${mod} + ${r.value}`, base: mod };
  }
  const r = stressDie(botchDice, rng);
  return { total: r.botches ? 0 : mod + r.value, botched: r.botches > 0, text: `${mod} + ${describeStress(r)}`, base: mod, ...(r.botches ? { faces: r.botchFaces } : {}) };
}

export interface OpposedResult {
  a: SideRoll;
  b: SideRoll;
  /** who wins: on a tie the one resisting (b) holds, and nothing changes */
  winner: 'a' | 'b';
  margin: number;
  text: string;
}

/** Both sides roll; the higher total wins, and a tie goes to the one resisting (the toolkit's convention). */
export function opposedRoll(a: { mod: number; botch?: number; simple?: boolean }, b: { mod: number; botch?: number; simple?: boolean }, rng: Rng = defaultRng): OpposedResult {
  return opposedOutcome(rollSide(a.mod, a.botch ?? 1, !!a.simple, rng), rollSide(b.mod, b.botch ?? 1, !!b.simple, rng));
}

/** Who wins two rolls already made (again, once Confidence or All According to Plan changed one). */
export function opposedOutcome(ra: SideRoll, rb: SideRoll): OpposedResult {
  const winner = ra.botched && !rb.botched ? 'b' : rb.botched && !ra.botched ? 'a' : ra.total > rb.total ? 'a' : 'b';
  const margin = Math.abs(ra.total - rb.total);
  const tie = ra.total === rb.total && ra.botched === rb.botched;
  const text = `${ra.botched ? 'botch' : ra.total} against ${rb.botched ? 'botch' : rb.total}: ${tie ? 'a tie, so the one resisting holds' : winner === 'a' ? `the first side wins by ${margin}` : `the second side holds by ${margin}`}.`;
  return { a: ra, b: rb, winner, margin, text };
}

/** The wound a blow's excess over Soak gives: each wound level is 5 + Size points wide (DE, Wound Table). */
export function woundBySize(excess: number, size = 0): WoundLevel {
  if (excess <= 0) return 'none';
  const w = 5 + size;
  const levels: WoundLevel[] = ['light', 'medium', 'heavy', 'incapacitating'];
  return levels[Math.ceil(excess / w) - 1] ?? 'dead';
}

export interface Exchange {
  attack: SideRoll;
  defense: SideRoll;
  /** Attack Advantage: attack over defense, when the blow lands */
  advantage: number;
  damage: number;
  excess: number;
  wound: WoundLevel;
  text: string;
}

/**
 * One blow (DE, Combat): Attack (stress) against Defense (stress); if it lands, Damage = Attack
 * Advantage + the weapon's Damage, less Soak, and the excess gives the wound. A botch on attack
 * misses badly; one on defense lets it land.
 */
export interface ExchangeOptions {
  atk: number;
  dam: number;
  dfn: number;
  soak: number;
  size?: number;
  wound?: (excess: number) => WoundLevel;
}

export function exchange(o: ExchangeOptions, rng: Rng = defaultRng): Exchange {
  return exchangeOutcome(rollSide(o.atk, 1, false, rng), rollSide(o.dfn, 1, false, rng), o);
}

/** A blow from its two rolls (again, once Confidence or All According to Plan changed one). */
export function exchangeOutcome(attack: SideRoll, defense: SideRoll, o: ExchangeOptions): Exchange {
  const hits = !attack.botched && (defense.botched || attack.total > defense.total);
  const advantage = hits ? Math.max(1, attack.total - (defense.botched ? 0 : defense.total)) : 0;
  const damage = hits ? advantage + o.dam : 0;
  const excess = hits ? damage - o.soak : 0;
  const wound = hits ? (o.wound ?? ((x) => woundBySize(x, o.size ?? 0)))(excess) : 'none';
  const text = attack.botched
    ? `Attack ${attack.text}: a botch, the blow goes badly astray.`
    : !hits
      ? `Attack ${attack.total} against Defense ${defense.total}: it misses.`
      : `Attack ${attack.total} against Defense ${defense.botched ? 'botch' : defense.total}: Attack Advantage ${advantage}, Damage ${advantage} + ${o.dam} = ${damage}, less Soak ${o.soak} = ${excess}: ${wound === 'none' ? 'no wound' : `a${wound === 'incapacitating' ? 'n Incapacitating' : ` ${wound[0].toUpperCase()}${wound.slice(1)}`} Wound`}.`;
  return { attack, defense, advantage, damage, excess, wound, text };
}

/** Damage bonus for a fall: +1 for every two feet, doubled on a hard surface and halved on a soft one (DE, Impact). */
export function fallingBonus(feet: number, surface: 'normal' | 'hard' | 'soft'): number {
  const b = Math.floor(feet / 2);
  return surface === 'hard' ? b * 2 : surface === 'soft' ? Math.floor(b / 2) : b;
}

export const HEAT_SOURCES: { label: string; bonus: number }[] = [
  { label: 'Wood fire', bonus: 5 },
  { label: 'Boiling water', bonus: 3 },
  { label: 'Boiling oil', bonus: 6 },
  { label: 'Molten lead', bonus: 9 },
  { label: 'Molten iron', bonus: 12 },
  { label: 'Ice', bonus: 1 },
  { label: 'Lye', bonus: 3 },
  { label: 'Quicklime', bonus: 6 },
  { label: 'Vitriol', bonus: 9 },
];
/** How much of the character the heat covers: a hand or foot ×1, a limb ×2, half the body ×3, all of it ×4. */
export const COVERAGE: { label: string; mult: number }[] = [
  { label: 'a hand or foot', mult: 1 },
  { label: 'a whole limb', mult: 2 },
  { label: 'half the body', mult: 3 },
  { label: 'all of it', mult: 4 },
];
export const IMPACTS: { label: string; bonus: number }[] = [
  { label: 'A jug dropped from the second floor', bonus: 6 },
  { label: 'Inside a collapsing wooden house', bonus: 15 },
  { label: 'A mature tree felled onto them', bonus: 18 },
  { label: 'Inside a collapsing stone building', bonus: 21 },
];

/** A peril's damage (bonus + stress die, a botch doing nothing) against Soak + a stress die (DE, Injuries). */
export function perilDamage(bonus: number, soak: number, wound: (excess: number) => WoundLevel = (x) => woundBySize(x), rng: Rng = defaultRng): { excess: number; wound: WoundLevel; text: string } {
  const d = stressDie(1, rng);
  const s = stressDie(0, rng, true);
  if (d.botches) return { excess: 0, wound: 'none', text: `Damage +${bonus} + ${describeStress(d)}: a botch, no harm done.` };
  const dmg = bonus + d.value;
  const soaked = soak + s.value;
  const excess = dmg - soaked;
  const w = wound(excess);
  return { excess, wound: w, text: `Damage ${bonus} + ${describeStress(d)} = ${dmg} against Soak ${soak} + ${describeStress(s)} = ${soaked}: ${w === 'none' ? 'no wound' : `a ${w} wound`}.` };
}

/** A Stamina check against a poison, a disease or deprivation: stress die + Stamina (+ any bonus) against the Ease Factor. */
export function staminaCheck(stamina: number, ease: number, rng: Rng = defaultRng, botchDice = 1): { ok: boolean; text: string; total: number; faces?: number[] } {
  const r = stressDie(botchDice, rng);
  const total = r.botches ? 0 : stamina + r.value;
  const ok = !r.botches && total >= ease;
  return { ok, total: r.botches ? stamina : total, ...(r.botches ? { faces: r.botchFaces } : {}), text: `Stamina ${stamina} + ${describeStress(r)} = ${r.botches ? 'botch' : total} against ${ease}: ${ok ? 'resisted' : 'it takes hold'}.` };
}

/** Going without (DE, Deprivation): air every 30 seconds, water every day, food every three days; the Ease Factor starts at 3 and rises by one each time. */
export const DEPRIVATION: { id: 'air' | 'water' | 'food'; label: string; period: string; longTerm: boolean }[] = [
  { id: 'air', label: 'Air', period: '30 seconds', longTerm: false },
  { id: 'water', label: 'Water', period: 'day', longTerm: true },
  { id: 'food', label: 'Food', period: '3 days', longTerm: true },
];
export const deprivationEase = (periods: number) => 3 + Math.max(0, periods - 1);

/**
 * What a character's state takes off every roll and total they make (DE, Fatigue and Wounds): the
 * Wound Penalty, the Fatigue level's penalty and a disease's (Art & Academe), all added together, and
 * Encumbrance on physical tasks. Soak is not an action and takes none of them. Also what keeps them
 * from acting at all: an Incapacitating Wound, unconsciousness, a disease in crisis.
 */
export interface ActionPenalties {
  total: number;
  parts: { label: string; value: number }[];
  /** Encumbrance, for a physical task (Initiative already counts it) */
  encumbrance: number;
  /** why they cannot act, if they cannot */
  cannot?: string;
}

export function actionPenalties(d: {
  currentWoundPenalty: number;
  currentFatiguePenalty: number;
  currentDiseasePenalty: number;
  encumbrance: number;
  char: { wounds: { incapacitating: number; dead?: boolean }; fatigueLost: number; longTermFatigueLost: number; hungerLost?: number; illnesses?: { stage: string }[] };
}): ActionPenalties {
  const parts = [
    { label: 'wounds', value: d.currentWoundPenalty },
    { label: 'fatigue', value: d.currentFatiguePenalty },
    { label: 'disease', value: d.currentDiseasePenalty },
  ].filter((p) => p.value !== 0);
  const c = d.char;
  const cannot = c.wounds.dead
    ? 'dead'
    : c.wounds.incapacitating > 0
      ? 'Incapacitated: no actions until the wound improves'
      : c.fatigueLost + c.longTermFatigueLost + (c.hungerLost ?? 0) >= 5
        ? 'Unconscious'
        : (c.illnesses ?? []).some((i) => i.stage === 'Critical')
          ? 'a disease in crisis: no actions until it passes'
          : undefined;
  return { total: parts.reduce((t, p) => t + p.value, 0), parts, encumbrance: d.encumbrance, cannot };
}

export const penaltyText = (p: ActionPenalties) => p.parts.map((x) => `${x.label} ${x.value}`).join(', ');
