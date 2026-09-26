import { useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useStore } from '../../store/store';
import { useCharacter, useCharacterContext, useDerived, useGameData, useSaga } from '../../store/hooks';
import type { Character } from '../../engine/types';
import { deriveCharacter } from '../../engine/character/derive';
import { describeRebalance, rebalanceAffinityXp } from '../../engine/character/rebalance';

export function useCharEditor() {
  const { sagaId, charId } = useParams();
  const saga = useSaga(sagaId);
  const data = useGameData(saga);
  const c = useCharacter(charId);
  const { d, issues } = useDerived(c, saga, data);
  const ctx = useCharacterContext(c, data);
  const updateCharacter = useStore((s) => s.updateCharacter);
  const setNotice = useStore((s) => s.setNotice);
  const rules = saga?.houseRules;
  const update = useCallback(
    (fn: (c: Character) => void) =>
      charId &&
      updateCharacter(charId, (x) => {
        if (!rules) return fn(x);
        // An Affinity added or removed after xp was spent must not change the scores bought with it
        const before = deriveCharacter(x, data, rules);
        fn(x);
        const moved = rebalanceAffinityXp(x, before, data, rules);
        if (moved.length) setNotice(describeRebalance(moved, before));
      }),
    [charId, updateCharacter, data, rules, setNotice],
  );
  const acknowledge = useCallback((id: string) => update((x) => void x.acknowledgedIssues.push(id)), [update]);
  return { saga, data, c, d, issues, update, acknowledge, ctx };
}

export type CharEditor = ReturnType<typeof useCharEditor>;
