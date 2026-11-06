// Getting better as time passes at the table (DE, Recovering From Wounds; Fatigue; Art & Academe,
// diseases). The wounds of each level roll together at its interval, each wound keeping its own +3s
// from stable rolls; an Incapacitated character rolls at sunrise and sunset; Fatigue comes back a level
// at a time with rest, and Long-Term Fatigue a level a night; a disease rolls at the end of its
// interval. Time is counted in minutes, so the table can pass to the next recovery for everyone at once.

import { auraRecovery } from './aura';
import type { DerivedCharacter } from './character/derive';
import { RECOVERY } from './combat';
import { defaultRng, describeStress, stressDie, type Rng } from './dice';
import { recoveryRoll as diseaseRoll } from './disease';
import type { AuraState } from './magic';
import { specAbilities, specChar } from './covenantRules';
import type { Character, Covenant, Illness } from './types';

export const HOUR = 60;
export const DAY = 24 * HOUR;
export const WEEK = 7 * DAY;
export const MONTH = 30 * DAY;
export const SEASON = 91 * DAY;

export type WoundLevel = 'light' | 'medium' | 'heavy';
export const WOUND_LEVELS: WoundLevel[] = ['light', 'medium', 'heavy'];
const INTERVAL: Record<WoundLevel | 'incapacitating', number> = { light: WEEK, medium: MONTH, heavy: SEASON, incapacitating: 12 * HOUR };
const ILLNESS_INTERVAL: Record<Illness['interval'], number> = { Day: DAY, Week: WEEK, Month: MONTH, Season: SEASON, Lifelong: Infinity };
const WORSE: Record<WoundLevel, 'medium' | 'heavy' | 'incapacitating'> = { light: 'medium', medium: 'heavy', heavy: 'incapacitating' };
const BETTER: Record<WoundLevel, 'light' | 'medium' | undefined> = { light: undefined, medium: 'light', heavy: 'medium' };

/** Minutes of quiet rest to come back one Fatigue level from where the character is (DE, Fatigue Recovery Chart). */
export function fatigueStep(levelsLost: number): number {
  return [0, 2, 10, 30, 60, 120][Math.min(5, levelsLost)] ?? 120;
}

export function spanText(min: number): string {
  if (!Number.isFinite(min)) return 'never';
  if (min < HOUR) return `${min} minute${min === 1 ? '' : 's'}`;
  if (min < DAY) return `${Math.round(min / HOUR)} hour${Math.round(min / HOUR) === 1 ? '' : 's'}`;
  if (min < WEEK) return `${Math.round(min / DAY)} day${Math.round(min / DAY) === 1 ? '' : 's'}`;
  if (min < MONTH) return `${Math.round(min / WEEK)} week${Math.round(min / WEEK) === 1 ? '' : 's'}`;
  if (min < SEASON) return `${Math.round(min / MONTH)} month${Math.round(min / MONTH) === 1 ? '' : 's'}`;
  return `${Math.round(min / SEASON)} season${Math.round(min / SEASON) === 1 ? '' : 's'}`;
}

export interface Ailment {
  kind: WoundLevel | 'incapacitating' | 'fatigue' | 'rest' | 'illness';
  label: string;
  /** minutes until its next roll (or the next Fatigue level back) */
  next: number;
  illUid?: string;
}

/** What ails a character, each with the time to its next roll: the soonest first. */
export function ailmentsOf(c: Character): Ailment[] {
  if (c.wounds.dead) return [];
  const r = c.recovery ?? {};
  const out: Ailment[] = [];
  const st = c.fatigueLost;
  const lt = c.longTermFatigueLost;
  if (st > 0) out.push({ kind: 'fatigue', label: `Fatigue (${st} level${st > 1 ? 's' : ''})`, next: Math.max(0, fatigueStep(st + lt) - (r.fatigue ?? 0)) });
  else if (lt > 0) out.push({ kind: 'rest', label: `Long-Term Fatigue (${lt} level${lt > 1 ? 's' : ''}): a night’s rest each`, next: Math.max(0, DAY - (r.fatigue ?? 0)) });
  if (c.wounds.incapacitating > 0) out.push({ kind: 'incapacitating', label: `Incapacitated${c.wounds.incapacitating > 1 ? ` (${c.wounds.incapacitating} wounds)` : ''}: rolls at sunrise and sunset`, next: Math.max(0, INTERVAL.incapacitating - (r.since?.incapacitating ?? 0)) });
  for (const k of WOUND_LEVELS) {
    const n = c.wounds[k];
    if (!n) continue;
    const bonus = (r.stable?.[k] ?? []).filter(Boolean);
    out.push({
      kind: k,
      label: `${n} ${k[0].toUpperCase()}${k.slice(1)} Wound${n > 1 ? 's' : ''}${bonus.length ? ` (stable: ${bonus.map((b) => `+${b}`).join(', ')})` : ''}`,
      next: Math.max(0, INTERVAL[k] - (r.since?.[k] ?? 0)),
    });
  }
  for (const ill of c.illnesses ?? []) {
    const every = ill.stage === 'Critical' ? 12 * HOUR : ILLNESS_INTERVAL[ill.interval];
    out.push({ kind: 'illness', illUid: ill.uid, label: `${ill.name} (${ill.stage}${ill.interval === 'Lifelong' ? ', lifelong' : ''})`, next: Math.max(0, every - (r.illness?.[ill.uid] ?? 0)) });
  }
  return out.sort((a, b) => a.next - b.next);
}

/** The soonest recovery among them all, in minutes. */
export function nextRecovery(chars: Character[]): number | undefined {
  const all = chars.flatMap((c) => ailmentsOf(c).map((a) => a.next)).filter(Number.isFinite);
  return all.length ? Math.max(1, Math.min(...all)) : undefined;
}

/** What helps a patient's Recovery rolls. */
export interface Care {
  /** the medic's Chirurgy, added to wound rolls (DE: an attending medic's Ability; no roll for the medic) */
  chirurgy?: number;
  /** the physician's Medicine, added to a disease's roll when their Prognosis Total beats its Severity */
  medicine?: number;
  /** magical aid (Purification of the Festering Wounds and the like) */
  aid?: number;
  /** a familiar's bronze cord */
  bronze?: number;
  /** the Health of the patient's laboratory */
  labHealth?: number;
  /** the aura the patient lies in */
  aura?: AuraState;
}

function careParts(d: DerivedCharacter, care: Care) {
  const aura = auraRecovery(care.aura).parts[0];
  return [
    { label: 'Stamina', value: d.characteristics.Sta.value },
    { label: 'Chirurgy', value: care.chirurgy ?? 0 },
    { label: 'magical aid', value: care.aid ?? 0 },
    { label: 'bronze cord', value: care.bronze ?? 0 },
    { label: 'lab Health', value: care.labHealth ?? 0 },
    ...(aura ? [aura] : []),
    // a disease hinders the healing of wounds (Art & Academe: "and vice versa")
    { label: 'disease', value: d.currentDiseasePenalty },
  ].filter((p) => p.value !== 0);
}

const partsText = (parts: { label: string; value: number }[]) => parts.map((p) => `${p.label} ${p.value > 0 && p !== parts[0] ? '+' : ''}${p.value}`).join(', ');

/** One wound's Recovery roll: it improves a level, holds (+3 to its later rolls), or worsens. Changes the character. */
export function rollWound(c: Character, d: DerivedCharacter, level: WoundLevel, index: number, care: Care, rng: Rng = defaultRng): string {
  const rec = RECOVERY[level];
  const r = c.recovery ?? (c.recovery = {});
  const stable = (r.stable ??= {});
  const bonuses = stable[level] ?? [];
  const bonus = bonuses[index] ?? 0;
  const parts = [...careParts(d, care), ...(bonus ? [{ label: 'stable', value: bonus }] : [])];
  const die = stressDie(1, rng);
  const total = die.botches ? 0 : parts.reduce((t, p) => t + p.value, 0) + die.value;
  const head = `${level[0].toUpperCase()}${level.slice(1)} Wound: ${partsText(parts)} + ${describeStress(die)} = ${die.botches ? 'botch, 0' : total} against ${rec.stable}/${rec.improve}`;
  // take this wound off its level, with its bonus
  const take = () => {
    c.wounds[level] -= 1;
    stable[level] = bonuses.filter((_, i) => i !== index);
  };
  if (total >= rec.improve) {
    take();
    const to = BETTER[level];
    if (to) {
      c.wounds[to] += 1;
      if (c.wounds[to] === 1) (r.since ??= {})[to] = 0;
    }
    return `${head}: ${to ? `better, now a ${to[0].toUpperCase()}${to.slice(1)} Wound` : 'healed'}.`;
  }
  if (total >= rec.stable) {
    const next = [...bonuses];
    next[index] = bonus + 3;
    stable[level] = next;
    return `${head}: stable, +3 to its later rolls (now +${bonus + 3}).`;
  }
  take();
  const to = WORSE[level];
  c.wounds[to] += 1;
  if (c.wounds[to] === 1) (r.since ??= {})[to] = 0;
  return `${head}: it worsens, infected: now ${to === 'incapacitating' ? 'Incapacitated' : `a ${to[0].toUpperCase()}${to.slice(1)} Wound`}.`;
}

/** An Incapacitated character's roll, at sunrise or sunset: 0 or less dies, 9+ makes every Incapacitating Wound Heavy, anything else a cumulative −1. */
export function rollIncapacitated(c: Character, d: DerivedCharacter, care: Care, rng: Rng = defaultRng): string {
  const r = c.recovery ?? (c.recovery = {});
  const worse = r.incapacitated ?? 0;
  const parts = [...careParts(d, care), ...(worse ? [{ label: 'worsening', value: worse }] : [])];
  const die = stressDie(1, rng);
  const total = die.botches ? 0 : parts.reduce((t, p) => t + p.value, 0) + die.value;
  const head = `Incapacitated: ${partsText(parts)} + ${describeStress(die)} = ${die.botches ? 'botch, 0' : total}`;
  if (total <= 0) {
    c.wounds.dead = true;
    return `${head}: ${c.name || 'the character'} dies.`;
  }
  if (total >= 9) {
    c.wounds.heavy += c.wounds.incapacitating;
    c.wounds.incapacitating = 0;
    delete r.incapacitated;
    delete r.since?.incapacitating;
    if (r.since && r.since.heavy === undefined) r.since.heavy = 0;
    return `${head}: the Incapacitating Wounds become Heavy, and recovery goes on as usual.`;
  }
  r.incapacitated = worse - 1;
  return `${head}: a little worse (−1 to later rolls, now ${worse - 1}).`;
}

/**
 * Pass so many minutes for one character, rolling each recovery as it comes due and bringing back
 * Fatigue with rest. The care is what each roll gets; diseases get their physician's Medicine when
 * medicineFor says so. Changes the character; returns what happened, in order.
 */
export function passTime(c: Character, derive: (c: Character) => DerivedCharacter, minutes: number, care: Care, medicineFor: (ill: Illness) => number = () => 0, rng: Rng = defaultRng): string[] {
  const lines: string[] = [];
  let left = minutes;
  for (let guard = 0; guard < 5000 && left > 0 && !c.wounds.dead; guard++) {
    const due = ailmentsOf(c).filter((a) => Number.isFinite(a.next));
    const step = due.length ? Math.min(...due.map((a) => a.next)) : Infinity;
    const take = Math.min(left, step);
    advance(c, take);
    left -= take;
    if (take < step) break;
    // everything due now; a wound that changed level in this moment rolls at its new level's next interval
    const counts = { ...c.wounds };
    for (const a of due.filter((x) => x.next === step)) {
      const r = c.recovery ?? (c.recovery = {});
      const d = derive(c);
      if (a.kind === 'fatigue') {
        c.fatigueLost -= 1;
        r.fatigue = 0;
        lines.push(`Rested: one Fatigue level back (${c.fatigueLost + c.longTermFatigueLost ? `${c.fatigueLost + c.longTermFatigueLost} lost still` : 'Fresh'}).`);
      } else if (a.kind === 'rest') {
        c.longTermFatigueLost -= 1;
        r.fatigue = 0;
        lines.push(`A night’s rest: one Long-Term Fatigue level back.`);
      } else if (a.kind === 'incapacitating') {
        (r.since ??= {}).incapacitating = 0;
        lines.push(rollIncapacitated(c, d, care, rng));
      } else if (a.kind === 'illness') {
        const ill = c.illnesses?.find((x) => x.uid === a.illUid);
        if (!ill) continue;
        (r.illness ??= {})[ill.uid] = 0;
        const res = diseaseRoll(c, d, ill.uid, { medicine: medicineFor(ill), other: care.aid, aura: care.aura }, rng);
        if (res.outcome === 'dead') c.wounds.dead = true;
        if (res.outcome === 'cured') delete r.illness[ill.uid];
        lines.push(`${ill.name}: ${res.text}`);
      } else {
        const level = a.kind;
        (r.since ??= {})[level] = 0;
        // every wound of the level rolls; the last first, so the indexes of the others hold
        for (let i = Math.min(counts[level], c.wounds[level]) - 1; i >= 0; i--) lines.push(rollWound(c, derive(c), level, i, care, rng));
      }
      if (c.wounds.dead) break;
    }
    tidy(c);
  }
  tidy(c);
  return lines;
}

function advance(c: Character, minutes: number) {
  if (!minutes) return;
  const r = c.recovery ?? (c.recovery = {});
  if (c.fatigueLost + c.longTermFatigueLost > 0) r.fatigue = (r.fatigue ?? 0) + minutes;
  for (const k of [...WOUND_LEVELS, 'incapacitating'] as const) if (c.wounds[k] > 0) (r.since ??= {})[k] = (r.since?.[k] ?? 0) + minutes;
  for (const ill of c.illnesses ?? []) (r.illness ??= {})[ill.uid] = (r.illness?.[ill.uid] ?? 0) + minutes;
}

/** Drop what no longer applies: the clocks and bonuses of healed levels. */
function tidy(c: Character) {
  const r = c.recovery;
  if (!r) return;
  for (const k of [...WOUND_LEVELS, 'incapacitating'] as const) if (!c.wounds[k] && r.since) delete r.since[k];
  for (const k of WOUND_LEVELS) {
    if (!r.stable) break;
    const list = (r.stable[k] ?? []).slice(0, c.wounds[k]);
    if (!list.some(Boolean)) delete r.stable[k];
    else r.stable[k] = list;
  }
  if (!c.wounds.incapacitating) delete r.incapacitated;
  if (!(c.fatigueLost + c.longTermFatigueLost)) delete r.fatigue;
  if (r.illness) for (const uid of Object.keys(r.illness)) if (!c.illnesses?.some((i) => i.uid === uid)) delete r.illness[uid];
  if (r.since && !Object.keys(r.since).length) delete r.since;
  if (r.stable && !Object.keys(r.stable).length) delete r.stable;
  if (r.illness && !Object.keys(r.illness).length) delete r.illness;
  if (!Object.keys(r).length) delete c.recovery;
}

/**
 * How many a medic can tend (Art & Academe, Palliative Care and Therapy): as many patients as their
 * Chirurgy (or Medicine, for diseases) without giving up their season, five times that if they give the
 * season to it.
 */
export function medicCapacity(score: number, wholeSeason: boolean): number {
  return Math.max(0, score) * (wholeSeason ? 5 : 1);
}

/** How near the edge a character is: Fatigue levels before Unconscious, and what an Incapacitating Wound means. */
export function condition(c: Character, d: DerivedCharacter): { fatigue: string; penalty: number; danger?: string } {
  const lost = Math.min(5, c.fatigueLost + c.longTermFatigueLost);
  const level = d.fatigueLevels[lost];
  const toOut = 5 - lost;
  const fatigue = lost >= 5 ? 'Unconscious' : `${level?.name ?? 'Fresh'}${toOut <= 2 ? `, ${toOut} level${toOut > 1 ? 's' : ''} from Unconscious` : ''}`;
  const danger = c.wounds.dead
    ? 'dead'
    : c.wounds.incapacitating
      ? `Incapacitated: two rolls a day, and 0 or less dies${c.recovery?.incapacitated ? ` (now ${c.recovery.incapacitated})` : ''}`
      : c.wounds.heavy
        ? 'a Heavy Wound that worsens leaves them Incapacitated'
        : (c.illnesses ?? []).some((i) => i.stage === 'Critical')
          ? 'a disease in crisis: two rolls a day, and 0 or less dies'
          : undefined;
  return { fatigue, penalty: d.currentWoundPenalty + d.currentFatiguePenalty + d.currentDiseasePenalty, danger };
}

export interface Medic {
  key: string;
  name: string;
  /** a character of the saga, or one of the covenant's specialists */
  charId?: string;
  chirurgy: number;
  medicine: number;
  int: number;
}

/** Who can tend the wounded and the sick at a covenant: its members and specialists with Chirurgy or Medicine, the best first. */
export function medicsOf(covs: Covenant[], chars: Character[], derive: (c: Character) => DerivedCharacter): Medic[] {
  const score = (list: { id: string; score: number; label?: string }[], id: string) => Math.max(0, ...list.filter((a) => a.id === id || new RegExp(id, 'i').test(a.label ?? '')).map((a) => a.score));
  const out: Medic[] = [];
  for (const cov of covs)
    for (const sp of cov.specialists) {
      const ab = specAbilities(sp);
      const m = { key: `spec:${cov.id}:${sp.uid}`, name: `${sp.name || 'The physician'} (${cov.name})`, chirurgy: score(ab, 'chirurgy'), medicine: score(ab, 'medicine'), int: specChar(sp, 'Int') };
      if (m.chirurgy || m.medicine) out.push(m);
    }
  for (const c of chars) {
    if (!c.creation.finalized || c.wounds.dead) continue;
    if (!c.abilities.some((a) => a.abilityId === 'chirurgy' || a.abilityId === 'medicine')) continue;
    const d = derive(c);
    const best = (id: string) => Math.max(0, ...d.abilities.filter((a) => a.abilityId === id).map((a) => a.total));
    out.push({ key: c.id, charId: c.id, name: c.name || 'Unnamed', chirurgy: best('chirurgy'), medicine: best('medicine'), int: d.characteristics.Int.value });
  }
  return out.filter((m) => m.chirurgy || m.medicine).sort((a, b) => b.chirurgy + b.medicine - (a.chirurgy + a.medicine));
}
