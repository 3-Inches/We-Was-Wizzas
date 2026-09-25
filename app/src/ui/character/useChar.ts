import { useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useStore } from '../../store/store';
import { useCharacter, useCharacterContext, useDerived, useGameData, useSaga } from '../../store/hooks';
import type { Character } from '../../engine/types';

export function useCharEditor() {
  const { sagaId, charId } = useParams();
  const saga = useSaga(sagaId);
  const data = useGameData(saga);
  const c = useCharacter(charId);
  const { d, issues } = useDerived(c, saga, data);
  const ctx = useCharacterContext(c, data);
  const updateCharacter = useStore((s) => s.updateCharacter);
  const update = useCallback((fn: (c: Character) => void) => charId && updateCharacter(charId, fn), [charId, updateCharacter]);
  const acknowledge = useCallback((id: string) => update((x) => void x.acknowledgedIssues.push(id)), [update]);
  return { saga, data, c, d, issues, update, acknowledge, ctx };
}

export type CharEditor = ReturnType<typeof useCharEditor>;
