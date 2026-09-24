import { useMemo } from 'react';
import { buildGameData, type GameData } from '../data';
import { deriveCharacter, type DerivedCharacter } from '../engine/character/derive';
import { validateCharacter, type Issue } from '../engine/character/validate';
import { deriveCovenant, type DerivedCovenant } from '../engine/covenant';
import { deriveLab, type DerivedLab } from '../engine/lab';
import type { Character, Covenant, Saga } from '../engine/types';
import type { AuraState } from '../engine/magic';
import { useStore } from './store';

export function useSaga(id?: string): Saga | undefined {
  return useStore((s) => (id ? s.sagas[id] : undefined));
}

export function useGameData(saga?: Saga): GameData {
  const enabled = saga?.enabledBooks;
  const overrides = saga?.mechanicsOverrides;
  const custom = saga?.custom;
  return useMemo(
    () => buildGameData({ enabledBooks: enabled && enabled.length ? enabled : undefined, mechanicsOverrides: overrides, custom }),
    [enabled, overrides, custom],
  );
}

export function useCharacter(id?: string): Character | undefined {
  return useStore((s) => (id ? s.characters[id] : undefined));
}

export function useDerived(c: Character | undefined, saga: Saga | undefined, data: GameData): { d?: DerivedCharacter; issues: Issue[] } {
  return useMemo(() => {
    if (!c || !saga) return { d: undefined, issues: [] };
    const d = deriveCharacter(c, data, saga.houseRules);
    const issues = validateCharacter(d, data, saga.houseRules);
    return { d, issues };
  }, [c, saga, data]);
}

export function useSagaCharacters(sagaId?: string): Character[] {
  const all = useStore((s) => s.characters);
  return useMemo(() => Object.values(all).filter((c) => c.sagaId === sagaId).sort((a, b) => a.name.localeCompare(b.name)), [all, sagaId]);
}

export function useSagaCovenants(sagaId?: string): Covenant[] {
  const all = useStore((s) => s.covenants);
  return useMemo(() => Object.values(all).filter((c) => c.sagaId === sagaId).sort((a, b) => a.name.localeCompare(b.name)), [all, sagaId]);
}

export function useDerivedCovenant(cov: Covenant | undefined, data: GameData): DerivedCovenant | undefined {
  const chars = useStore((s) => s.characters);
  return useMemo(() => (cov ? deriveCovenant(cov, data, Object.values(chars)) : undefined), [cov, data, chars]);
}

/** The covenant a character belongs to, their lab, and the covenant aura. */
export function useCharacterContext(c: Character | undefined, data: GameData): { covenant?: Covenant; lab?: DerivedLab; aura: AuraState } {
  const covenants = useStore((s) => s.covenants);
  return useMemo(() => {
    if (!c) return { aura: { realm: 'Magic', strength: 3 } };
    const cov = (c.covenantId && covenants[c.covenantId]) || Object.values(covenants).find((x) => x.memberIds.includes(c.id));
    if (!cov) return { aura: { realm: 'Magic', strength: 3 } };
    const auraBoons = cov.hooksBoons.filter((h) => h.kind === 'boon' && h.size === 'Minor' && /^aura$/i.test(h.name)).length;
    const labDef = cov.labs.find((l) => l.ownerId === c.id);
    return {
      covenant: cov,
      lab: labDef ? deriveLab(labDef, data) : undefined,
      aura: { realm: cov.auraRealm, strength: cov.aura + auraBoons },
    };
  }, [c, covenants, data]);
}
