// Supernatural effects on characters: spells, powers and rituals that change them for good or for a
// while, with the Warping they bring (DE, Warping; Creo guidelines; RoP: Magic, Grant Virtue and
// Ritual Power).

import { CHAR_NAMES, type Characteristic, type Effect, type GameData, type VFSize } from '../data';
import type { DerivedCharacter } from './character/derive';
import type { ActiveEffect, Character, CharPower, Season } from './types';
import { uid } from '../util/id';

export const SEASONS: Season[] = ['Spring', 'Summer', 'Autumn', 'Winter'];

/** A season as one number, to compare and count seasons. */
export function seasonIndex(year: number, season: Season): number {
  return year * 4 + SEASONS.indexOf(season);
}

export function nextSeason(year: number, season: Season): { year: number; season: Season } {
  const i = SEASONS.indexOf(season);
  return i === 3 ? { year: year + 1, season: 'Spring' } : { year, season: SEASONS[i + 1] };
}

/** When an effect ends: Moon within the season, Year after four seasons; permanent and indefinite ones do not. */
export function effectExpiry(e: Pick<ActiveEffect, 'duration' | 'year' | 'season'>): { year: number; season: Season } | undefined {
  if (e.duration === 'moon') return nextSeason(e.year, e.season);
  if (e.duration === 'year') return { year: e.year + 1, season: e.season };
  return undefined;
}

/**
 * Warping from a powerful effect (DE, Powerful Supernatural Effects): sixth magnitude (level 30) or
 * more gives a Warping Point to anyone it affects, unless they cast it or it was designed for them.
 */
export function powerfulEffectWarping(level: number, selfCast: boolean, designedFor: boolean): number {
  return level >= 30 && !selfCast && !designedFor ? 1 : 0;
}

export interface EffectSpec {
  name: string;
  source?: string;
  duration: ActiveEffect['duration'];
  /** raise these Characteristics by `amount`, to no more than `max` (a permanent effect changes them for good; otherwise a bonus while it lasts) */
  raise?: { chars: Characteristic[]; amount: number; max: number; current?: Partial<Record<Characteristic, number>> };
  bonuses?: Effect[];
  /** give this Virtue */
  virtue?: { defId: string; size: VFSize; param?: string };
  constant?: boolean;
  /** Warping Points each target gains when it begins */
  warping?: number;
  notes?: string;
}

const signedN = (n: number) => `${n >= 0 ? '+' : ''}${n}`;

export const PHYSICAL: Characteristic[] = ['Str', 'Sta', 'Dex', 'Qik'];
export const MENTAL: Characteristic[] = ['Int', 'Per', 'Pre', 'Com'];

/** Put an effect on a character. Returns what changed, line by line. */
export function applyEffect(c: Character, spec: EffectSpec, year: number, season: Season, data: GameData): { effect: ActiveEffect; lines: string[] } {
  const lines: string[] = [];
  const effect: ActiveEffect = { uid: uid(), name: spec.name, source: spec.source, year, season, duration: spec.duration, constant: spec.constant || undefined, notes: spec.notes };
  if (spec.bonuses?.length) effect.bonuses = [...spec.bonuses];
  if (spec.raise) {
    const { chars, amount, max, current } = spec.raise;
    if (spec.duration === 'permanent') {
      const raised: Partial<Record<Characteristic, number>> = {};
      for (const ch of chars) {
        const cur = c.characteristics[ch] ?? 0;
        // the limit is on what the character has now, with Virtues, Qualities and Size
        const now = current?.[ch] ?? cur;
        const delta = Math.max(0, Math.min(amount, max - now));
        if (!delta) {
          lines.push(`${CHAR_NAMES[ch]} is already ${signedN(now)}: no higher than ${signedN(max)}.`);
          continue;
        }
        c.characteristics[ch] = cur + delta;
        c.magicGain = { ...(c.magicGain ?? {}), [ch]: (c.magicGain?.[ch] ?? 0) + delta };
        raised[ch] = delta;
        lines.push(`${CHAR_NAMES[ch]} ${signedN(now)} → ${signedN(now + delta)}.`);
      }
      if (Object.keys(raised).length) effect.raised = raised;
    } else {
      effect.bonuses = [...(effect.bonuses ?? []), ...chars.map((ch) => ({ type: 'charBonus' as const, char: ch, amount, max }))];
      lines.push(`${chars.map((ch) => CHAR_NAMES[ch]).join(', ')} +${amount} (to no more than ${max >= 0 ? '+' : ''}${max}) while it lasts.`);
    }
  }
  if (spec.virtue) {
    const def = data.vfById.get(spec.virtue.defId);
    const already = c.virtues.find((v) => v.defId === spec.virtue!.defId && (v.param ?? '') === (spec.virtue!.param ?? ''));
    if (already && !def?.repeatable) lines.push(`Already has ${def?.name ?? spec.virtue.defId}.`);
    else {
      const vu = uid();
      c.virtues.push({ uid: vu, defId: spec.virtue.defId, size: spec.virtue.size, param: spec.virtue.param, free: true, noPoints: true, freeReason: `Given by ${spec.name}` });
      effect.virtueUid = vu;
      lines.push(`Gains ${def?.name ?? spec.virtue.defId}${spec.virtue.param ? ` (${spec.virtue.param})` : ''} (${spec.virtue.size}${spec.duration === 'permanent' ? ', for good' : ''}).`);
    }
  }
  if (spec.warping) {
    c.warpingPoints += spec.warping;
    effect.warping = spec.warping;
    lines.push(`${spec.warping} Warping Point${spec.warping > 1 ? 's' : ''} from a powerful effect.`);
  }
  c.activeEffects = [...(c.activeEffects ?? []), effect];
  return { effect, lines };
}

/** End an effect: a Virtue it gave goes unless it was permanent; Characteristics raised for good stay. */
export function endEffect(c: Character, effectUid: string): string[] {
  const e = c.activeEffects?.find((x) => x.uid === effectUid);
  if (!e) return [];
  const lines: string[] = [];
  if (e.virtueUid && e.duration !== 'permanent') {
    const v = c.virtues.find((x) => x.uid === e.virtueUid);
    c.virtues = c.virtues.filter((x) => x.uid !== e.virtueUid);
    if (v) lines.push(`${e.name} ends: the Virtue it gave goes.`);
  } else if (e.duration !== 'permanent') lines.push(`${e.name} ends.`);
  c.activeEffects = (c.activeEffects ?? []).filter((x) => x.uid !== effectUid);
  return lines;
}

/** Take back a permanent effect entered by mistake: its Characteristics, Virtue and Warping go. */
export function undoEffect(c: Character, effectUid: string): void {
  const e = c.activeEffects?.find((x) => x.uid === effectUid);
  if (!e) return;
  for (const [ch, n] of Object.entries(e.raised ?? {}) as [Characteristic, number][]) {
    c.characteristics[ch] -= n;
    if (c.magicGain) {
      const left = Math.max(0, (c.magicGain[ch] ?? 0) - n);
      if (left) c.magicGain[ch] = left;
      else delete c.magicGain[ch];
    }
  }
  if (e.virtueUid) c.virtues = c.virtues.filter((x) => x.uid !== e.virtueUid);
  if (e.warping) c.warpingPoints = Math.max(0, c.warpingPoints - e.warping);
  c.activeEffects = (c.activeEffects ?? []).filter((x) => x.uid !== effectUid);
}

/** End the effects whose time has run out by this season. */
export function expireEffects(c: Character, year: number, season: Season): string[] {
  const now = seasonIndex(year, season);
  const lines: string[] = [];
  for (const e of [...(c.activeEffects ?? [])]) {
    const end = effectExpiry(e);
    if (end && seasonIndex(end.year, end.season) <= now) lines.push(...endEffect(c, e.uid));
  }
  return lines;
}

/** Warping Points a year from constant effects: each one working on the character, and a Hermetic Longevity Ritual (DE). */
export function constantWarping(c: Character): { points: number; from: string[] } {
  const from = (c.activeEffects ?? []).filter((e) => e.constant).map((e) => e.name);
  if (c.longevity) from.push('Longevity Ritual');
  for (const it of c.items) if (it.worn && it.bearerBonuses?.length) from.push(it.name);
  return { points: from.length, from };
}

// ------------------------------------------------------------------ powers in play

export interface PowerPayment {
  /** Might Points from the pool */
  pool: number;
  /** a Ritual Power also costs Might Score, or Confidence Points instead, or vis with Vis Mastery (one pawn a Confidence Point) */
  ritual: boolean;
  payWith?: 'might' | 'confidence' | 'vis';
  /** pawns of vis eaten to refill the pool first (5 Might Points a pawn of the Might's Form, 2 of another Art) */
  refill?: { pawns: number; sameForm: boolean };
}

export interface PowerCheck {
  ok: boolean;
  problems: string[];
  /** Might Points the pool has left */
  poolLeft: number;
  /** how many pawns may be used at once: no more than the Might Score on one activity; with Vis Mastery, no more than the Confidence Score in place of Confidence */
  maxVis: number;
}

/** What a power costs a magic character to use right now (RoP: Magic, Magic Might, Ritual Power, Vis Mastery). */
export function checkPowerUse(c: Character, d: DerivedCharacter, mightCost: number, pay: PowerPayment): PowerCheck {
  const problems: string[] = [];
  const score = d.might?.score ?? 0;
  const refillPoints = pay.refill ? pay.refill.pawns * (pay.refill.sameForm ? 5 : 2) : 0;
  const spent = c.creature?.poolSpent ?? 0;
  const poolLeft = Math.min(score, score - spent + refillPoints);
  const visMastery = !!c.creature?.magicCharacter?.qualities.some((q) => q.id === 'vis-mastery');
  const maxVis = score;
  if (pay.refill && pay.refill.pawns > score) problems.push(`No more than its Might Score (${score}) in pawns on one activity.`);
  if (mightCost > poolLeft) problems.push(`The power costs ${mightCost} Might Points; ${poolLeft} are left in the pool.`);
  if (pay.ritual) {
    if (pay.payWith === 'confidence' && c.confidence.points < mightCost) problems.push(`It needs ${mightCost} Confidence Points; ${c.confidence.points} are left.`);
    if (pay.payWith === 'vis') {
      if (!visMastery) problems.push('Only a character with the Vis Mastery Quality can spend vis in place of Confidence Points.');
      else if (mightCost > c.confidence.score) problems.push(`Vis Mastery spends no more pawns at once than the Confidence Score (${c.confidence.score}).`);
    }
  }
  return { ok: problems.length === 0, problems, poolLeft, maxVis };
}

/** Pay for a power: the pool, and for a Ritual Power its Might Score, Confidence or vis. Returns what was paid. */
export function payPower(c: Character, p: CharPower, mightCost: number, pay: PowerPayment): string[] {
  const cr = c.creature;
  if (!cr) return [];
  const lines: string[] = [];
  if (pay.refill?.pawns) {
    const pts = pay.refill.pawns * (pay.refill.sameForm ? 5 : 2);
    cr.poolSpent = Math.max(0, (cr.poolSpent ?? 0) - pts);
    lines.push(`Ate ${pay.refill.pawns} pawn${pay.refill.pawns > 1 ? 's' : ''} of vis: +${pts} Might Points.`);
  }
  cr.poolSpent = (cr.poolSpent ?? 0) + mightCost;
  lines.push(`${p.name}: ${mightCost} Might Point${mightCost === 1 ? '' : 's'} from the pool.`);
  if (pay.ritual) {
    if (pay.payWith === 'confidence') {
      c.confidence.points -= mightCost;
      lines.push(`A Ritual Power: ${mightCost} Confidence Point${mightCost === 1 ? '' : 's'} instead of Might Score.`);
    } else if (pay.payWith === 'vis') lines.push(`A Ritual Power: ${mightCost} pawn${mightCost === 1 ? '' : 's'} of vis in place of Confidence Points (Vis Mastery).`);
    else {
      cr.mightLost = (cr.mightLost ?? 0) + mightCost;
      lines.push(`A Ritual Power: Might Score −${mightCost} (it returns only slowly).`);
    }
  }
  return lines;
}
