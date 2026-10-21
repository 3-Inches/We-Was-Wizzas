// Where a character stands: its covenant, laboratory and the aura it works in.

import type { GameData } from '../data';
import { deriveLab, type DerivedLab } from './lab';
import type { AuraState } from './magic';
import type { Character, Covenant } from './types';

export interface CharacterContext {
  covenant?: Covenant;
  lab?: DerivedLab;
  aura: AuraState;
}

/** The covenant aura with its Minor Aura Boons. */
export function covenantAura(cov: Covenant): AuraState {
  const auraBoons = cov.hooksBoons.filter((h) => h.kind === 'boon' && h.size === 'Minor' && /^aura$/i.test(h.name)).length;
  return { realm: cov.auraRealm, strength: cov.aura + auraBoons };
}

export function covenantOf(c: Character, covenants: Covenant[]): Covenant | undefined {
  return (c.covenantId ? covenants.find((x) => x.id === c.covenantId) : undefined) ?? covenants.find((x) => x.memberIds.includes(c.id));
}

export function characterContext(c: Character | undefined, covenants: Covenant[], data: GameData): CharacterContext {
  if (!c) return { aura: { realm: 'Magic', strength: 3 } };
  const cov = covenantOf(c, covenants);
  if (!cov) return { aura: { realm: 'Magic', strength: 3 } };
  const labDef = cov.labs.find((l) => l.ownerId === c.id);
  return { covenant: cov, lab: labDef ? deriveLab(labDef, data) : undefined, aura: covenantAura(cov) };
}
