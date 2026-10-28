// Where a character stands: its covenant, laboratory and the aura it works in.

import type { GameData } from '../data';
import { deriveLab, type DerivedLab } from './lab';
import type { AuraState } from './magic';
import { auraOf } from './aura';
import type { Character, Covenant } from './types';

export interface CharacterContext {
  covenant?: Covenant;
  lab?: DerivedLab;
  aura: AuraState;
}

/** The covenant's aura as it stands: its Aura Boons, aura Hooks and any change that lasts a while (aura.ts). */
export function covenantAura(cov: Covenant): AuraState {
  const a = auraOf(cov);
  return { realm: a.realm, strength: a.strength };
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
