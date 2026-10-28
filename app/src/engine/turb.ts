// The turb's daily life (Grogs ch.2 and ch.4; Lords of Men): who stands which watch, staying awake on
// sentry and the toll of double duty, drilling a group together faster, the rewards and punishments
// a covenant hands out and what they do to a grog, retirement and pensions; and the bargaining and
// bribes of grogs sent to deal with mundanes for their masters.

import { defaultRng, describeStress, simpleDie, stressDie, type Rng } from './dice';
import type { Character } from './types';

// ------------------------------------------------------------------------------ Watches

/** The eight watches of the day, from eventide (Grogs, The Watches). */
export const WATCHES: { id: string; label: string; starts: string; night: boolean }[] = [
  { id: 'eventide', label: 'Eventide', starts: '6 pm', night: true },
  { id: 'nighttide', label: 'Nighttide', starts: '9 pm', night: true },
  { id: 'midnight', label: 'Midnight', starts: 'midnight', night: true },
  { id: 'foredawn', label: 'Foredawn', starts: '3 am', night: true },
  { id: 'morntide', label: 'Morntide', starts: '6 am', night: false },
  { id: 'forenoon', label: 'Forenoon', starts: '9 am', night: false },
  { id: 'afternoon', label: 'Afternoon', starts: 'noon', night: false },
  { id: 'foredusk', label: 'Foredusk', starts: '3 pm', night: false },
];

export type Patrol = 'day' | 'night';
export type Duty = 'duty' | 'off' | 'free';

/**
 * What a grog of a patrol and watch (1 to 4) is doing at a time of day (Grogs, Watch Patterns). On
 * single duty each watch stands one in four; on double duty the first and second watches stand
 * together, then the third and fourth. Between duties the day patrol is off duty by day and asleep
 * (free) by night; the night patrol the other way about.
 */
export function dutyAt(patrol: Patrol, watch: number, at: number, double = false): Duty {
  const i = ((at % 8) + 8) % 8;
  const slot = i % 4;
  const onDuty = double ? Math.floor(slot / 2) === Math.floor((watch - 1) / 2) : slot === watch - 1;
  if (onDuty) return 'duty';
  const night = i < 4;
  return (patrol === 'day') === night ? 'free' : 'off';
}

/** Staying awake on sentry: Stamina + Concentration + a simple die against 3 (single duty) or 6 (double), +3 at night (Grogs). */
export function stayAwakeEase(double: boolean, night: boolean): number {
  return (double ? 6 : 3) + (night ? 3 : 0);
}

export function rollStayAwake(stamina: number, concentration: number, double: boolean, night: boolean, rng: Rng = defaultRng): { ok: boolean; text: string } {
  const ease = stayAwakeEase(double, night);
  const r = simpleDie(rng);
  const total = r.value + stamina + concentration;
  const ok = total >= ease;
  return {
    ok,
    text: `Stamina + Concentration ${stamina + concentration} + ${r.value} = ${total} vs ${ease}: ${ok ? 'awake' : `dozing: −9 to Awareness; woken suddenly, −1 to all actions for ${Math.max(0, 6 - stamina)} rounds`}.`,
  };
}

/** Double duty wears on: a Stamina + simple die roll at dusk against 3 + the double duties since the last normal one, or a Long-Term Fatigue level (Grogs). */
export function rollDoubleDuty(stamina: number, doubleDuties: number, rng: Rng = defaultRng): { ok: boolean; text: string } {
  const ease = 3 + Math.max(0, doubleDuties);
  const r = simpleDie(rng);
  const total = r.value + stamina;
  const ok = total >= ease;
  return { ok, text: `Stamina ${stamina} + ${r.value} = ${total} vs ${ease}: ${ok ? 'holds up' : 'loses a Long-Term Fatigue level (not regained until a normal shift or ten hours’ sleep)'}.` };
}

// ------------------------------------------------------------------------------ Drill

/** Shortening a group's training (Grogs; Lords of Men ch.9): Communication + Leadership + a stress die against the time allowed. */
export const GROUP_TRAINING: { label: string; ease: number }[] = [
  { label: 'Two months', ease: 6 },
  { label: 'Six weeks', ease: 9 },
  { label: 'One month', ease: 12 },
  { label: 'A fortnight', ease: 15 },
  { label: 'One week', ease: 18 },
];

export function rollGroupTraining(com: number, leadership: number, ease: number, rng: Rng = defaultRng): { ok: boolean; text: string } {
  const r = stressDie(1, rng);
  if (r.botches) return { ok: false, text: `Communication + Leadership ${com + leadership} + ${describeStress(r)}: botch — the season's training is wasted.` };
  const total = r.value + com + leadership;
  const ok = total >= ease;
  return { ok, text: `Communication + Leadership ${com + leadership} + ${describeStress(r)} = ${total} vs ${ease}: ${ok ? 'they fight as a trained group by then' : 'not a trained group until the season ends'}.` };
}

// ------------------------------------------------------------------------------ Rewards and punishments

export interface Discipline {
  id: string;
  label: string;
  kind: 'reward' | 'punishment';
  hint: string;
  /** wounds dealt: Light, Medium, Heavy */
  wounds?: { light?: number; medium?: number; heavy?: number };
  /** Long-Term Fatigue levels lost */
  fatigue?: number;
  /** a year's change to the Living Conditions Modifier on aging rolls (here, + is better) */
  living?: number;
  /** ordered by a magus: the Covenants punishment level (0 minor humiliation … 4 brutal punishment) for the Loyalty Point penalty */
  loyaltyLevel?: number;
}

/** The liber gregis's rewards and punishments, in order of severity (Grogs ch.2). */
export const DISCIPLINE: Discipline[] = [
  { id: 'rations', label: 'Improved rations for a year', kind: 'reward', living: 1, hint: 'Wastel bread, fresh meat, a double ration of ale: a year of it makes the aging roll 1 better.' },
  { id: 'pay', label: 'Pay and a half', kind: 'reward', hint: 'For a season or more, or for good; grogs hoard it for a favor or a better weapon.' },
  { id: 'equipment', label: 'Improved equipment', kind: 'reward', hint: 'Expensive arms or armor, or well-made ones with a bonus (City & Guild); given up again if demoted.' },
  { id: 'promotion', label: 'Promotion in rank', kind: 'reward', hint: 'Grog to custos, custos to sergeant (or the like for servants and specialists): better food, quarters, pay and pension.' },
  { id: 'castigation', label: 'Castigation', kind: 'punishment', loyaltyLevel: 0, hint: 'A single blow with the rod, on the spot.' },
  { id: 'duties', label: 'Inferior duties', kind: 'punishment', loyaltyLevel: 1, hint: 'The latrines, or a magus’s worst chores, in their free time.' },
  { id: 'reduced1', label: 'Reduced rations (a season or two)', kind: 'punishment', living: -1, loyaltyLevel: 2, hint: 'Barley for wheat, no meat, small beer: the year’s aging roll is 1 worse.' },
  { id: 'reduced3', label: 'Reduced rations (three or four seasons)', kind: 'punishment', living: -2, loyaltyLevel: 2, hint: 'The year’s aging roll is 2 worse.' },
  { id: 'flog1', label: 'Flogging: one blow', kind: 'punishment', wounds: { light: 1 }, fatigue: 1, loyaltyLevel: 4, hint: 'In front of the covenant, with a strap: a Light Wound, a Long-Term Fatigue level.' },
  { id: 'flog5', label: 'Flogging: five blows', kind: 'punishment', wounds: { light: 2 }, fatigue: 3, loyaltyLevel: 4, hint: 'Two Light Wounds, three Long-Term Fatigue levels.' },
  { id: 'flog10', label: 'Flogging: ten blows', kind: 'punishment', wounds: { light: 3 }, fatigue: 5, loyaltyLevel: 4, hint: 'Three Light Wounds, five Long-Term Fatigue levels.' },
  { id: 'demotion', label: 'Reduction in rank', kind: 'punishment', loyaltyLevel: 1, hint: 'Permanent; it lowers the pension too, and improved equipment is given up.' },
  { id: 'whip10', label: 'Whipping: 10 lashes (long whip)', kind: 'punishment', wounds: { light: 1 }, loyaltyLevel: 4, hint: 'A Light Wound; a day to recover, then pay is docked.' },
  { id: 'whip30', label: 'Whipping: 30 lashes (long whip)', kind: 'punishment', wounds: { medium: 1 }, loyaltyLevel: 4, hint: 'A Medium Wound; a week to recover, then pay is docked.' },
  { id: 'whip50', label: 'Whipping: 50 lashes (long whip)', kind: 'punishment', wounds: { heavy: 1 }, loyaltyLevel: 4, hint: 'A Heavy Wound; a week to recover, then pay is docked.' },
  { id: 'whip10s', label: 'Whipping: 10 lashes (short whip)', kind: 'punishment', wounds: { light: 2 }, loyaltyLevel: 4, hint: 'The short whip is crueler: two wounds of each kind.' },
  { id: 'whip30s', label: 'Whipping: 30 lashes (short whip)', kind: 'punishment', wounds: { medium: 2 }, loyaltyLevel: 4, hint: 'Two Medium Wounds.' },
  { id: 'whip50s', label: 'Whipping: 50 lashes (short whip)', kind: 'punishment', wounds: { heavy: 2 }, loyaltyLevel: 4, hint: 'Two Heavy Wounds.' },
  { id: 'dismissal', label: 'Dismissal', kind: 'punishment', hint: 'Rarely done: a dismissed grog may carry the covenant’s secrets, and a grudge.' },
];

/**
 * The Loyalty Points a punishment costs (Covenants ch.4): nothing when the turb captain, steward or chamberlain
 * hands it out fairly; ordered by a magus, its level's penalty, but while Prevailing Loyalty is positive only if
 * it was unjust. A dearly loved victim adds their Reputation, a disliked one takes it off.
 */
export function disciplineLoyalty(id: string, byMagus: boolean, unjust: boolean, prevailing: number, reputation = 0): number {
  const d = DISCIPLINE.find((x) => x.id === id);
  if (!d || d.loyaltyLevel === undefined || !byMagus || (prevailing > 0 && !unjust)) return 0;
  return Math.min(0, -[1, 3, 6, 9, 12, 15][d.loyaltyLevel] - reputation);
}

/** Apply a reward or punishment to a grog's sheet: wounds, fatigue, the year's living conditions, and a note in their log. */
export function applyDiscipline(c: Character, id: string, year: number, note?: string): string {
  const d = DISCIPLINE.find((x) => x.id === id);
  if (!d) return '';
  if (d.wounds) {
    c.wounds.light += d.wounds.light ?? 0;
    c.wounds.medium += d.wounds.medium ?? 0;
    c.wounds.heavy += d.wounds.heavy ?? 0;
  }
  if (d.fatigue) c.longTermFatigueLost = (c.longTermFatigueLost ?? 0) + d.fatigue;
  if (d.living) c.rations = { year, living: Math.max(-2, Math.min(1, (c.rations?.year === year ? c.rations.living : 0) + d.living)) };
  if (id === 'dismissal') c.retired = { year, how: 'dismissed' };
  const text = `${d.kind === 'reward' ? 'Rewarded' : 'Punished'}: ${d.label}${note ? ` (${note})` : ''}.`;
  c.notes = [c.notes, `${year}: ${text}`].filter(Boolean).join('\n');
  return text;
}

/** The year's rations on a character's aging roll: +1 improved for a year, −1 or −2 reduced (Grogs). */
export const rationsModifier = (c: Character, year: number) => (c.rations?.year === year ? c.rations.living : 0);

// ------------------------------------------------------------------------------ Retirement

/**
 * Retire a grog (Grogs, Retirement and Pensions): still a member of the covenant for its finances, on lighter
 * duties or none; a pension is usually half to three-quarters of their pay, and passes to a widow.
 */
export function retire(c: Character, year: number): void {
  c.retired = { year, how: 'retired' };
  c.notes = [c.notes, `${year}: Retired from the covenant's service.`].filter(Boolean).join('\n');
}

// ------------------------------------------------------------------------------ Watches for a turb

/** Share grogs between the day and night patrols and their four watches, evenly and at random (Grogs, Watch Patterns). */
export function assignWatches(ids: string[], rng: Rng = defaultRng): Record<string, { patrol: Patrol; watch: number }> {
  const order = [...ids];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const out: Record<string, { patrol: Patrol; watch: number }> = {};
  order.forEach((id, i) => (out[id] = { patrol: i % 2 ? 'night' : 'day', watch: (Math.floor(i / 2) % 4) + 1 }));
  return out;
}

/** How a turb's soldiers stand at any moment: ready, quickly mobilized, asleep (Grogs, Single and Double Duty). */
export const WATCH_SHARES = { single: { ready: 1 / 4, mobile: 3 / 8, asleep: 3 / 8 }, double: { ready: 1 / 2, mobile: 1 / 4, asleep: 1 / 4 } };

// ------------------------------------------------------------------------------ Bargaining and bribes

/** Appraising goods: Perception + Bargain + a simple die against 9, −3 for common goods or a related Craft or Profession, +3 or more for rare ones (Grogs ch.4). */
export function appraiseEase(common: boolean, rare: boolean): number {
  return 9 - (common ? 3 : 0) + (rare ? 3 : 0);
}

/** The lowest price a seller takes: the value less 10% for every 3 points (or part) the buyer's Communication + Bargain roll beats the seller's, never under half. */
export function bargainPrice(value: number, buyer: number, seller: number): { price: number; text: string } {
  const by = buyer - seller;
  if (by <= 0) return { price: value, text: `The seller's ${seller} is not beaten by the buyer's ${buyer}: nothing off the value.` };
  const off = Math.min(50, 10 * Math.ceil(by / 3));
  const price = Math.round(value * (1 - off / 100) * 1000) / 1000;
  return { price, text: `The buyer's ${buyer} beats the seller's ${seller} by ${by}: ${off}% off${off === 50 ? ', the most there is' : ''}.` };
}

/** The buyer's and seller's Communication + Bargain + simple die, and the lowest price the seller takes (the seller's roll is the storyguide's secret). */
export function rollBargain(buyer: number, seller: number, value: number, rng: Rng = defaultRng): { price: number; text: string } {
  const b = simpleDie(rng).value + buyer;
  const s = simpleDie(rng).value + seller;
  return bargainPrice(value, b, s);
}

export function rollAppraise(perBargain: number, ease: number, rng: Rng = defaultRng): { ok: boolean; text: string } {
  const r = simpleDie(rng).value;
  const ok = r + perBargain >= ease;
  return { ok, text: `Perception + Bargain ${perBargain} + ${r} = ${r + perBargain} vs ${ease}: ${ok ? 'they know what it is worth (usually twice its cost to the seller)' : 'they cannot tell what it is worth'}.` };
}

/** Getting a local to talk: Communication + Folk Ken against an average 6 plus their Suspicious trait; a bribe lowers it. Finding a bed: barn 3, byre 6, a shared bed 9 (Grogs ch.4). */
export const LODGING_EASE: { label: string; ease: number }[] = [
  { label: 'A barn', ease: 3 },
  { label: 'The byre', ease: 6 },
  { label: 'A shared bed', ease: 9 },
];

/** A bribe (Grogs ch.4): a day's pay is a Minor equipment bonus (−1 to the Ease Factor), a week's a Major one (−3). A laborer earns about a penny a day, a professional two to five. */
export const BRIBES: { label: string; pennies: (daily: number) => number; ease: number }[] = [
  { label: 'A day’s pay', pennies: (d) => d, ease: 1 },
  { label: 'A week’s pay', pennies: (d) => 7 * d, ease: 3 },
];
