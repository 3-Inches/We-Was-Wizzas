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
  const pen = d.currentWoundPenalty + d.currentFatiguePenalty;
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
