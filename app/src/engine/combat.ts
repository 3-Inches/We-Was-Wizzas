// Combat totals (DE p.394, Reference Guide).

import type { GameData, WeaponDef } from '../data';
import type { DerivedCharacter } from './character/derive';

export interface CombatLine {
  name: string;
  ability: string;
  abilityScore: number;
  specialty: boolean;
  init: number;
  atk: number | null;
  dfn: number;
  dam: number | null;
  load: number;
  range?: number | null;
  strOk: boolean;
  notes: string[];
}

function abilityTotal(d: DerivedCharacter, abilityName: string): { total: number; specialty?: string } {
  const id = abilityName.toLowerCase().replace(/\s+/g, '-');
  const a = d.abilities.find((x) => x.abilityId === id);
  return { total: a?.total ?? 0, specialty: a?.specialty };
}

export function combatLine(d: DerivedCharacter, w: WeaponDef, shield?: WeaponDef, label?: string): CombatLine {
  const qik = d.characteristics.Qik.value;
  const dex = d.characteristics.Dex.value;
  const str = d.characteristics.Str.value;
  const ab = abilityTotal(d, w.ability);
  const spec = !!ab.specialty && (ab.specialty.toLowerCase().includes(w.name.toLowerCase().split(',')[0]) || w.name.toLowerCase().includes(ab.specialty.toLowerCase()));
  const score = ab.total + (spec ? 1 : 0);
  const pen = d.currentWoundPenalty + d.currentFatiguePenalty + d.currentDiseasePenalty;
  const notes: string[] = [];
  let dfn = qik + score + (w.dfn ?? 0) + pen;
  if (shield) {
    dfn += shield.dfn ?? 0;
    notes.push(`with ${shield.name}`);
  }
  const strOk = w.str === null || str >= w.str;
  if (!strOk) notes.push(`Strength below ${w.str}`);
  const lightning = d.virtues.some((v) => v.cv.defId === 'lightning-reflexes');
  if (lightning) notes.push('Lightning Reflexes: +9 Initiative when reacting to surprise');
  return {
    name: label ?? (shield ? `${w.name} & ${shield.name}` : w.name),
    ability: w.ability,
    abilityScore: score,
    specialty: spec,
    init: qik + (w.init ?? 0) + (shield?.init ?? 0) - d.encumbrance + pen,
    atk: w.atk === null ? null : dex + score + w.atk + pen,
    dfn,
    dam: w.dam === null ? null : str + w.dam,
    load: (w.load ?? 0) + (shield?.load ?? 0),
    range: w.range,
    strOk,
    notes,
  };
}

export function allCombatLines(d: DerivedCharacter, data: GameData): CombatLine[] {
  const lines: CombatLine[] = [];
  for (const id of ['dodge', 'fist', 'kick']) {
    const w = data.weaponById.get(id);
    if (w) lines.push(combatLine(d, w));
  }
  for (const lo of d.char.equipment.weapons) {
    const w = data.weaponById.get(lo.weaponId);
    if (!w) continue;
    const s = lo.shieldId ? data.weaponById.get(lo.shieldId) : undefined;
    lines.push(combatLine(d, w, s, lo.name));
  }
  return lines;
}

/** Wound level from (damage total − soak). */
export function woundFromDamage(d: DerivedCharacter, excess: number): 'none' | 'light' | 'medium' | 'heavy' | 'incapacitating' | 'dead' {
  if (excess <= 0) return 'none';
  const r = d.woundRanges;
  if (excess <= r.light[1]) return 'light';
  if (excess <= r.medium[1]) return 'medium';
  if (excess <= r.heavy[1]) return 'heavy';
  if (excess <= r.incap[1]) return 'incapacitating';
  return 'dead';
}

export const RECOVERY = {
  light: { interval: 'One week', stable: 4, improve: 10 },
  medium: { interval: 'One month', stable: 6, improve: 12 },
  heavy: { interval: 'One season', stable: 9, improve: 15 },
} as const;

export interface GroupMember {
  name: string;
  line: CombatLine;
  leadership: number;
}

export interface GroupResult {
  /** trained in name and small enough for the leader to coordinate */
  trained: boolean;
  /** the others' Combat Abilities, capped at 3 × the leader's Leadership (trained groups) */
  bonus: number;
  cap: number;
  /** Combat Totals more than five points apart when the group forms */
  outOfRange: string[];
  notes: string[];
}

/**
 * A group fights with its vanguard's statistics (DE, Groups). A trained group led by someone whose
 * Leadership covers its size adds the other members' Combat Abilities, up to three times that
 * Leadership, to Attack or to Defense; a group has at most six members.
 */
export function groupCombat(members: GroupMember[], vanguard: number, leader: number, trainedTogether: boolean): GroupResult {
  const notes: string[] = [];
  const lead = members[leader]?.leadership ?? 0;
  if (members.length > 6) notes.push('A group has at most six members.');
  let trained = trainedTogether;
  if (trained && members.length > lead) {
    trained = false;
    notes.push(`The leader's Leadership ${lead} coordinates at most ${lead}; the group fights untrained.`);
  }
  const cap = 3 * lead;
  const others = members.filter((_, i) => i !== vanguard).reduce((s, m) => s + m.line.abilityScore, 0);
  const bonus = trained ? Math.min(others, cap) : 0;
  if (trained && others > cap) notes.push(`The bonus is held to three times the leader's Leadership (${cap}).`);
  const outOfRange: string[] = [];
  const spread = (label: string, xs: (number | null)[]) => {
    const v = xs.filter((x): x is number => x !== null);
    if (v.length > 1 && Math.max(...v) - Math.min(...v) > 5) outOfRange.push(`${label} ${Math.min(...v)}–${Math.max(...v)}`);
  };
  spread('Initiative', members.map((m) => m.line.init));
  spread('Attack', members.map((m) => m.line.atk));
  spread('Defense', members.map((m) => m.line.dfn));
  return { trained, bonus, cap, outOfRange, notes };
}

/** A group's blows spread as evenly as can be, the vanguard (first) taking at least as many as anyone. */
export function distributeBlows(blows: number, members: number): number[] {
  const n = Math.max(1, members);
  const base = Math.floor(blows / n);
  const extra = blows % n;
  return Array.from({ length: n }, (_, i) => base + (i < extra ? 1 : 0));
}

/** Scuffling (DE, Non-Lethal Combat): the wound a blow would have done becomes Fatigue. */
export const SCUFFLE_EFFECTS: Record<'light' | 'medium' | 'heavy' | 'incapacitating' | 'dead', string> = {
  light: '1 Fatigue level',
  medium: '2 Fatigue levels',
  heavy: '2 Fatigue levels and a Light Wound',
  incapacitating: '3 Fatigue levels and a Light Wound',
  dead: '5 Fatigue levels and a Medium Wound',
};
