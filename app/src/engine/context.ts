// Where a character stands: its covenant, laboratory and the aura it works in.

import type { GameData } from '../data';
import { deriveLab, type DerivedLab } from './lab';
import { auraModifier, type AuraState } from './magic';
import { auraOf } from './aura';
import type { Character, Covenant, Season } from './types';

export interface CharacterContext {
  covenant?: Covenant;
  lab?: DerivedLab;
  aura: AuraState;
}

/** The covenant's aura as it stands: its Aura Boons, aura Hooks, any change that lasts a while, and its alignment (aura.ts). */
export function covenantAura(cov: Covenant): AuraState {
  const a = auraOf(cov);
  return { realm: a.realm, strength: a.strength, ...(a.aligned ? { aligned: a.aligned } : {}), ...(a.aspect ? { aspect: a.aspect } : {}) };
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

/**
 * A better aura than the covenant's for a season of laboratory work, where the covenant has one to
 * share (the magestones of Verditius at Oculus Septentrionalis): so many magi a season, so many
 * seasons a year each, and only where it is better than the aura around it. With take, the season
 * is counted against the magus and the stone is theirs for the season.
 */
export function labAuraFor(c: Character, cov: Covenant | undefined, ctx: CharacterContext, year: number, season: Season, opts: { take?: boolean; faerieMagic?: boolean } = {}): CharacterContext | undefined {
  const src = cov?.labAura;
  if (!src) return undefined;
  const mine = c.labAuraUse?.year === year ? c.labAuraUse.seasons : 0;
  const now = src.inUse?.year === year && src.inUse.season === season ? src.inUse.ids : [];
  // already theirs this season: the same stone again
  if (now.includes(c.id)) return { ...ctx, aura: { realm: src.realm, strength: src.strength } };
  if (mine >= src.seasonsEach || now.length >= src.count) return undefined;
  const better: AuraState = { realm: src.realm, strength: src.strength };
  if (auraModifier('Magic', better, opts).mod <= auraModifier('Magic', ctx.aura, opts).mod) return undefined;
  if (opts.take) {
    c.labAuraUse = { year, seasons: mine + 1 };
    src.inUse = { year, season, ids: [...now, c.id] };
  }
  return { ...ctx, aura: better };
}
